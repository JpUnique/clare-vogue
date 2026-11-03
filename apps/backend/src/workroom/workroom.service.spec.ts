import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { WorkroomService } from './workroom.service.js';

describe('WorkroomService', () => {
  const user = {
    id: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
    sessionId: 'session-id',
    assuranceLevel: 'aal2' as const,
  };

  it('rejects invalid purchase quantities before opening a database transaction', async () => {
    const withAuthorizedBusinessTransaction = vi.fn();
    const service = new WorkroomService({
      withAuthorizedBusinessTransaction,
    } as unknown as DatabaseService);

    await expect(
      service.createPurchaseItem(user, {
        name: 'Silk lining',
        category: 'Fabric',
        quantity: '0',
        unit: 'yards',
        unitPrice: '6200.00',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(withAuthorizedBusinessTransaction).not.toHaveBeenCalled();
  });

  it('requires an order link when an appointment is linked to a garment', async () => {
    const withAuthorizedBusinessTransaction = vi.fn();
    const service = new WorkroomService({
      withAuthorizedBusinessTransaction,
    } as unknown as DatabaseService);

    await expect(
      service.createAppointment(user, {
        customerId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
        garmentId: '15da58b4-40b7-4e16-84c0-6a1e2fb33709',
        type: 'final_fitting',
        scheduledAt: '2026-11-08T10:30:00+01:00',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(withAuthorizedBusinessTransaction).not.toHaveBeenCalled();
  });

  it('rejects blank story feedback before opening a database transaction', async () => {
    const withAuthorizedBusinessTransaction = vi.fn();
    const service = new WorkroomService({
      withAuthorizedBusinessTransaction,
    } as unknown as DatabaseService);

    await expect(
      service.createClientStory(user, {
        orderId: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
        garmentId: '15da58b4-40b7-4e16-84c0-6a1e2fb33709',
        mediaId: 'bb2a2556-9a0f-4c0d-a4d6-8e2c6e744c63',
        rating: 5,
        feedback: ' ',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(withAuthorizedBusinessTransaction).not.toHaveBeenCalled();
  });
});
