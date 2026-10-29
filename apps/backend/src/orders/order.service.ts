import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import type { BusinessTransaction } from '../database/database.service.js';
import {
  customers,
  fittings,
  deliveryEvents,
  garmentPriceEvents,
  cancellationRefunds,
  cancellationSettlements,
  garmentProgressEvents,
  garments,
  measurementSets,
  orders,
  paymentAllocations,
  paymentAllocationReversals,
  payments,
  paymentVoids,
} from '../database/schema.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import type {
  BlockGarmentDto,
  AllocatePaymentDto,
  AdjustGarmentPriceDto,
  CancelGarmentDto,
  CancellationSettlementDto,
  ConfirmGarmentPriceDto,
  CreateOrderDto,
  FinancialCorrectionDto,
  GarmentStage,
  ListOrdersDto,
  RecordDeliveryDto,
  RecordFittingDto,
  RecordPaymentDto,
  RecordCancellationRefundDto,
  RecordProgressDto,
  ReverseDeliveryDto,
} from './order.dto.js';

const STAGE_ORDER: readonly GarmentStage[] = [
  'request_confirmed',
  'measurements_recorded',
  'material_pending',
  'ready_to_cut',
  'cutting',
  'sewing',
  'customer_fitting',
  'dry_cleaning',
  'packaging',
  'ready_for_delivery',
  'payment_check',
  'customer_notified',
  'delivery_arranged',
];

const MAX_PRICE_MINOR_UNITS = 999_999_999_999n;

export interface OrderSummary {
  status:
    'active' | 'blocked' | 'partially_delivered' | 'completed' | 'cancelled';
  garmentCount: number;
  activeCount: number;
  blockedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  stageCounts: Partial<Record<GarmentStage | 'cancelled', number>>;
  totalAgreedPrice: string;
  dueDate: Date | null;
}

export interface GarmentFinancials {
  agreedPrice: string | null;
  allocatedAmount: string;
  refundedAmount: string;
  netPaidAmount: string;
  balanceDue: string | null;
  creditBalance: string | null;
}

@Injectable()
export class OrderService {
  constructor(private readonly database: DatabaseService) {}

  async create(user: AuthenticatedUser, input: CreateOrderDto) {
    const orderDate = input.orderDate
      ? parseDateWithTimezone(input.orderDate, 'Order date')
      : new Date();
    const normalizedGarments = input.garments.map((garment) => ({
      ...garment,
      description: garment.description.trim(),
    }));

    if (normalizedGarments.some((garment) => !garment.description)) {
      throw new BadRequestException('Garment descriptions cannot be empty.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const [customer] = await transaction
          .select()
          .from(customers)
          .where(eq(customers.id, input.customerId))
          .limit(1);
        if (!customer) {
          throw new NotFoundException('Customer not found.');
        }
        if (customer.archivedAt) {
          throw new ConflictException(
            'Restore the archived customer before creating an order.',
          );
        }

        const measurementIds = [
          ...new Set(
            normalizedGarments
              .map((garment) => garment.measurementSetId)
              .filter((id): id is string => id !== undefined),
          ),
        ];
        if (measurementIds.length) {
          const validSets = await transaction
            .select({ id: measurementSets.id })
            .from(measurementSets)
            .where(
              and(
                eq(measurementSets.customerId, customer.id),
                inArray(measurementSets.id, measurementIds),
              ),
            );
          if (validSets.length !== measurementIds.length) {
            throw new BadRequestException(
              'Every selected measurement set must belong to this customer.',
            );
          }
        }

        const orderId = randomUUID();
        const reference = `CV-${orderId.slice(0, 8).toUpperCase()}`;
        const [createdOrder] = await transaction
          .insert(orders)
          .values({
            id: orderId,
            businessId,
            customerId: customer.id,
            reference,
            orderDate,
            internalNotes: normalizeText(input.internalNotes),
          })
          .returning();

        const createdGarments = [];
        for (const garmentInput of normalizedGarments) {
          const dueDate = garmentInput.dueDate
            ? parseDateWithTimezone(garmentInput.dueDate, 'Garment due date')
            : null;
          if (garmentInput.agreedPrice !== undefined) {
            validateMoney(garmentInput.agreedPrice);
          }
          const [garment] = await transaction
            .insert(garments)
            .values({
              id: randomUUID(),
              businessId,
              orderId,
              customerId: customer.id,
              description: garmentInput.description,
              instructions: normalizeText(garmentInput.instructions),
              materialSource: garmentInput.materialSource ?? 'unknown',
              materialNotes: normalizeText(garmentInput.materialNotes),
              agreedPrice: garmentInput.agreedPrice ?? null,
              dueDate,
              measurementSetId: garmentInput.measurementSetId ?? null,
              stage: 'request_confirmed',
              nextAction:
                normalizeText(garmentInput.nextAction) ??
                'Confirm design and measurements',
            })
            .returning();

          if (garment.agreedPrice !== null) {
            await transaction.insert(garmentPriceEvents).values({
              businessId,
              garmentId: garment.id,
              previousPrice: null,
              newPrice: garment.agreedPrice,
              reason: 'Agreed price recorded during order creation.',
              actorId: user.id,
            });
          }

          await transaction.insert(garmentProgressEvents).values({
            businessId,
            garmentId: garment.id,
            actorId: user.id,
            eventType: 'created',
            toStage: 'request_confirmed',
            nextAction: garment.nextAction,
          });
          createdGarments.push(garment);
        }

        return {
          ...createdOrder,
          garments: createdGarments,
          summary: summarizeOrder(createdGarments),
        };
      },
    );
  }

  async list(user: AuthenticatedUser, input: ListOrdersDto) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const conditions = [];
        const search = input.query?.trim();
        if (search) {
          const pattern = `%${escapeLikePattern(search)}%`;
          conditions.push(
            or(
              ilike(orders.reference, pattern),
              ilike(customers.name, pattern),
            ),
          );
        }

