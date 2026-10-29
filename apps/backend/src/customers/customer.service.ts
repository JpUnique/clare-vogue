import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import type { BusinessTransaction } from '../database/database.service.js';
import {
  customers,
  customerEvents,
  measurementSets,
} from '../database/schema.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import type {
  CreateCustomerDto,
  CreateMeasurementSetDto,
  ListCustomersDto,
  UpdateCustomerDto,
} from './customer.dto.js';

const standardMeasurementNames = new Set(
  [
    'bust',
    'waist',
    'hips',
    'shoulder width',
    'shoulder-to-waist',
    'sleeve length',
    'armhole',
    'desired dress length',
  ].map(normalizeMeasurementName),
);

const measurementFields = [
  'bust',
  'waist',
  'hips',
  'shoulderWidth',
  'shoulderToWaist',
  'sleeveLength',
  'armhole',
  'desiredDressLength',
] as const satisfies readonly (keyof CreateMeasurementSetDto)[];

type CustomerPatch = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  preferredContact?: CreateCustomerDto['preferredContact'];
  internalNotes?: string | null;
};

@Injectable()
export class CustomerService {
  constructor(private readonly database: DatabaseService) {}

  async create(user: AuthenticatedUser, input: CreateCustomerDto) {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Customer name cannot be empty.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const [customer] = await transaction
          .insert(customers)
          .values({
            businessId,
            name,
            phone: normalizeOptionalText(input.phone),
            email: normalizeOptionalEmail(input.email),
            preferredContact: input.preferredContact ?? null,
            internalNotes: normalizeOptionalText(input.internalNotes),
          })
          .returning();

        await this.recordEvent(transaction, {
          businessId,
          customerId: customer.id,
          actorId: user.id,
          eventType: 'created',
          changedFields: ['created'],
        });

        return customer;
      },
    );
  }

  async list(user: AuthenticatedUser, input: ListCustomersDto) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const conditions = [];
        if (input.includeArchived !== 'true') {
          conditions.push(sql`${customers.archivedAt} is null`);
        }

        const search = input.query?.trim();
        if (search) {
          const pattern = `%${escapeLikePattern(search)}%`;
          conditions.push(
            or(
              ilike(customers.name, pattern),
              ilike(customers.phone, pattern),
              ilike(customers.email, pattern),
            ),
          );
        }

        return transaction
          .select()
          .from(customers)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(customers.updatedAt), desc(customers.id))
          .limit(input.limit)
          .offset(input.offset);
      },
    );
  }

  async getById(user: AuthenticatedUser, customerId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      (transaction) => this.requireCustomer(transaction, customerId),
    );
  }

  async update(
    user: AuthenticatedUser,
    customerId: string,
    input: UpdateCustomerDto,
  ) {
    const patch = createCustomerPatch(input);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('At least one customer field is required.');
    }
    if (patch.name !== undefined) {
      patch.name = patch.name.trim();
      if (!patch.name) {
        throw new BadRequestException('Customer name cannot be empty.');
      }
    }
    if ('phone' in patch) {
      patch.phone = normalizeOptionalText(patch.phone);
    }
    if ('email' in patch) {
      patch.email = normalizeOptionalEmail(patch.email);
    }
    if ('internalNotes' in patch) {
      patch.internalNotes = normalizeOptionalText(patch.internalNotes);
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireCustomer(transaction, customerId);
        if (current.archivedAt) {
          throw new ConflictException(
            'Restore the archived customer before editing it.',
          );
        }

        const [updated] = await transaction
          .update(customers)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(customers.id, customerId))
          .returning();

        await this.recordEvent(transaction, {
          businessId,
          customerId,
          actorId: user.id,
          eventType: 'updated',
          changedFields: Object.keys(patch),
        });
        return updated;
      },
    );
  }

  async archive(user: AuthenticatedUser, customerId: string) {
    return this.setArchived(user, customerId, true);
  }

  async restore(user: AuthenticatedUser, customerId: string) {
    return this.setArchived(user, customerId, false);
  }

  async addMeasurementSet(
    user: AuthenticatedUser,
    customerId: string,
    input: CreateMeasurementSetDto,
  ) {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input.measuredAt);
    const measuredAt = dateOnly
      ? new Date(`${input.measuredAt}T00:00:00.000Z`)
      : new Date(input.measuredAt);
    if (
      Number.isNaN(measuredAt.getTime()) ||
      (dateOnly && measuredAt.toISOString().slice(0, 10) !== input.measuredAt)
    ) {
      throw new BadRequestException('Measurement date is invalid.');
    }
    if (
      input.measuredAt.includes('T') &&
      !/(?:Z|[+-]\d{2}:\d{2})$/i.test(input.measuredAt)
    ) {
      throw new BadRequestException(
        'Measurement timestamps must include a timezone.',
      );
    }

    const hasStandardMeasurement = measurementFields.some(
      (field) => input[field] !== undefined,
    );
    if (!hasStandardMeasurement && input.customMeasurements.length === 0) {
      throw new BadRequestException(
        'At least one measurement value is required.',
      );
    }
    this.validateCustomMeasurementNames(input.customMeasurements);

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const customer = await this.requireCustomer(transaction, customerId);
        if (customer.archivedAt) {
          throw new ConflictException(
            'Restore the archived customer before adding measurements.',
          );
        }

        const [measurementSet] = await transaction
          .insert(measurementSets)
          .values({
            businessId,
            customerId,
            measuredAt,
            unit: input.unit,
            templateVersion: input.templateVersion ?? 'ladies-dress-v1',
            bust: input.bust,
            waist: input.waist,
            hips: input.hips,
            shoulderWidth: input.shoulderWidth,
            shoulderToWaist: input.shoulderToWaist,
            sleeveLength: input.sleeveLength,
            armhole: input.armhole,
            desiredDressLength: input.desiredDressLength,
            customMeasurements: input.customMeasurements.map(
              ({ name, value }) => ({
                name: name.trim(),
                value,
              }),
            ),
            notes: normalizeOptionalText(input.notes),
            createdBy: user.id,
          })
          .returning();

        return measurementSet;
      },
    );
  }

  async listMeasurementSets(user: AuthenticatedUser, customerId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireCustomer(transaction, customerId);
        return transaction
          .select()
          .from(measurementSets)
          .where(eq(measurementSets.customerId, customerId))
          .orderBy(desc(measurementSets.measuredAt), desc(measurementSets.id));
      },
    );
  }

  private async setArchived(
    user: AuthenticatedUser,
    customerId: string,
    archived: boolean,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireCustomer(transaction, customerId);
        if (Boolean(current.archivedAt) === archived) {
          throw new ConflictException(
            archived
              ? 'Customer is already archived.'
              : 'Customer is not archived.',
          );
        }

        const now = new Date();
        const [updated] = await transaction
          .update(customers)
          .set({ archivedAt: archived ? now : null, updatedAt: now })
          .where(eq(customers.id, customerId))
          .returning();

        await this.recordEvent(transaction, {
          businessId,
          customerId,
          actorId: user.id,
          eventType: archived ? 'archived' : 'restored',
          changedFields: ['archivedAt'],
        });
        return updated;
      },
    );
  }

  private async requireCustomer(
    transaction: BusinessTransaction,
    customerId: string,
  ) {
    const [customer] = await transaction
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return customer;
  }

  private async recordEvent(
    transaction: BusinessTransaction,
    event: typeof customerEvents.$inferInsert,
  ): Promise<void> {
    await transaction.insert(customerEvents).values(event);
  }

  private validateCustomMeasurementNames(
    customMeasurements: CreateMeasurementSetDto['customMeasurements'],
  ): void {
    const seenNames = new Set<string>();
    for (const measurement of customMeasurements) {
      const name = normalizeMeasurementName(measurement.name);
      if (!name || standardMeasurementNames.has(name)) {
        throw new BadRequestException(
          'Custom measurement names must be non-empty and distinct from standard fields.',
        );
      }
      if (seenNames.has(name)) {
        throw new BadRequestException(
          'Custom measurement names must be unique.',
        );
      }
      seenNames.add(name);
    }
  }
}

function createCustomerPatch(input: UpdateCustomerDto): CustomerPatch {
  const patch: CustomerPatch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.preferredContact !== undefined) {
    patch.preferredContact = input.preferredContact;
  }
  if (input.internalNotes !== undefined) {
    patch.internalNotes = input.internalNotes;
  }
  return patch;
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined || value === null) return value ?? null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeOptionalEmail(value: string | null | undefined) {
  return normalizeOptionalText(value)?.toLocaleLowerCase('en') ?? null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function normalizeMeasurementName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('en')
    .replace(/[\s_-]+/g, '');
}
