import { BadRequestException } from '@nestjs/common';
import {
  calculateActivePaymentAllocationTotal,
  calculateBalanceDue,
  summarizeOrder,
  validateAllocationRequest,
  validateCancellationSettlement,
  validateDeliveryAgreement,
  validatePaymentCanBeVoided,
  validateRefundAgainstSettlement,
  validateStageMove,
} from './order.service.js';
import type { GarmentStage } from './order.dto.js';

function garment(
  stage: GarmentStage | 'cancelled',
  options: {
    blocked?: boolean;
    price?: string | null;
    dueDate?: Date | null;
  } = {},
) {
  return {
    stage,
    blockedAt: options.blocked ? new Date('2026-10-27T10:00:00Z') : null,
    agreedPrice: options.price ?? null,
    dueDate: options.dueDate ?? null,
  };
}

describe('garment stage progression', () => {
  it('allows only the next required forward stage', () => {
    expect(() =>
      validateStageMove('request_confirmed', 'measurements_recorded', null),
    ).not.toThrow();

    expect(() =>
      validateStageMove('request_confirmed', 'ready_to_cut', null),
    ).toThrow('Complete the required garment stage');
  });

  it('requires an explicit reason for moving work backward', () => {
    expect(() => validateStageMove('sewing', 'cutting', undefined)).toThrow(
      'Moving a garment backward requires a rework reason.',
    );

    expect(() =>
      validateStageMove('sewing', 'cutting', 'Customer requested a redesign'),
    ).not.toThrow();
  });

  it('keeps fitting and alterations as a repeatable customer approval loop', () => {
    expect(() =>
      validateStageMove('customer_fitting', 'alterations', null),
    ).not.toThrow();
    expect(() =>
      validateStageMove('alterations', 'customer_fitting', null),
    ).not.toThrow();
    expect(() =>
      validateStageMove('alterations', 'dry_cleaning', null),
    ).toThrow('Alterations must return to customer fitting');
    expect(() =>
      validateStageMove('customer_fitting', 'dry_cleaning', null),
    ).toThrow('Record the fitting result');
  });

  it('allows recording progress while repeating the current stage', () => {
    expect(() => validateStageMove('sewing', 'sewing', null)).not.toThrow();
  });
});

describe('summarizeOrder', () => {
  it('reports mixed garment stages and sums prices exactly in minor units', () => {
    const summary = summarizeOrder([
      garment('sewing', {
        price: '10.10',
        dueDate: new Date('2026-11-01T00:00:00Z'),
      }),
      garment('customer_fitting', {
        blocked: true,
        price: '20.25',
        dueDate: new Date('2026-10-30T00:00:00Z'),
      }),
      garment('cancelled', { price: '3.50' }),
    ]);

    expect(summary).toEqual({
      status: 'active',
      garmentCount: 3,
      activeCount: 2,
      blockedCount: 1,
      deliveredCount: 0,
      cancelledCount: 1,
      stageCounts: {
        sewing: 1,
        customer_fitting: 1,
        cancelled: 1,
      },
      totalAgreedPrice: '33.85',
      dueDate: new Date('2026-10-30T00:00:00Z'),
    });
  });

  it('derives blocked, partial delivery, completed, and cancelled summaries', () => {
    expect(
      summarizeOrder([
        garment('sewing', { blocked: true }),
        garment('customer_fitting', { blocked: true }),
      ]).status,
    ).toBe('blocked');
    expect(
      summarizeOrder([
        garment('delivered'),
        garment('sewing'),
        garment('cancelled'),
      ]).status,
    ).toBe('partially_delivered');
    expect(
      summarizeOrder([garment('delivered'), garment('cancelled')]).status,
    ).toBe('completed');
    expect(
      summarizeOrder([garment('cancelled'), garment('cancelled')]).status,
    ).toBe('cancelled');
  });
});