        const rows = await transaction
          .select({
            order: orders,
            customerName: customers.name,
          })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(orders.orderDate), desc(orders.id))
          .limit(input.limit)
          .offset(input.offset);

        const orderIds = rows.map(({ order }) => order.id);
        const garmentsByOrder = new Map<
          string,
          (typeof garments.$inferSelect)[]
        >();
        if (orderIds.length) {
          const orderGarments = await transaction
            .select()
            .from(garments)
            .where(inArray(garments.orderId, orderIds))
            .orderBy(garments.createdAt, garments.id);
          for (const garment of orderGarments) {
            const existing = garmentsByOrder.get(garment.orderId) ?? [];
            existing.push(garment);
            garmentsByOrder.set(garment.orderId, existing);
          }
        }

        return rows.map(({ order, customerName }) => {
          const orderGarments = garmentsByOrder.get(order.id) ?? [];
          return {
            ...order,
            customerName,
            summary: summarizeOrder(orderGarments),
          };
        });
      },
    );
  }

  async getById(user: AuthenticatedUser, orderId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const order = await this.requireOrder(transaction, orderId);
        const orderGarments = await transaction
          .select()
          .from(garments)
          .where(eq(garments.orderId, orderId))
          .orderBy(garments.createdAt, garments.id);
        const financials = await this.getGarmentFinancialsForMany(
          transaction,
          orderGarments,
        );
        const garmentsWithFinancials = orderGarments.map((garment) => ({
          ...garment,
          financials: requireGarmentFinancials(financials, garment.id),
        }));
        return {
          ...order,
          garments: garmentsWithFinancials,
          summary: summarizeOrder(orderGarments),
        };
      },
    );
  }

  async listGarments(user: AuthenticatedUser, orderId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireOrder(transaction, orderId);
        const orderGarments = await transaction
          .select()
          .from(garments)
          .where(eq(garments.orderId, orderId))
          .orderBy(garments.createdAt, garments.id);
        const financials = await this.getGarmentFinancialsForMany(
          transaction,
          orderGarments,
        );
        return orderGarments.map((garment) => ({
          ...garment,
          financials: requireGarmentFinancials(financials, garment.id),
        }));
      },
    );
  }

  async getGarment(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const garment = await this.requireGarment(transaction, garmentId);
        return {
          ...garment,
          financials: await this.getGarmentFinancials(transaction, garment),
        };
      },
    );
  }

  async confirmGarmentPrice(
    user: AuthenticatedUser,
    garmentId: string,
    input: ConfirmGarmentPriceDto,
  ) {
    validateMoney(input.agreedPrice);
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('A price confirmation reason is required.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireGarment(transaction, garmentId);
        await this.requireOrder(transaction, current.orderId, true);
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage === 'cancelled') {
          throw new ConflictException(
            'A cancelled garment cannot have its price confirmed.',
          );
        }
        if (garment.agreedPrice !== null) {
          throw new ConflictException(
            'The agreed price is already set; use an audited price adjustment workflow.',
          );
        }

        const newPrice = parseMoneyMinorUnits(input.agreedPrice);
        const allocated = await this.getGarmentAllocatedMinorUnits(
          transaction,
          garment.id,
        );
        if (allocated > newPrice) {
          throw new ConflictException(
            'The agreed price cannot be lower than payments already allocated to this garment.',
          );
        }

        const [updated] = await transaction
          .update(garments)
          .set({ agreedPrice: input.agreedPrice, updatedAt: new Date() })
          .where(eq(garments.id, garment.id))
          .returning();
        await transaction.insert(garmentPriceEvents).values({
          businessId,
          garmentId: garment.id,
          previousPrice: null,
          newPrice: input.agreedPrice,
          reason,
          actorId: user.id,
        });
        return {
          ...updated,
          financials: await this.getGarmentFinancials(transaction, updated),
        };
      },
    );
  }

  async listGarmentPriceEvents(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireGarment(transaction, garmentId);
        return transaction
          .select()
          .from(garmentPriceEvents)
          .where(eq(garmentPriceEvents.garmentId, garmentId))
          .orderBy(garmentPriceEvents.createdAt, garmentPriceEvents.id);
      },
    );
  }

  async adjustGarmentPrice(
    user: AuthenticatedUser,
    garmentId: string,
    input: AdjustGarmentPriceDto,
  ) {
    validateMoney(input.agreedPrice);
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('A price adjustment reason is required.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireGarment(transaction, garmentId);
        await this.requireOrder(transaction, current.orderId, true);
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage === 'cancelled') {
          throw new ConflictException(
            'A cancelled garment price cannot be adjusted.',
          );
        }
        if (garment.agreedPrice === null) {
          throw new ConflictException(
            'Confirm the garment price before adjusting it.',
          );
        }
        const [updated] = await transaction
          .update(garments)
          .set({ agreedPrice: input.agreedPrice, updatedAt: new Date() })
          .where(eq(garments.id, garment.id))
          .returning();
        await transaction.insert(garmentPriceEvents).values({
          businessId,
          garmentId: garment.id,
          previousPrice: garment.agreedPrice,
          newPrice: input.agreedPrice,
          reason,
          actorId: user.id,
        });
        return {
          ...updated,
          financials: await this.getGarmentFinancials(transaction, updated),
        };
      },
    );
  }

  async createCancellationSettlement(
    user: AuthenticatedUser,
    garmentId: string,
    input: CancellationSettlementDto,
  ) {
    const amountToRefund = parseMoneyMinorUnits(input.amountToRefund);
    const amountRetained = parseMoneyMinorUnits(input.amountRetained);
    const reason = input.reason.trim();
    const customerAgreement = input.customerAgreement.trim();
    if (!reason || !customerAgreement) {
      throw new BadRequestException(
        'A settlement reason and customer agreement are required.',
      );
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireGarment(transaction, garmentId);
        await this.requireOrder(transaction, current.orderId, true);
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage !== 'cancelled') {
          throw new ConflictException(
            'A cancellation settlement can only be recorded for a cancelled garment.',
          );
        }
        const existing = await transaction
          .select({ id: cancellationSettlements.id })
          .from(cancellationSettlements)
          .where(eq(cancellationSettlements.garmentId, garment.id))
          .limit(1);
        if (existing.length) {
          throw new ConflictException(
            'A cancellation settlement has already been recorded for this garment.',
          );
        }
        const amountPaid = await this.getGarmentAllocatedMinorUnits(
          transaction,
          garment.id,
        );
        validateCancellationSettlement(
          amountToRefund,
          amountRetained,
          amountPaid,
        );

        const [settlement] = await transaction
          .insert(cancellationSettlements)
          .values({
            businessId,
            garmentId: garment.id,
            amountToRefund: input.amountToRefund,
            amountRetained: input.amountRetained,
            reason,
            customerAgreement,
            actorId: user.id,
          })
          .returning();
        return {
          ...settlement,
          amountPaid: formatMoney(amountPaid),
          refundRecorded: '0.00',
          refundOutstanding: settlement.amountToRefund,
        };
      },
    );
  }

  async getCancellationSettlement(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireGarment(transaction, garmentId);
        const [settlement] = await transaction
          .select()
          .from(cancellationSettlements)
          .where(eq(cancellationSettlements.garmentId, garmentId))
          .limit(1);
        if (!settlement) {
          throw new NotFoundException(
            'Cancellation settlement not found for this garment.',
          );
        }
        const refunds = await transaction
          .select()
          .from(cancellationRefunds)
          .where(eq(cancellationRefunds.settlementId, settlement.id))
          .orderBy(cancellationRefunds.refundedAt, cancellationRefunds.id);
        const refunded = refunds.reduce(
          (total, refund) => total + parseMoneyMinorUnits(refund.amount),
          0n,
        );
        const agreedRefund = parseMoneyMinorUnits(settlement.amountToRefund);
        return {
          ...settlement,
          refunds,
          refundRecorded: formatMoney(refunded),
          refundOutstanding: formatMoney(
            agreedRefund > refunded ? agreedRefund - refunded : 0n,
          ),
        };
      },
    );
  }

  async recordCancellationRefund(
    user: AuthenticatedUser,
    garmentId: string,
    settlementId: string,
    input: RecordCancellationRefundDto,
  ) {
    const refundAmount = parseMoneyMinorUnits(input.amount);
    if (refundAmount <= 0n) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }
    const refundedAt = input.refundedAt
      ? parseDateWithTimezone(input.refundedAt, 'Refund date')
      : new Date();

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireGarment(transaction, garmentId);
        await this.requireOrder(transaction, current.orderId, true);
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage !== 'cancelled') {
          throw new ConflictException(
            'A refund can only be recorded for a cancelled garment.',
          );
        }
        const [settlement] = await transaction
          .select()
          .from(cancellationSettlements)
          .where(
            and(
              eq(cancellationSettlements.id, settlementId),
              eq(cancellationSettlements.garmentId, garment.id),
            ),
          )
          .limit(1)
          .for('update');
        if (!settlement) {
          throw new NotFoundException('Cancellation settlement not found.');
        }

        const [totalResult] = await transaction
          .select({
            total: sql<string>`coalesce(sum(${cancellationRefunds.amount}), 0)::text`,
          })
          .from(cancellationRefunds)
          .where(eq(cancellationRefunds.settlementId, settlement.id));
        const refundTotal = parseStoredMoneyMinorUnits(totalResult.total);
        validateRefundAgainstSettlement(
          refundTotal,
          refundAmount,
          parseMoneyMinorUnits(settlement.amountToRefund),
        );

        const [refund] = await transaction
          .insert(cancellationRefunds)
          .values({
            businessId,
            garmentId: garment.id,
            settlementId: settlement.id,
            amount: input.amount,
            method: input.method,
            reference: normalizeText(input.reference),
            note: normalizeText(input.note),
            refundedAt,
            actorId: user.id,
          })
          .returning();
        return {
          refund,
          refundRecorded: formatMoney(refundTotal + refundAmount),
          refundOutstanding: formatMoney(
            parseMoneyMinorUnits(settlement.amountToRefund) -
              refundTotal -
              refundAmount,
          ),
        };
      },
    );
  }

  async listProgress(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireGarment(transaction, garmentId);
        return transaction
          .select()
          .from(garmentProgressEvents)
          .where(eq(garmentProgressEvents.garmentId, garmentId))
          .orderBy(garmentProgressEvents.createdAt, garmentProgressEvents.id);
      },
    );
  }

  async recordProgress(
    user: AuthenticatedUser,
    garmentId: string,
    input: RecordProgressDto,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const garment = await this.requireGarment(transaction, garmentId, true);
        this.assertWorkable(garment.stage, garment.blockedAt);
        validateStageMove(garment.stage, input.stage, input.reworkReason);

        const note = normalizeText(input.note);
        const nextAction = normalizeText(input.nextAction);
        const [updated] = await transaction
          .update(garments)
          .set({
            stage: input.stage,
            nextAction,
            updatedAt: new Date(),
          })
          .where(eq(garments.id, garmentId))
          .returning();

        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId,
          actorId: user.id,
          eventType:
            garment.stage === input.stage ? 'progress_logged' : 'stage_changed',
          fromStage: garment.stage,
          toStage: input.stage,
          note,
          nextAction,
          reason: normalizeText(input.reworkReason),
        });
        return updated;
      },
    );
  }

  async block(
    user: AuthenticatedUser,
    garmentId: string,
    input: BlockGarmentDto,
  ) {
    const reason = input.reason.trim();
    if (!reason)
      throw new BadRequestException('A blocking reason is required.');

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const garment = await this.requireGarment(transaction, garmentId, true);
        this.assertWorkable(garment.stage, garment.blockedAt);
        const now = new Date();
        const [updated] = await transaction
          .update(garments)
          .set({ blockedAt: now, blockingReason: reason, updatedAt: now })
          .where(eq(garments.id, garmentId))
          .returning();
        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId,
          actorId: user.id,
          eventType: 'blocked',
          fromStage: garment.stage,
          toStage: garment.stage,
          reason,
        });
        return updated;
      },
    );
  }

  async resume(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage === 'cancelled') {
          throw new ConflictException('A cancelled garment cannot be resumed.');
        }
        if (!garment.blockedAt) {
          throw new ConflictException('Garment is not blocked.');
        }
        const [updated] = await transaction
          .update(garments)
          .set({
            blockedAt: null,
            blockingReason: null,
            updatedAt: new Date(),
          })
          .where(eq(garments.id, garmentId))
          .returning();
        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId,
          actorId: user.id,
          eventType: 'unblocked',
          fromStage: garment.stage,
          toStage: garment.stage,
          reason: garment.blockingReason,
          nextAction: garment.nextAction,
        });
        return updated;
      },
    );
  }

  async cancel(
    user: AuthenticatedUser,
    garmentId: string,
    input: CancelGarmentDto,
  ) {
    const reason = input.reason.trim();
    if (!reason)
      throw new BadRequestException('A cancellation reason is required.');

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage === 'cancelled') {
          throw new ConflictException('Garment is already cancelled.');
        }
        if (garment.stage === 'delivered') {
          throw new ConflictException(
            'A delivered garment cannot be cancelled.',
          );
        }

        const now = new Date();
        const [updated] = await transaction
          .update(garments)
          .set({
            stage: 'cancelled',
            cancelledAt: now,
            cancellationReason: reason,
            blockedAt: null,
            blockingReason: null,
            updatedAt: now,
          })
          .where(eq(garments.id, garmentId))
          .returning();
        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId,
          actorId: user.id,
          eventType: 'cancelled',
          fromStage: garment.stage,
          toStage: 'cancelled',
          reason,
        });
        return updated;
      },
    );
  }

  async recordFitting(
    user: AuthenticatedUser,
    garmentId: string,
    input: RecordFittingDto,
  ) {
    if (
      input.outcome === 'alterations_required' &&
      !normalizeText(input.requestedAlterations)
    ) {
      throw new BadRequestException(
        'Describe the alterations requested by the customer.',
      );
    }
    if (
      input.outcome === 'approved' &&
      normalizeText(input.requestedAlterations)
    ) {
      throw new BadRequestException(
        'An approved fitting cannot include requested alterations.',
      );
    }
    const completedAt = input.completedAt
      ? parseDateWithTimezone(input.completedAt, 'Fitting date')
      : new Date();

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const garment = await this.requireGarment(transaction, garmentId, true);
        this.assertWorkable(garment.stage, garment.blockedAt);
        if (garment.stage !== 'customer_fitting') {
          throw new ConflictException(
            'A fitting result can only be recorded while the garment is at customer fitting.',
          );
        }

        const [fitting] = await transaction
          .insert(fittings)
          .values({
            businessId,
            garmentId,
            outcome: input.outcome,
            completedAt,
            requestedAlterations: normalizeText(input.requestedAlterations),
            notes: normalizeText(input.notes),
            createdBy: user.id,
          })
          .returning();

        let nextStage: GarmentStage = garment.stage;
        if (input.outcome === 'alterations_required') nextStage = 'alterations';
        if (input.outcome === 'approved') nextStage = 'dry_cleaning';
        const nextAction =
          input.outcome === 'alterations_required'
            ? 'Complete requested alterations, then fit the customer again'
            : input.outcome === 'approved'
              ? 'Send garment for dry cleaning'
              : garment.nextAction;

        const [updated] = await transaction
          .update(garments)
          .set({
            stage: nextStage,
            nextAction,
            updatedAt: new Date(),
          })
          .where(eq(garments.id, garmentId))
          .returning();
        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId,
          actorId: user.id,
          eventType: 'fitting_recorded',
          fromStage: garment.stage,
          toStage: nextStage,
          note: normalizeText(input.notes),
          nextAction,
          reason: normalizeText(input.requestedAlterations),
        });
        return { fitting, garment: updated };
      },
    );
  }

  async listFittings(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireGarment(transaction, garmentId);
        return transaction
          .select()
          .from(fittings)
          .where(eq(fittings.garmentId, garmentId))
          .orderBy(fittings.completedAt, fittings.id);
      },
    );
  }

  async recordPayment(
    user: AuthenticatedUser,
    orderId: string,
    input: RecordPaymentDto,
  ) {
    const paymentMinorUnits = parseMoneyMinorUnits(input.amount);
    if (paymentMinorUnits <= 0n) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }
    const receivedAt = input.receivedAt
      ? parseDateWithTimezone(input.receivedAt, 'Payment date')
      : new Date();
    const requestedAllocations = input.allocations ?? [];
    const requestedAllocationTotal = validateAllocationRequest(
      requestedAllocations,
      paymentMinorUnits,
      'Payment allocations cannot exceed the payment received.',
    );

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const order = await this.requireOrder(transaction, orderId, true);
        const [payment] = await transaction
          .insert(payments)
          .values({
            businessId,
            orderId: order.id,
            amount: input.amount,
            method: input.method,
            reference: normalizeText(input.reference),
            note: normalizeText(input.note),
            receivedAt,
            receivedBy: user.id,
          })
          .returning();

        const allocationRows = [];
        if (requestedAllocations.length) {
          const allocationGarments = await transaction
            .select()
            .from(garments)
            .where(
              and(
                eq(garments.orderId, order.id),
                inArray(
                  garments.id,
                  requestedAllocations.map(({ garmentId }) => garmentId),
                ),
              ),
            )
            .orderBy(garments.id)
            .for('update');
          if (allocationGarments.length !== requestedAllocations.length) {
            throw new BadRequestException(
              'Every allocated garment must belong to this order.',
            );
          }

          const garmentById = new Map(
            allocationGarments.map((garment) => [garment.id, garment]),
          );
          for (const allocation of requestedAllocations) {
            const garment = garmentById.get(allocation.garmentId);
            if (!garment) {
              throw new BadRequestException(
                'Every allocated garment must belong to this order.',
              );
            }
            if (garment.stage === 'cancelled') {
              throw new ConflictException(
                'Payments cannot be allocated to a cancelled garment.',
              );
            }
            const amount = parseMoneyMinorUnits(allocation.amount);
            const alreadyAllocated = await this.getGarmentAllocatedMinorUnits(
              transaction,
              garment.id,
            );
            if (
              garment.agreedPrice !== null &&
              alreadyAllocated + amount >
                parseMoneyMinorUnits(garment.agreedPrice)
            ) {
              throw new BadRequestException(
                `Payment allocation exceeds the agreed price for garment ${garment.id}.`,
              );
            }

            const [allocationRow] = await transaction
              .insert(paymentAllocations)
              .values({
                businessId,
                orderId: order.id,
                paymentId: payment.id,
                garmentId: garment.id,
                amount: allocation.amount,
                allocatedBy: user.id,
              })
              .returning();
            allocationRows.push(allocationRow);
          }
        }

        return {
          ...payment,
          allocations: allocationRows,
          allocatedAmount: formatMoney(requestedAllocationTotal),
          unallocatedAmount: formatMoney(
            paymentMinorUnits - requestedAllocationTotal,
          ),
        };
      },
    );
  }

  async listPayments(user: AuthenticatedUser, orderId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireOrder(transaction, orderId);
        const orderPayments = await transaction
          .select()
          .from(payments)
          .where(eq(payments.orderId, orderId))
          .orderBy(desc(payments.receivedAt), desc(payments.id));
        const allocationHistory = await transaction
          .select({
            allocation: paymentAllocations,
            reversal: paymentAllocationReversals,
          })
          .from(paymentAllocations)
          .leftJoin(
            paymentAllocationReversals,
            eq(paymentAllocationReversals.allocationId, paymentAllocations.id),
          )
          .where(eq(paymentAllocations.orderId, orderId))
          .orderBy(paymentAllocations.createdAt, paymentAllocations.id);
        const voids = await transaction
          .select()
          .from(paymentVoids)
          .where(eq(paymentVoids.orderId, orderId));
        const voidsByPayment = new Map(
          voids.map((paymentVoid) => [paymentVoid.paymentId, paymentVoid]),
        );
        const allocationsByPayment = new Map<
          string,
          typeof allocationHistory
        >();
        for (const allocationEvent of allocationHistory) {
          const paymentId = allocationEvent.allocation.paymentId;
          const existing = allocationsByPayment.get(paymentId) ?? [];
          existing.push(allocationEvent);
          allocationsByPayment.set(paymentId, existing);
        }

        return orderPayments.map((payment) => {
          const paymentAllocationHistory =
            allocationsByPayment.get(payment.id) ?? [];
          const allocated = calculateActivePaymentAllocationTotal(
            paymentAllocationHistory.map(({ allocation, reversal }) => ({
              amount: allocation.amount,
              reversed: reversal !== null,
            })),
          );
          const total = parseMoneyMinorUnits(payment.amount);
          const paymentVoid = voidsByPayment.get(payment.id) ?? null;
          return {
            ...payment,
            status: paymentVoid ? 'voided' : 'active',
            void: paymentVoid,
            allocations: paymentAllocationHistory.map(
              ({ allocation, reversal }) => ({
                ...allocation,
                active: !reversal,
                reversal,
              }),
            ),
            allocatedAmount: formatMoney(allocated),
            unallocatedAmount: formatMoney(
              paymentVoid ? 0n : total - allocated,
            ),
          };
        });
      },
    );
  }

  async allocatePayment(
    user: AuthenticatedUser,
    orderId: string,
    paymentId: string,
    input: AllocatePaymentDto,
  ) {
    const allocations = input.allocations;
    const requestedTotal = validateAllocationRequest(
      allocations,
      MAX_PRICE_MINOR_UNITS,
      'Payment allocation request exceeds the supported maximum.',
    );

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const order = await this.requireOrder(transaction, orderId, true);
        const [payment] = await transaction
          .select()
          .from(payments)
          .where(
            and(eq(payments.id, paymentId), eq(payments.orderId, order.id)),
          )
          .limit(1)
          .for('update');
        if (!payment) throw new NotFoundException('Payment not found.');

        const [paymentVoid] = await transaction
          .select()
          .from(paymentVoids)
          .where(eq(paymentVoids.paymentId, payment.id))
          .limit(1);
        if (paymentVoid) {
          throw new ConflictException(
            'A voided payment cannot receive new allocations.',
          );
        }

        const existingPaymentTotal = await this.getPaymentAllocatedMinorUnits(
          transaction,
          payment.id,
        );
        if (
          existingPaymentTotal + requestedTotal >
          parseMoneyMinorUnits(payment.amount)
        ) {
          throw new BadRequestException(
            'Total allocations cannot exceed the payment received.',
          );
        }

        const allocationGarments = await transaction
          .select()
          .from(garments)
          .where(
            and(
              eq(garments.orderId, order.id),
              inArray(
                garments.id,
                allocations.map(({ garmentId }) => garmentId),
              ),
            ),
          )
          .orderBy(garments.id)
          .for('update');
        if (allocationGarments.length !== allocations.length) {
          throw new BadRequestException(
            'Every allocated garment must belong to this order.',
          );
        }

        const garmentById = new Map(
          allocationGarments.map((garment) => [garment.id, garment]),
        );
        const createdAllocations = [];
        for (const allocation of allocations) {
          const garment = garmentById.get(allocation.garmentId);
          if (!garment) {
            throw new BadRequestException(
              'Every allocated garment must belong to this order.',
            );
          }
          if (garment.stage === 'cancelled') {
            throw new ConflictException(
              'Payments cannot be allocated to a cancelled garment.',
            );
          }
          const amount = parseMoneyMinorUnits(allocation.amount);
          const alreadyAllocated = await this.getGarmentAllocatedMinorUnits(
            transaction,
            garment.id,
          );
          if (
            garment.agreedPrice !== null &&
            alreadyAllocated + amount >
              parseMoneyMinorUnits(garment.agreedPrice)
          ) {
            throw new BadRequestException(
              `Payment allocation exceeds the agreed price for garment ${garment.id}.`,
            );
          }
          const [created] = await transaction
            .insert(paymentAllocations)
            .values({
              businessId,
              orderId: order.id,
              paymentId: payment.id,
              garmentId: garment.id,
              amount: allocation.amount,
              allocatedBy: user.id,
            })
            .returning();
          createdAllocations.push(created);
        }

        return {
          payment,
          allocations: createdAllocations,
          allocatedAmount: formatMoney(existingPaymentTotal + requestedTotal),
          unallocatedAmount: formatMoney(
            parseMoneyMinorUnits(payment.amount) -
              existingPaymentTotal -
              requestedTotal,
          ),
        };
      },
    );
  }

  async reversePaymentAllocation(
    user: AuthenticatedUser,
    orderId: string,
    paymentId: string,
    allocationId: string,
    input: FinancialCorrectionDto,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const reason = input.reason.trim();
        if (!reason) {
          throw new BadRequestException(
            'A payment allocation reversal reason is required.',
          );
        }
        const order = await this.requireOrder(transaction, orderId, true);
        const [payment] = await transaction
          .select()
          .from(payments)
          .where(
            and(eq(payments.id, paymentId), eq(payments.orderId, order.id)),
          )
          .limit(1)
          .for('update');
        if (!payment) throw new NotFoundException('Payment not found.');

        const [allocation] = await transaction
          .select()
          .from(paymentAllocations)
          .where(
            and(
              eq(paymentAllocations.id, allocationId),
              eq(paymentAllocations.paymentId, payment.id),
              eq(paymentAllocations.orderId, order.id),
            ),
          )
          .limit(1)
          .for('update');
        if (!allocation) {
          throw new NotFoundException('Payment allocation not found.');
        }

        const [existingReversal] = await transaction
          .select()
          .from(paymentAllocationReversals)
          .where(eq(paymentAllocationReversals.allocationId, allocation.id))
          .limit(1);
        if (existingReversal) {
          throw new ConflictException(
            'This payment allocation has already been reversed.',
          );
        }

        const [paymentVoid] = await transaction
          .select()
          .from(paymentVoids)
          .where(eq(paymentVoids.paymentId, payment.id))
          .limit(1);
        if (paymentVoid) {
          throw new ConflictException(
            'Allocations on a voided payment cannot be reversed.',
          );
        }

        const [garment] = await transaction
          .select()
          .from(garments)
          .where(eq(garments.id, allocation.garmentId))
          .limit(1)
          .for('update');
        if (!garment) {
          throw new NotFoundException('Allocated garment not found.');
        }
        if (garment.stage === 'delivered' || garment.stage === 'cancelled') {
          throw new ConflictException(
            'Allocations for delivered or cancelled garments cannot be reversed.',
          );
        }
        const [settlement] = await transaction
          .select({ id: cancellationSettlements.id })
          .from(cancellationSettlements)
          .where(eq(cancellationSettlements.garmentId, garment.id))
          .limit(1);
        if (settlement) {
          throw new ConflictException(
            'Allocations for a settled cancellation cannot be reversed.',
          );
        }

        const [reversal] = await transaction
          .insert(paymentAllocationReversals)
          .values({
            businessId,
            orderId: order.id,
            paymentId: payment.id,
            garmentId: garment.id,
            allocationId: allocation.id,
            reason,
            actorId: user.id,
          })
          .returning();

        return { allocation, reversal };
      },
    );
  }

  async voidPayment(
    user: AuthenticatedUser,
    orderId: string,
    paymentId: string,
    input: FinancialCorrectionDto,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const reason = input.reason.trim();
        if (!reason) {
          throw new BadRequestException('A payment void reason is required.');
        }
        const order = await this.requireOrder(transaction, orderId, true);
        const [payment] = await transaction
          .select()
          .from(payments)
          .where(
            and(eq(payments.id, paymentId), eq(payments.orderId, order.id)),
          )
          .limit(1)
          .for('update');
        if (!payment) throw new NotFoundException('Payment not found.');

        const [existingVoid] = await transaction
          .select()
          .from(paymentVoids)
          .where(eq(paymentVoids.paymentId, payment.id))
          .limit(1);
        if (existingVoid) {
          throw new ConflictException('This payment has already been voided.');
        }

        const allocations = await transaction
          .select({
            allocationId: paymentAllocations.id,
            reversalId: paymentAllocationReversals.id,
          })
          .from(paymentAllocations)
          .leftJoin(
            paymentAllocationReversals,
            eq(paymentAllocationReversals.allocationId, paymentAllocations.id),
          )
          .where(eq(paymentAllocations.paymentId, payment.id));
        validatePaymentCanBeVoided(allocations);

        const [paymentVoid] = await transaction
          .insert(paymentVoids)
          .values({
            businessId,
            orderId: order.id,
            paymentId: payment.id,
            actorId: user.id,
            reason,
          })
          .returning();
        return { payment, void: paymentVoid };
      },
    );
  }

  async listDeliveries(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireGarment(transaction, garmentId);
        return transaction
          .select()
          .from(deliveryEvents)
          .where(eq(deliveryEvents.garmentId, garmentId))
          .orderBy(deliveryEvents.createdAt, deliveryEvents.id);
      },
    );
  }

  async recordDelivery(
    user: AuthenticatedUser,
    garmentId: string,
    input: RecordDeliveryDto,
  ) {
    const occurredAt = input.occurredAt
      ? parseDateWithTimezone(input.occurredAt, 'Delivery date')
      : new Date();
    const agreedFollowUpAt = input.agreedFollowUpAt
      ? parseDateWithTimezone(input.agreedFollowUpAt, 'Agreed follow-up date')
      : null;
    const agreementTerms = normalizeText(input.agreementTerms);

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireGarment(transaction, garmentId);
        await this.requireOrder(transaction, current.orderId, true);
        const garment = await this.requireGarment(transaction, garmentId, true);
        this.assertWorkable(garment.stage, garment.blockedAt);
        if (garment.stage !== 'delivery_arranged') {
          throw new ConflictException(
            'A garment must have delivery arranged before it can be handed over.',
          );
        }
        const allocated = await this.getGarmentAllocatedMinorUnits(
          transaction,
          garment.id,
        );
        const balance = calculateBalanceDue(garment.agreedPrice, allocated);
        if (balance === null) {
          throw new ConflictException(
            'Set an agreed garment price before recording delivery.',
          );
        }
        validateDeliveryAgreement(balance, agreementTerms);
        if (agreedFollowUpAt && !agreementTerms) {
          throw new BadRequestException(
            'An agreed follow-up date requires recorded agreement terms.',
          );
        }

        const [delivery] = await transaction
          .insert(deliveryEvents)
          .values({
            businessId,
            garmentId: garment.id,
            eventType: 'delivered',
            method: input.method,
            recipientName: normalizeText(input.recipientName),
            notes: normalizeText(input.notes),
            occurredAt,
            balanceAtDelivery: formatMoney(balance),
            agreementTerms,
            agreedFollowUpAt,
            actorId: user.id,
          })
          .returning();
        const [updated] = await transaction
          .update(garments)
          .set({
            stage: 'delivered',
            nextAction: null,
            updatedAt: new Date(),
          })
          .where(eq(garments.id, garment.id))
          .returning();
        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId: garment.id,
          actorId: user.id,
          eventType: 'delivery_recorded',
          fromStage: garment.stage,
          toStage: 'delivered',
          note: normalizeText(input.notes),
          reason: agreementTerms,
        });

        return { delivery, garment: updated };
      },
    );
  }

  async reverseDelivery(
    user: AuthenticatedUser,
    garmentId: string,
    deliveryEventId: string,
    input: ReverseDeliveryDto,
  ) {
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException(
        'A delivery correction reason is required.',
      );
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const current = await this.requireGarment(transaction, garmentId);
        await this.requireOrder(transaction, current.orderId, true);
        const garment = await this.requireGarment(transaction, garmentId, true);
        if (garment.stage !== 'delivered') {
          throw new ConflictException(
            'Only a currently delivered garment can have its delivery reversed.',
          );
        }

        const events = await transaction
          .select()
          .from(deliveryEvents)
          .where(eq(deliveryEvents.garmentId, garmentId))
          .orderBy(desc(deliveryEvents.createdAt), desc(deliveryEvents.id));
        const reversedEventIds = new Set(
          events
            .filter((event) => event.eventType === 'reversed')
            .map((event) => event.reversesDeliveryEventId),
        );
        const activeDelivery = events.find(
          (event) =>
            event.eventType === 'delivered' && !reversedEventIds.has(event.id),
        );
        if (!activeDelivery || activeDelivery.id !== deliveryEventId) {
          throw new ConflictException(
            'The specified delivery is not the active delivery for this garment.',
          );
        }

        const [correction] = await transaction
          .insert(deliveryEvents)
          .values({
            businessId,
            garmentId,
            eventType: 'reversed',
            reversesDeliveryEventId: activeDelivery.id,
            correctionReason: reason,
            actorId: user.id,
          })
          .returning();
        const [updated] = await transaction
          .update(garments)
          .set({
            stage: 'delivery_arranged',
            nextAction: 'Confirm collection or delivery arrangements',
            updatedAt: new Date(),
          })
          .where(eq(garments.id, garmentId))
          .returning();
        await transaction.insert(garmentProgressEvents).values({
          businessId,
          garmentId,
          actorId: user.id,
          eventType: 'delivery_reversed',
          fromStage: 'delivered',
          toStage: 'delivery_arranged',
          reason,
          nextAction: updated.nextAction,
        });

        return { correction, garment: updated };
      },
    );
  }

  private async requireOrder(
    transaction: BusinessTransaction,
    orderId: string,
    lock = false,
  ) {
    const result = lock
      ? await transaction
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1)
          .for('update')
      : await transaction
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);
    const [order] = result;
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  private async requireGarment(
    transaction: BusinessTransaction,
    garmentId: string,
    lock = false,
  ) {
    const result = lock
      ? await transaction
          .select()
          .from(garments)
          .where(eq(garments.id, garmentId))
          .limit(1)
          .for('update')
      : await transaction
          .select()
          .from(garments)
          .where(eq(garments.id, garmentId))
          .limit(1);
    const [garment] = result;
    if (!garment) throw new NotFoundException('Garment not found.');
    return garment;
  }

  private assertWorkable(
    stage: GarmentStage | 'cancelled',
    blockedAt: Date | null,
  ): void {
    if (stage === 'cancelled') {
      throw new ConflictException('A cancelled garment cannot be changed.');
    }
    if (stage === 'delivered') {
      throw new ConflictException(
        'A delivered garment must be reversed before rework.',
      );
    }
    if (blockedAt) {
      throw new ConflictException(
        'Resume the blocked garment before changing its progress.',
      );
    }
  }

  private async getGarmentAllocatedMinorUnits(
    transaction: BusinessTransaction,
    garmentId: string,
  ): Promise<bigint> {
    const [result] = await transaction
      .select({
        total: sql<string>`coalesce(sum(case when ${paymentAllocationReversals.id} is null then ${paymentAllocations.amount} else 0 end), 0)::text`,
      })
      .from(paymentAllocations)
      .leftJoin(
        paymentAllocationReversals,
        eq(paymentAllocationReversals.allocationId, paymentAllocations.id),
      )
      .where(eq(paymentAllocations.garmentId, garmentId));
    return parseStoredMoneyMinorUnits(result.total);
  }

  private async getPaymentAllocatedMinorUnits(
    transaction: BusinessTransaction,
    paymentId: string,
  ): Promise<bigint> {
    const [result] = await transaction
      .select({
        total: sql<string>`coalesce(sum(case when ${paymentAllocationReversals.id} is null then ${paymentAllocations.amount} else 0 end), 0)::text`,
      })
      .from(paymentAllocations)
      .leftJoin(
        paymentAllocationReversals,
        eq(paymentAllocationReversals.allocationId, paymentAllocations.id),
      )
      .where(eq(paymentAllocations.paymentId, paymentId));
    return parseStoredMoneyMinorUnits(result.total);
  }

  private async getGarmentFinancials(
    transaction: BusinessTransaction,
    garment: typeof garments.$inferSelect,
  ) {
    const financials = await this.getGarmentFinancialsForMany(transaction, [
      garment,
    ]);
    return requireGarmentFinancials(financials, garment.id);
  }

  private async getGarmentFinancialsForMany(
    transaction: BusinessTransaction,
    garmentRows: (typeof garments.$inferSelect)[],
  ) {
    const totalsByGarment = new Map<string, bigint>();
    const refundsByGarment = new Map<string, bigint>();
    if (garmentRows.length) {
      const totals = await transaction
        .select({
          garmentId: paymentAllocations.garmentId,
          total: sql<string>`coalesce(sum(case when ${paymentAllocationReversals.id} is null then ${paymentAllocations.amount} else 0 end), 0)::text`,
        })
        .from(paymentAllocations)
        .leftJoin(
          paymentAllocationReversals,
          eq(paymentAllocationReversals.allocationId, paymentAllocations.id),
        )
        .where(
          inArray(
            paymentAllocations.garmentId,
            garmentRows.map((garment) => garment.id),
          ),
        )
        .groupBy(paymentAllocations.garmentId);
      for (const total of totals) {
        totalsByGarment.set(
          total.garmentId,
          parseStoredMoneyMinorUnits(total.total),
        );
      }
      const refunds = await transaction
        .select({
          garmentId: cancellationRefunds.garmentId,
          total: sql<string>`coalesce(sum(${cancellationRefunds.amount}), 0)::text`,
        })
        .from(cancellationRefunds)
        .where(
          inArray(
            cancellationRefunds.garmentId,
            garmentRows.map((garment) => garment.id),
          ),
        )
        .groupBy(cancellationRefunds.garmentId);
      for (const refund of refunds) {
        refundsByGarment.set(
          refund.garmentId,
          parseStoredMoneyMinorUnits(refund.total),
        );
      }
    }

    const financials = new Map<string, GarmentFinancials>();
    for (const garment of garmentRows) {
      const allocated = totalsByGarment.get(garment.id) ?? 0n;
      const refunded = refundsByGarment.get(garment.id) ?? 0n;
      const netPaid = allocated > refunded ? allocated - refunded : 0n;
      if (garment.agreedPrice === null) {
        financials.set(garment.id, {
          agreedPrice: null,
          allocatedAmount: formatMoney(allocated),
          refundedAmount: formatMoney(refunded),
          netPaidAmount: formatMoney(netPaid),
          balanceDue: null,
          creditBalance: null,
        });
        continue;
      }

      const balanceDue = calculateBalanceDue(garment.agreedPrice, netPaid);
      if (balanceDue === null) {
        throw new Error(
          `Missing agreed price while calculating garment ${garment.id}.`,
        );
      }
      financials.set(garment.id, {
        agreedPrice: garment.agreedPrice,
        allocatedAmount: formatMoney(allocated),
        refundedAmount: formatMoney(refunded),
        netPaidAmount: formatMoney(netPaid),
        balanceDue: formatMoney(balanceDue),
        creditBalance: formatMoney(
          netPaid > parseMoneyMinorUnits(garment.agreedPrice)
            ? netPaid - parseMoneyMinorUnits(garment.agreedPrice)
            : 0n,
        ),
      });
    }
    return financials;
  }
}

