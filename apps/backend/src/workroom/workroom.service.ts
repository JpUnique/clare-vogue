import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { DatabaseService } from '../database/database.service.js';
import {
  atelierAppointments,
  clientStories,
  customers,
  garments,
  mediaObjects,
  orders,
  purchaseItems,
} from '../database/schema.js';
import type {
  CreateAppointmentDto,
  CreateClientStoryDto,
  CreatePurchaseItemDto,
  ListPurchaseItemsDto,
  UpdateAppointmentDto,
  UpdatePurchaseItemDto,
} from './workroom.dto.js';

@Injectable()
export class WorkroomService {
  constructor(private readonly database: DatabaseService) {}

  async listPurchaseItems(
    user: AuthenticatedUser,
    input: ListPurchaseItemsDto,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      (transaction) =>
        transaction
          .select({
            id: purchaseItems.id,
            orderId: purchaseItems.orderId,
            orderReference: orders.reference,
            name: purchaseItems.name,
            category: purchaseItems.category,
            quantity: purchaseItems.quantity,
            unit: purchaseItems.unit,
            unitPrice: purchaseItems.unitPrice,
            supplier: purchaseItems.supplier,
            status: purchaseItems.status,
            createdAt: purchaseItems.createdAt,
            updatedAt: purchaseItems.updatedAt,
          })
          .from(purchaseItems)
          .leftJoin(orders, eq(purchaseItems.orderId, orders.id))
          .where(
            input.status ? eq(purchaseItems.status, input.status) : undefined,
          )
          .orderBy(asc(purchaseItems.status), desc(purchaseItems.updatedAt)),
    );
  }

  async createPurchaseItem(
    user: AuthenticatedUser,
    input: CreatePurchaseItemDto,
  ) {
    const name = input.name.trim();
    const category = input.category.trim();
    const unit = input.unit.trim();
    if (!name || !category || !unit) {
      throw new BadRequestException(
        'Name, category, and unit must not be empty.',
      );
    }
    if (Number(input.quantity) <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        if (input.orderId) {
          const [order] = await transaction
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.id, input.orderId))
            .limit(1);
          if (!order) throw new NotFoundException('Order not found.');
        }

        const [item] = await transaction
          .insert(purchaseItems)
          .values({
            id: randomUUID(),
            businessId,
            orderId: input.orderId ?? null,
            name,
            category,
            quantity: input.quantity,
            unit,
            unitPrice: input.unitPrice,
            supplier: normalizeOptionalText(input.supplier),
            createdBy: user.id,
          })
          .returning();
        return item;
      },
    );
  }

  async updatePurchaseItem(
    user: AuthenticatedUser,
    itemId: string,
    input: UpdatePurchaseItemDto,
  ) {
    if (!input.status) {
      throw new BadRequestException(
        'Provide a purchase item status to update.',
      );
    }
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const [item] = await transaction
          .update(purchaseItems)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(purchaseItems.id, itemId))
          .returning();
        if (!item) throw new NotFoundException('Purchase item not found.');
        return item;
      },
    );
  }

  async listAppointments(user: AuthenticatedUser) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      (transaction) =>
        transaction
          .select({
            id: atelierAppointments.id,
            customerId: atelierAppointments.customerId,
            customerName: customers.name,
            orderId: atelierAppointments.orderId,
            orderReference: orders.reference,
            garmentId: atelierAppointments.garmentId,
            type: atelierAppointments.type,
            scheduledAt: atelierAppointments.scheduledAt,
            status: atelierAppointments.status,
            notes: atelierAppointments.notes,
            createdAt: atelierAppointments.createdAt,
            updatedAt: atelierAppointments.updatedAt,
          })
          .from(atelierAppointments)
          .innerJoin(
            customers,
            eq(atelierAppointments.customerId, customers.id),
          )
          .leftJoin(orders, eq(atelierAppointments.orderId, orders.id))
          .orderBy(asc(atelierAppointments.scheduledAt)),
    );
  }

  async createAppointment(
    user: AuthenticatedUser,
    input: CreateAppointmentDto,
  ) {
    if (input.garmentId && !input.orderId) {
      throw new BadRequestException(
        'An appointment garment must belong to a linked order.',
      );
    }
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Scheduled date and time are invalid.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const [customer] = await transaction
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.id, input.customerId))
          .limit(1);
        if (!customer) throw new NotFoundException('Customer not found.');

        if (input.orderId) {
          const [order] = await transaction
            .select({ customerId: orders.customerId })
            .from(orders)
            .where(eq(orders.id, input.orderId))
            .limit(1);
          if (!order || order.customerId !== input.customerId) {
            throw new BadRequestException(
              'The selected order must belong to the selected customer.',
            );
          }
        }
        if (input.garmentId) {
          const [garment] = await transaction
            .select({ id: garments.id })
            .from(garments)
            .where(
              and(
                eq(garments.id, input.garmentId),
                eq(garments.orderId, input.orderId!),
                eq(garments.customerId, input.customerId),
              ),
            )
            .limit(1);
          if (!garment) throw new NotFoundException('Garment not found.');
        }

        const [appointment] = await transaction
          .insert(atelierAppointments)
          .values({
            id: randomUUID(),
            businessId,
            customerId: input.customerId,
            orderId: input.orderId ?? null,
            garmentId: input.garmentId ?? null,
            type: input.type,
            scheduledAt,
            status: input.status ?? 'needs_confirmation',
            notes: normalizeOptionalText(input.notes),
            createdBy: user.id,
          })
          .returning();
        return appointment;
      },
    );
  }

  async updateAppointment(
    user: AuthenticatedUser,
    appointmentId: string,
    input: UpdateAppointmentDto,
  ) {
    if (
      input.status === undefined &&
      input.scheduledAt === undefined &&
      input.notes === undefined
    ) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const [appointment] = await transaction
          .update(atelierAppointments)
          .set({
            ...(input.status !== undefined && { status: input.status }),
            ...(input.scheduledAt !== undefined && {
              scheduledAt: new Date(input.scheduledAt),
            }),
            ...(input.notes !== undefined && {
              notes: normalizeOptionalText(input.notes),
            }),
            updatedAt: new Date(),
          })
          .where(eq(atelierAppointments.id, appointmentId))
          .returning();
        if (!appointment) throw new NotFoundException('Appointment not found.');
        return appointment;
      },
    );
  }

  async listClientStories(user: AuthenticatedUser) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const rows = await transaction
          .select({
            id: clientStories.id,
            customerId: clientStories.customerId,
            customerName: customers.name,
            orderId: clientStories.orderId,
            orderReference: orders.reference,
            garmentId: clientStories.garmentId,
            garmentName: garments.description,
            mediaId: clientStories.mediaId,
            mediaStatus: mediaObjects.status,
            rating: clientStories.rating,
            feedback: clientStories.feedback,
            createdAt: clientStories.createdAt,
          })
          .from(clientStories)
          .innerJoin(customers, eq(clientStories.customerId, customers.id))
          .innerJoin(orders, eq(clientStories.orderId, orders.id))
          .innerJoin(garments, eq(clientStories.garmentId, garments.id))
          .innerJoin(mediaObjects, eq(clientStories.mediaId, mediaObjects.id))
          .orderBy(desc(clientStories.createdAt), desc(clientStories.id));

        return rows.map(({ mediaStatus, ...story }) => ({
          ...story,
          videoAvailable: mediaStatus === 'available',
        }));
      },
    );
  }

  async createClientStory(
    user: AuthenticatedUser,
    input: CreateClientStoryDto,
  ) {
    const feedback = input.feedback.trim();
    if (!feedback) {
      throw new BadRequestException('Customer feedback cannot be empty.');
    }

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const [garment] = await transaction
          .select({
            id: garments.id,
            orderId: garments.orderId,
            customerId: garments.customerId,
          })
          .from(garments)
          .where(eq(garments.id, input.garmentId))
          .limit(1);
        if (!garment || garment.orderId !== input.orderId) {
          throw new NotFoundException('Garment or order was not found.');
        }

        const [media] = await transaction
          .select({
            id: mediaObjects.id,
            garmentId: mediaObjects.garmentId,
            status: mediaObjects.status,
          })
          .from(mediaObjects)
          .where(eq(mediaObjects.id, input.mediaId))
          .limit(1);
        if (!media || media.garmentId !== garment.id) {
          throw new NotFoundException('Garment video was not found.');
        }
        if (media.status !== 'available') {
          throw new BadRequestException(
            'Complete the private video upload before recording a client story.',
          );
        }

        const [existingStory] = await transaction
          .select({ id: clientStories.id })
          .from(clientStories)
          .where(eq(clientStories.mediaId, media.id))
          .limit(1);
        if (existingStory) {
          throw new ConflictException(
            'A client story already exists for this video.',
          );
        }

        const [story] = await transaction
          .insert(clientStories)
          .values({
            id: randomUUID(),
            businessId,
            customerId: garment.customerId,
            orderId: garment.orderId,
            garmentId: garment.id,
            mediaId: media.id,
            rating: input.rating,
            feedback,
            createdBy: user.id,
          })
          .onConflictDoNothing({
            target: [clientStories.businessId, clientStories.mediaId],
          })
          .returning();
        if (!story) {
          throw new ConflictException(
            'A client story already exists for this video.',
          );
        }
        return story;
      },
    );
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}