describe('stage validation failures', () => {
  it('rejects invalid backward targets with no recorded reason', () => {
    expect(() => validateStageMove('packaging', 'sewing', '   ')).toThrow(
      BadRequestException,
    );
  });
});

describe('payment allocation validation', () => {
  it('excludes reversed allocations from active payment totals', () => {
    expect(
      calculateActivePaymentAllocationTotal([
        { amount: '25.50', reversed: false },
        { amount: '10.25', reversed: true },
      ]),
    ).toBe(2550n);
  });

  it('requires every allocation to be reversed before voiding a payment', () => {
    expect(() =>
      validatePaymentCanBeVoided([
        { reversalId: 'reversal-1' },
        { reversalId: null },
      ]),
    ).toThrow('Reverse every payment allocation before voiding the payment.');
    expect(() =>
      validatePaymentCanBeVoided([{ reversalId: 'reversal-1' }]),
    ).not.toThrow();
    expect(() => validatePaymentCanBeVoided([])).not.toThrow();
  });

  it('uses exact minor units and prevents allocating more than received', () => {
    expect(
      validateAllocationRequest(
        [
          { garmentId: 'garment-1', amount: '10.10' },
          { garmentId: 'garment-2', amount: '2.25' },
        ],
        1235n,
        'Payment allocations cannot exceed the payment received.',
      ),
    ).toBe(1235n);

    expect(() =>
      validateAllocationRequest(
        [
          { garmentId: 'garment-1', amount: '10.10' },
          { garmentId: 'garment-2', amount: '2.26' },
        ],
        1235n,
        'Payment allocations cannot exceed the payment received.',
      ),
    ).toThrow('Payment allocations cannot exceed the payment received.');
  });

  it('rejects duplicate garment entries and zero allocations', () => {
    expect(() =>
      validateAllocationRequest(
        [
          { garmentId: 'garment-1', amount: '1.00' },
          { garmentId: 'garment-1', amount: '1.00' },
        ],
        1000n,
        'Payment allocations cannot exceed the payment received.',
      ),
    ).toThrow('A garment can only appear once');

    expect(() =>
      validateAllocationRequest(
        [{ garmentId: 'garment-1', amount: '0.00' }],
        1000n,
        'Payment allocations cannot exceed the payment received.',
      ),
    ).toThrow('Payment allocations must be greater than zero.');
  });
});

describe('delivery balance agreement', () => {
  it('calculates the outstanding amount using exact minor units', () => {
    expect(calculateBalanceDue('120.25', 10025n)).toBe(2000n);
    expect(calculateBalanceDue('120.25', 15000n)).toBe(0n);
    expect(calculateBalanceDue(null, 0n)).toBeNull();
  });

  it('requires recorded agreement terms when a balance remains', () => {
    expect(() => validateDeliveryAgreement(2500n, null)).toThrow(
      'Record the customer agreement before delivering with a balance due.',
    );
    expect(() =>
      validateDeliveryAgreement(2500n, 'Pay next month'),
    ).not.toThrow();
    expect(() => validateDeliveryAgreement(0n, null)).not.toThrow();
  });
});

describe('cancellation financial settlement', () => {
  it('bounds the agreed refund and retained amount by allocated payments', () => {
    expect(() =>
      validateCancellationSettlement(5000n, 2500n, 10000n),
    ).not.toThrow();
    expect(() => validateCancellationSettlement(7500n, 3000n, 10000n)).toThrow(
      'Refund and retained amounts cannot exceed payments allocated to this garment.',
    );
    expect(() => validateCancellationSettlement(-1n, 0n, 10000n)).toThrow(
      'Refund and retained amounts cannot be negative.',
    );
  });

  it('limits actual refunds to the amount promised in the settlement', () => {
    expect(() =>
      validateRefundAgainstSettlement(2500n, 2500n, 5000n),
    ).not.toThrow();
    expect(() => validateRefundAgainstSettlement(4000n, 1001n, 5000n)).toThrow(
      'Actual refunds cannot exceed the amount agreed in the cancellation settlement.',
    );
  });
});
