import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CreateOrderDto,
  AdjustGarmentPriceDto,
  CancellationSettlementDto,
  ConfirmGarmentPriceDto,
  FinancialCorrectionDto,
  RecordCancellationRefundDto,
  RecordDeliveryDto,
  RecordPaymentDto,
  RecordProgressDto,
} from './order.dto.js';

describe('order request validation', () => {
  it('accepts an order with multiple independently described garments', () => {
    const input = plainToInstance(CreateOrderDto, {
      customerId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      garments: [
        {
          description: 'Evening dress',
          materialSource: 'customer',
          agreedPrice: '120000.50',
          dueDate: '2026-11-01',
        },
        { description: 'Simple alteration' },
      ],
    });

    expect(validateSync(input)).toHaveLength(0);
  });

  it('rejects empty orders and invalid garment data', () => {
    const noGarments = plainToInstance(CreateOrderDto, {
      customerId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      garments: [],
    });
    expect(validateSync(noGarments)).not.toHaveLength(0);

    const invalidGarment = plainToInstance(CreateOrderDto, {
      customerId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      garments: [{ description: 'Dress', materialSource: 'supplier' }],
    });
    expect(validateSync(invalidGarment)).not.toHaveLength(0);
  });

  it('does not allow direct progress updates to mark a garment delivered', () => {
    const input = plainToInstance(RecordProgressDto, { stage: 'delivered' });
    expect(validateSync(input)).not.toHaveLength(0);
  });

  it('validates payment details and exact decimal allocation values', () => {
    const valid = plainToInstance(RecordPaymentDto, {
      amount: '150.25',
      method: 'bank_transfer',
      allocations: [
        {
          garmentId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
          amount: '100.25',
        },
      ],
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(RecordPaymentDto, {
      amount: '150.257',
      method: 'crypto',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });

  it('validates delivery methods and requires dates with ISO syntax', () => {
    const valid = plainToInstance(RecordDeliveryDto, {
      method: 'customer_collection',
      occurredAt: '2026-10-27T12:00:00Z',
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(RecordDeliveryDto, {
      method: 'courier',
      occurredAt: 'next Friday',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });

  it('validates an audited garment price confirmation', () => {
    const valid = plainToInstance(ConfirmGarmentPriceDto, {
      agreedPrice: '120.50',
      reason: 'Price confirmed with customer',
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(ConfirmGarmentPriceDto, {
      agreedPrice: '120.501',
      reason: ' ',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });

  it('validates a cancellation settlement and actual refund request', () => {
    const settlement = plainToInstance(CancellationSettlementDto, {
      amountToRefund: '50.00',
      amountRetained: '25.00',
      reason: 'Work had started',
      customerAgreement: 'Customer agreed to retain the cutting charge',
    });
    expect(validateSync(settlement)).toHaveLength(0);

    const refund = plainToInstance(RecordCancellationRefundDto, {
      amount: '50.00',
      method: 'bank_transfer',
      refundedAt: '2026-10-28T10:00:00Z',
    });
    expect(validateSync(refund)).toHaveLength(0);

    const invalid = plainToInstance(AdjustGarmentPriceDto, {
      agreedPrice: '-1.00',
      reason: 'Discount',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });

  it('requires a non-blank reason for financial corrections', () => {
    const valid = plainToInstance(FinancialCorrectionDto, {
      reason: 'Corrected allocation entry',
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(FinancialCorrectionDto, { reason: '   ' });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });
});