function requireGarmentFinancials(
  financials: Map<string, GarmentFinancials>,
  garmentId: string,
): GarmentFinancials {
  const result = financials.get(garmentId);
  if (!result) {
    throw new Error(`Missing financial summary for garment ${garmentId}.`);
  }
  return result;
}

export function validateStageMove(
  current: GarmentStage | 'delivered' | 'cancelled',
  target: GarmentStage,
  reworkReason: string | null | undefined,
): void {
  if (current === 'cancelled' || current === 'delivered') {
    throw new BadRequestException(
      'A terminal garment stage must be reversed before progress can change.',
    );
  }
  if (current === target) return;

  if (current === 'alterations') {
    if (target === 'customer_fitting') return;
    throw new BadRequestException(
      'Alterations must return to customer fitting before work proceeds.',
    );
  }
  if (current === 'customer_fitting' && target === 'alterations') return;
  if (current === 'customer_fitting' && target === 'dry_cleaning') {
    throw new BadRequestException(
      'Record the fitting result to approve the fit before dry cleaning.',
    );
  }

  const currentIndex = STAGE_ORDER.indexOf(current);
  const targetIndex = STAGE_ORDER.indexOf(target);
  if (currentIndex < 0 || targetIndex < 0) {
    throw new BadRequestException('The requested garment stage is invalid.');
  }

  if (targetIndex === currentIndex + 1) return;
  if (targetIndex < currentIndex) {
    if (!reworkReason?.trim()) {
      throw new BadRequestException(
        'Moving a garment backward requires a rework reason.',
      );
    }
    return;
  }
  throw new BadRequestException(
    'Complete the required garment stage before moving forward.',
  );
}

