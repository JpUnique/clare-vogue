import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CreateAppointmentDto,
  CreateClientStoryDto,
  CreatePurchaseItemDto,
  UpdateAppointmentDto,
} from './workroom.dto.js';

describe('workroom request validation', () => {
  it('validates purchase quantities, prices, and statuses', () => {
    const valid = plainToInstance(CreatePurchaseItemDto, {
      name: 'Silk lining',
      category: 'Fabric',
      quantity: '2.5',
      unit: 'yards',
      unitPrice: '6200.00',
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(CreatePurchaseItemDto, {
      name: ' ',
      category: 'Fabric',
      quantity: '0',
      unit: 'yards',
      unitPrice: '-1',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });

  it('requires an offset-aware appointment timestamp and valid appointment type', () => {
    const valid = plainToInstance(CreateAppointmentDto, {
      customerId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      type: 'final_fitting',
      scheduledAt: '2026-11-08T10:30:00+01:00',
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(CreateAppointmentDto, {
      customerId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      type: 'fitting',
      scheduledAt: '2026-11-08T10:30:00',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);

    const invalidUpdate = plainToInstance(UpdateAppointmentDto, {
      scheduledAt: '2026-11-08T10:30:00',
    });
    expect(validateSync(invalidUpdate)).not.toHaveLength(0);
  });

  it('requires a valid rating and IDs for a client story', () => {
    const valid = plainToInstance(CreateClientStoryDto, {
      orderId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      garmentId: '15da58b4-40b7-4e16-84c0-6a1e2fb33709',
      mediaId: 'bb2a2556-9a0f-4c0d-a4d6-8e2c6e744c63',
      rating: '5',
      feedback: 'The fit was perfect.',
    });
    expect(validateSync(valid)).toHaveLength(0);

    const invalid = plainToInstance(CreateClientStoryDto, {
      orderId: 'not-a-uuid',
      garmentId: 'not-a-uuid',
      mediaId: 'not-a-uuid',
      rating: 6,
      feedback: ' ',
    });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });
});
