import { BadRequestException } from '@nestjs/common';
import { CustomerService } from './customer.service.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { customers, customerEvents } from '../database/schema.js';
import { measurementSets } from '../database/schema.js';
import type { DatabaseService } from '../database/database.service.js';
import type { BusinessTransaction } from '../database/database.service.js';

describe('CustomerService', () => {
  const user: AuthenticatedUser = {
    id: 'a25c05be-e466-45c1-b871-d8c164484fa6',
    sessionId: 'session-id',
    assuranceLevel: 'aal2',
  };
  const businessId = '270da2ba-8239-4842-ac0b-9d736c524712';

  function createService(customerOverrides: Record<string, unknown> = {}) {
    const savedEvents: unknown[] = [];
    const customer = {
      id: '7c61db40-cd7c-4c0c-86c1-5a0fe7e94fa5',
      businessId,
      name: 'Ama K.',
      phone: '08012345678',
      email: null,
      preferredContact: 'phone',
      internalNotes: null,
      archivedAt: null,
      createdAt: new Date('2026-10-27T10:00:00Z'),
      updatedAt: new Date('2026-10-27T10:00:00Z'),
      ...customerOverrides,
    };
    const insertedRows: { table: unknown; values: unknown }[] = [];
    const transaction = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((value: unknown) => {
          if (table === customerEvents) {
            savedEvents.push(value);
            return Promise.resolve(undefined);
          }
          insertedRows.push({ table, values: value });
          return {
            returning: vi
              .fn()
              .mockResolvedValue([
                Object.assign(
                  {},
                  table === measurementSets
                    ? { id: 'measurement-set-id' }
                    : customer,
                  value,
                ),
              ]),
          };
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([customer]),
          })),
        })),
      })),
    };
    const database = {
      withAuthorizedBusinessTransaction: vi.fn(
        async (
          userId: string,
          operation: (
            transaction: BusinessTransaction,
            businessId: string,
          ) => Promise<unknown>,
        ) => {
          expect(userId).toBe(user.id);
          return operation(
            transaction as unknown as BusinessTransaction,
            businessId,
          );
        },
      ),
    } as unknown as DatabaseService;
    return {
      service: new CustomerService(database),
      database,
      transaction,
      customer,
      savedEvents,
      insertedRows,
    };
  }

  it('creates a customer and records the creation event in the same transaction', async () => {
    const { service, transaction, savedEvents } = createService();
    const result = await service.create(user, {
      name: '  Ama K. ',
      phone: ' 08012345678 ',
      email: ' AMA@example.com ',
      preferredContact: 'phone',
      internalNotes: '  Alteration customer ',
    });

    expect(result).toMatchObject({
      businessId,
      name: 'Ama K.',
      phone: '08012345678',
      email: 'ama@example.com',
      internalNotes: 'Alteration customer',
    });
    expect(transaction.insert).toHaveBeenNthCalledWith(1, customers);
    expect(savedEvents).toEqual([
      {
        businessId,
        customerId: result.id,
        actorId: user.id,
        eventType: 'created',
        changedFields: ['created'],
      },
    ]);
  });

  it('rejects a blank name without opening a database transaction', async () => {
    const { service, database } = createService();

    await expect(service.create(user, { name: '   ' })).rejects.toThrow(
      BadRequestException,
    );
    expect(database.withAuthorizedBusinessTransaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate custom names regardless of case before writing', async () => {
    const { service, database } = createService();

    await expect(
      service.addMeasurementSet(user, 'customer-id', {
        measuredAt: '2026-10-27',
        unit: 'cm',
        customMeasurements: [
          { name: 'Sleeve width', value: '12.5' },
          { name: ' sleeve width ', value: '12.75' },
        ],
      }),
    ).rejects.toThrow('Custom measurement names must be unique.');
    expect(database.withAuthorizedBusinessTransaction).not.toHaveBeenCalled();
  });

  it('requires a timezone on measurement timestamps', async () => {
    const { service, database } = createService();

    await expect(
      service.addMeasurementSet(user, 'customer-id', {
        measuredAt: '2026-10-27T10:00:00',
        unit: 'cm',
        bust: '90',
        customMeasurements: [],
      }),
    ).rejects.toThrow('Measurement timestamps must include a timezone.');
    expect(database.withAuthorizedBusinessTransaction).not.toHaveBeenCalled();
  });

  it('records dated measurement sets without replacing earlier sets', async () => {
    const { service, insertedRows } = createService();
    const result = await service.addMeasurementSet(user, 'customer-id', {
      measuredAt: '2026-10-27T10:00:00+01:00',
      unit: 'cm',
      bust: '90.25',
      customMeasurements: [{ name: 'Neck', value: '32.5' }],
    });

    expect(result).toMatchObject({
      id: 'measurement-set-id',
      businessId,
      customerId: 'customer-id',
      unit: 'cm',
      bust: '90.25',
      createdBy: user.id,
      customMeasurements: [{ name: 'Neck', value: '32.5' }],
    });
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].table).toBe(measurementSets);
  });

  it('does not allow adding measurements to an archived customer', async () => {
    const { service } = createService({
      archivedAt: new Date('2026-10-27T10:00:00Z'),
    });

    await expect(
      service.addMeasurementSet(user, 'customer-id', {
        measuredAt: '2026-10-27',
        unit: 'cm',
        bust: '90',
        customMeasurements: [],
      }),
    ).rejects.toThrow(
      'Restore the archived customer before adding measurements.',
    );
  });
});