export function summarizeOrder(
  orderGarments: ReadonlyArray<{
    stage: GarmentStage | 'cancelled';
    blockedAt: Date | null;
    agreedPrice: string | null;
    dueDate: Date | null;
  }>,
): OrderSummary {
  const stageCounts: OrderSummary['stageCounts'] = {};
  let blockedCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let totalMinorUnits = 0n;
  let dueDate: Date | null = null;

  for (const garment of orderGarments) {
    stageCounts[garment.stage] = (stageCounts[garment.stage] ?? 0) + 1;
    if (garment.blockedAt) blockedCount += 1;
    if (garment.stage === 'delivered') deliveredCount += 1;
    if (garment.stage === 'cancelled') cancelledCount += 1;
    if (garment.agreedPrice !== null) {
      totalMinorUnits += parseMoneyMinorUnits(garment.agreedPrice);
    }
    if (
      garment.dueDate &&
      (!dueDate || garment.dueDate.getTime() < dueDate.getTime())
    ) {
      dueDate = garment.dueDate;
    }
  }

  const garmentCount = orderGarments.length;
  const activeCount = garmentCount - cancelledCount - deliveredCount;
  const remainingCount = garmentCount - cancelledCount;
  const status: OrderSummary['status'] =
    garmentCount > 0 && cancelledCount === garmentCount
      ? 'cancelled'
      : remainingCount > 0 && deliveredCount === remainingCount
        ? 'completed'
        : deliveredCount > 0
          ? 'partially_delivered'
          : activeCount > 0 && blockedCount >= activeCount
            ? 'blocked'
            : 'active';

  return {
    status,
    garmentCount,
    activeCount,
    blockedCount,
    deliveredCount,
    cancelledCount,
    stageCounts,
    totalAgreedPrice: formatMoney(totalMinorUnits),
    dueDate,
  };
}

function validateMoney(value: string): void {
  const minorUnits = parseMoneyMinorUnits(value);
  if (minorUnits > MAX_PRICE_MINOR_UNITS) {
    throw new BadRequestException(
      'Agreed price exceeds the supported maximum.',
    );
  }
}

export function validateAllocationRequest(
  allocations: readonly { garmentId: string; amount: string }[],
  maximumMinorUnits: bigint,
  exceededMessage: string,
): bigint {
  const seenGarmentIds = new Set<string>();
  const total = allocations.reduce((sum, allocation) => {
    if (seenGarmentIds.has(allocation.garmentId)) {
      throw new BadRequestException(
        'A garment can only appear once in an allocation request.',
      );
    }
    seenGarmentIds.add(allocation.garmentId);
    const amount = parseMoneyMinorUnits(allocation.amount);
    if (amount <= 0n) {
      throw new BadRequestException(
        'Payment allocations must be greater than zero.',
      );
    }
    return sum + amount;
  }, 0n);
  if (total > maximumMinorUnits) {
    throw new BadRequestException(exceededMessage);
  }
  return total;
}

export function calculateActivePaymentAllocationTotal(
  allocations: readonly { amount: string; reversed: boolean }[],
): bigint {
  return allocations.reduce(
    (total, allocation) =>
      allocation.reversed
        ? total
        : total + parseMoneyMinorUnits(allocation.amount),
    0n,
  );
}

export function validatePaymentCanBeVoided(
  allocations: readonly { reversalId: string | null }[],
): void {
  if (allocations.some(({ reversalId }) => reversalId === null)) {
    throw new ConflictException(
      'Reverse every payment allocation before voiding the payment.',
    );
  }
}

export function calculateBalanceDue(
  agreedPrice: string | null,
  allocatedMinorUnits: bigint,
): bigint | null {
  if (agreedPrice === null) return null;
  const price = parseMoneyMinorUnits(agreedPrice);
  return price > allocatedMinorUnits ? price - allocatedMinorUnits : 0n;
}

export function validateDeliveryAgreement(
  balanceDueMinorUnits: bigint,
  agreementTerms: string | null,
): void {
  if (balanceDueMinorUnits > 0n && !agreementTerms?.trim()) {
    throw new ConflictException(
      'Record the customer agreement before delivering with a balance due.',
    );
  }
}

export function validateCancellationSettlement(
  amountToRefund: bigint,
  amountRetained: bigint,
  amountPaid: bigint,
): void {
  if (amountToRefund < 0n || amountRetained < 0n) {
    throw new BadRequestException(
      'Refund and retained amounts cannot be negative.',
    );
  }
  if (amountToRefund + amountRetained > amountPaid) {
    throw new BadRequestException(
      'Refund and retained amounts cannot exceed payments allocated to this garment.',
    );
  }
}

export function validateRefundAgainstSettlement(
  alreadyRefunded: bigint,
  refundAmount: bigint,
  agreedRefund: bigint,
): void {
  if (refundAmount <= 0n) {
    throw new BadRequestException('Refund amount must be greater than zero.');
  }
  if (alreadyRefunded + refundAmount > agreedRefund) {
    throw new BadRequestException(
      'Actual refunds cannot exceed the amount agreed in the cancellation settlement.',
    );
  }
}

function parseMoneyMinorUnits(value: string): bigint {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) {
    throw new BadRequestException('Money values must have at most 2 decimals.');
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function parseStoredMoneyMinorUnits(value: string): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      'Stored money values must be non-negative with 2 decimals.',
    );
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function formatMoney(minorUnits: bigint): string {
  return `${minorUnits / 100n}.${(minorUnits % 100n).toString().padStart(2, '0')}`;
}

function normalizeText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value.trim() || null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function parseDateWithTimezone(value: string, label: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!dateOnly && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new BadRequestException(
      `${label} timestamps must include a timezone.`,
    );
  }
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (
    Number.isNaN(date.getTime()) ||
    (dateOnly && date.toISOString().slice(0, 10) !== value)
  ) {
    throw new BadRequestException(`${label} is invalid.`);
  }
  return date;
}
