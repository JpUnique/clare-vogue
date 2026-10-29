import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgPolicy,
  pgTable,
  check,
  numeric,
  foreignKey,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const currentUserId = sql`nullif(current_setting('app.current_user_id', true), '')`;
const currentBusinessId = sql`nullif(current_setting('app.current_business_id', true), '')`;

export const membershipRole = pgEnum('membership_role', ['owner', 'staff']);
export const membershipStatus = pgEnum('membership_status', [
  'active',
  'suspended',
  'revoked',
]);
export const customerPreferredContact = pgEnum('customer_preferred_contact', [
  'phone',
  'email',
  'whatsapp',
  'in_person',
  'other',
]);
export const customerEventType = pgEnum('customer_event_type', [
  'created',
  'updated',
  'archived',
  'restored',
]);
export const measurementUnit = pgEnum('measurement_unit', ['cm', 'in']);
export const materialSource = pgEnum('material_source', [
  'customer',
  'business',
  'unknown',
]);
export const garmentStage = pgEnum('garment_stage', [
  'request_confirmed',
  'measurements_recorded',
  'material_pending',
  'ready_to_cut',
  'cutting',
  'sewing',
  'customer_fitting',
  'alterations',
  'dry_cleaning',
  'packaging',
  'ready_for_delivery',
  'payment_check',
  'customer_notified',
  'delivery_arranged',
  'delivered',
  'cancelled',
]);
export const garmentProgressEventType = pgEnum('garment_progress_event_type', [
  'created',
  'progress_logged',
  'stage_changed',
  'blocked',
  'unblocked',
  'cancelled',
  'fitting_recorded',
  'delivery_recorded',
  'delivery_reversed',
]);
export const fittingOutcome = pgEnum('fitting_outcome', [
  'pending',
  'approved',
  'alterations_required',
]);
export const paymentMethod = pgEnum('payment_method', [
  'cash',
  'bank_transfer',
  'card',
  'mobile_money',
  'other',
]);
export const deliveryMethod = pgEnum('delivery_method', [
  'customer_collection',
  'physical_delivery',
]);
export const deliveryEventType = pgEnum('delivery_event_type', [
  'delivered',
  'reversed',
]);
export const refundMethod = pgEnum('refund_method', [
  'cash',
  'bank_transfer',
  'card',
  'mobile_money',
  'other',
]);

export interface CustomMeasurementValue {
  name: string;
  value: string;
}

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('users_self_select', {
      for: 'select',
      using: sql`${table.id}::text = ${currentUserId}`,
    }),
  ],
).enableRLS();

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    timeZone: varchar('time_zone', { length: 100 })
      .notNull()
      .default('Africa/Lagos'),
    currencyCode: varchar('currency_code', { length: 3 })
      .notNull()
      .default('NGN'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('businesses_current_tenant', {
      for: 'all',
      using: sql`${table.id}::text = ${currentBusinessId}`,
      withCheck: sql`${table.id}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const businessMemberships = pgTable(
  'business_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: membershipRole('role').notNull(),
    status: membershipStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('business_memberships_business_user_unique').on(
      table.businessId,
      table.userId,
    ),
    pgPolicy('business_memberships_authorized_select', {
      for: 'select',
      using: sql`(
        ${table.userId}::text = ${currentUserId}
        OR ${table.businessId}::text = ${currentBusinessId}
      )`,
    }),
  ],
).enableRLS();

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    email: varchar('email', { length: 320 }),
    preferredContact: customerPreferredContact('preferred_contact'),
    internalNotes: text('internal_notes'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('customers_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    index('customers_business_updated_idx').on(
      table.businessId,
      table.updatedAt,
      table.id,
    ),
    check(
      'customers_name_nonempty_check',
      sql`length(btrim(${table.name})) > 0`,
    ),
    pgPolicy('customers_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const measurementSets = pgTable(
  'measurement_sets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    unit: measurementUnit('unit').notNull(),
    templateVersion: varchar('template_version', { length: 20 })
      .notNull()
      .default('ladies-dress-v1'),
    bust: numeric('bust', { precision: 8, scale: 2 }),
    waist: numeric('waist', { precision: 8, scale: 2 }),
    hips: numeric('hips', { precision: 8, scale: 2 }),
    shoulderWidth: numeric('shoulder_width', { precision: 8, scale: 2 }),
    shoulderToWaist: numeric('shoulder_to_waist', {
      precision: 8,
      scale: 2,
    }),
    sleeveLength: numeric('sleeve_length', { precision: 8, scale: 2 }),
    armhole: numeric('armhole', { precision: 8, scale: 2 }),
    desiredDressLength: numeric('desired_dress_length', {
      precision: 8,
      scale: 2,
    }),
    customMeasurements: jsonb('custom_measurements')
      .$type<CustomMeasurementValue[]>()
      .notNull()
      .default([]),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('measurement_sets_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    uniqueIndex('measurement_sets_business_id_customer_id_id_unique').on(
      table.businessId,
      table.customerId,
      table.id,
    ),
    index('measurement_sets_customer_measured_at_idx').on(
      table.businessId,
      table.customerId,
      table.measuredAt,
    ),
    foreignKey({
      columns: [table.businessId, table.customerId],
      foreignColumns: [customers.businessId, customers.id],
      name: 'measurement_sets_business_customer_fk',
    }).onDelete('restrict'),
    check(
      'measurement_sets_bust_positive_check',
      sql`${table.bust} is null or ${table.bust} > 0`,
    ),
    check(
      'measurement_sets_waist_positive_check',
      sql`${table.waist} is null or ${table.waist} > 0`,
    ),
    check(
      'measurement_sets_hips_positive_check',
      sql`${table.hips} is null or ${table.hips} > 0`,
    ),
    check(
      'measurement_sets_shoulder_width_positive_check',
      sql`${table.shoulderWidth} is null or ${table.shoulderWidth} > 0`,
    ),
    check(
      'measurement_sets_shoulder_to_waist_positive_check',
      sql`${table.shoulderToWaist} is null or ${table.shoulderToWaist} > 0`,
    ),
    check(
      'measurement_sets_sleeve_length_positive_check',
      sql`${table.sleeveLength} is null or ${table.sleeveLength} > 0`,
    ),
    check(
      'measurement_sets_armhole_positive_check',
      sql`${table.armhole} is null or ${table.armhole} > 0`,
    ),
    check(
      'measurement_sets_dress_length_positive_check',
      sql`${table.desiredDressLength} is null or ${table.desiredDressLength} > 0`,
    ),
    check(
      'measurement_sets_custom_array_check',
      sql`jsonb_typeof(${table.customMeasurements}) = 'array' and jsonb_array_length(${table.customMeasurements}) <= 30`,
    ),
    pgPolicy('measurement_sets_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const customerEvents = pgTable(
  'customer_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    eventType: customerEventType('event_type').notNull(),
    changedFields: jsonb('changed_fields')
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('customer_events_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    uniqueIndex('customer_events_business_id_customer_id_id_unique').on(
      table.businessId,
      table.customerId,
      table.id,
    ),
    foreignKey({
      columns: [table.businessId, table.customerId],
      foreignColumns: [customers.businessId, customers.id],
      name: 'customer_events_business_customer_fk',
    }).onDelete('restrict'),
    pgPolicy('customer_events_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull(),
    reference: varchar('reference', { length: 20 }).notNull(),
    orderDate: timestamp('order_date', { withTimezone: true })
      .notNull()
      .defaultNow(),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('orders_business_id_id_unique').on(table.businessId, table.id),
    uniqueIndex('orders_business_customer_id_id_unique').on(
      table.businessId,
      table.customerId,
      table.id,
    ),
    uniqueIndex('orders_business_reference_unique').on(
      table.businessId,
      table.reference,
    ),
    index('orders_business_date_idx').on(
      table.businessId,
      table.orderDate,
      table.id,
    ),
    foreignKey({
      columns: [table.businessId, table.customerId],
      foreignColumns: [customers.businessId, customers.id],
      name: 'orders_business_customer_fk',
    }).onDelete('restrict'),
    pgPolicy('orders_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const garments = pgTable(
  'garments',
  {
    id: uuid('id').primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').notNull(),
    customerId: uuid('customer_id').notNull(),
    description: varchar('description', { length: 300 }).notNull(),
    instructions: text('instructions'),
    materialSource: materialSource('material_source')
      .notNull()
      .default('unknown'),
    materialReadyAt: timestamp('material_ready_at', { withTimezone: true }),
    materialNotes: text('material_notes'),
    stage: garmentStage('stage').notNull().default('request_confirmed'),
    nextAction: varchar('next_action', { length: 500 }),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    blockingReason: text('blocking_reason'),
    agreedPrice: numeric('agreed_price', { precision: 12, scale: 2 }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    measurementSetId: uuid('measurement_set_id'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('garments_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    uniqueIndex('garments_business_order_id_unique').on(
      table.businessId,
      table.orderId,
      table.id,
    ),
    index('garments_business_order_idx').on(
      table.businessId,
      table.orderId,
      table.createdAt,
    ),
    index('garments_business_stage_due_idx').on(
      table.businessId,
      table.stage,
      table.dueDate,
    ),
    foreignKey({
      columns: [table.businessId, table.orderId, table.customerId],
      foreignColumns: [orders.businessId, orders.id, orders.customerId],
      name: 'garments_business_order_customer_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.businessId, table.customerId, table.measurementSetId],
      foreignColumns: [
        measurementSets.businessId,
        measurementSets.customerId,
        measurementSets.id,
      ],
      name: 'garments_business_customer_measurement_fk',
    }).onDelete('restrict'),
    check(
      'garments_description_nonempty_check',
      sql`length(btrim(${table.description})) > 0`,
    ),
    check(
      'garments_price_nonnegative_check',
      sql`${table.agreedPrice} is null or ${table.agreedPrice} >= 0`,
    ),
    check(
      'garments_block_state_check',
      sql`(${table.blockedAt} is null and ${table.blockingReason} is null) or (${table.blockedAt} is not null and length(btrim(${table.blockingReason})) > 0)`,
    ),
    check(
      'garments_cancellation_state_check',
      sql`(${table.cancelledAt} is null and ${table.cancellationReason} is null) or (${table.cancelledAt} is not null and length(btrim(${table.cancellationReason})) > 0)`,
    ),
    check(
      'garments_terminal_stage_check',
      sql`(${table.stage} = 'cancelled' and ${table.cancelledAt} is not null) or (${table.stage} <> 'cancelled' and ${table.cancelledAt} is null)`,
    ),
    pgPolicy('garments_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const garmentProgressEvents = pgTable(
  'garment_progress_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    garmentId: uuid('garment_id').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    eventType: garmentProgressEventType('event_type').notNull(),
    fromStage: garmentStage('from_stage'),
    toStage: garmentStage('to_stage'),
    note: text('note'),
    nextAction: varchar('next_action', { length: 500 }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('garment_progress_business_garment_created_idx').on(
      table.businessId,
      table.garmentId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.businessId, table.garmentId],
      foreignColumns: [garments.businessId, garments.id],
      name: 'garment_progress_business_garment_fk',
    }).onDelete('restrict'),
    pgPolicy('garment_progress_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const fittings = pgTable(
  'fittings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    garmentId: uuid('garment_id').notNull(),
    outcome: fittingOutcome('outcome').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestedAlterations: text('requested_alterations'),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('fittings_business_garment_completed_idx').on(
      table.businessId,
      table.garmentId,
      table.completedAt,
    ),
    foreignKey({
      columns: [table.businessId, table.garmentId],
      foreignColumns: [garments.businessId, garments.id],
      name: 'fittings_business_garment_fk',
    }).onDelete('restrict'),
    pgPolicy('fittings_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const garmentPriceEvents = pgTable(
  'garment_price_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    garmentId: uuid('garment_id').notNull(),
    previousPrice: numeric('previous_price', { precision: 12, scale: 2 }),
    newPrice: numeric('new_price', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('garment_price_events_business_garment_created_idx').on(
      table.businessId,
      table.garmentId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.businessId, table.garmentId],
      foreignColumns: [garments.businessId, garments.id],
      name: 'garment_price_events_business_garment_fk',
    }).onDelete('restrict'),
    check('garment_price_events_new_price_check', sql`${table.newPrice} >= 0`),
    check(
      'garment_price_events_reason_check',
      sql`length(btrim(${table.reason})) > 0`,
    ),
    pgPolicy('garment_price_events_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const cancellationSettlements = pgTable(
  'cancellation_settlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    garmentId: uuid('garment_id').notNull(),
    amountToRefund: numeric('amount_to_refund', {
      precision: 12,
      scale: 2,
    }).notNull(),
    amountRetained: numeric('amount_retained', {
      precision: 12,
      scale: 2,
    }).notNull(),
    reason: text('reason').notNull(),
    customerAgreement: text('customer_agreement').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('cancellation_settlements_business_garment_unique').on(
      table.businessId,
      table.garmentId,
    ),
    uniqueIndex('cancellation_settlements_business_garment_id_unique').on(
      table.businessId,
      table.garmentId,
      table.id,
    ),
    foreignKey({
      columns: [table.businessId, table.garmentId],
      foreignColumns: [garments.businessId, garments.id],
      name: 'cancellation_settlements_business_garment_fk',
    }).onDelete('restrict'),
    check(
      'cancellation_settlements_refund_nonnegative_check',
      sql`${table.amountToRefund} >= 0`,
    ),
    check(
      'cancellation_settlements_retained_nonnegative_check',
      sql`${table.amountRetained} >= 0`,
    ),
    check(
      'cancellation_settlements_reason_check',
      sql`length(btrim(${table.reason})) > 0`,
    ),
    check(
      'cancellation_settlements_agreement_check',
      sql`length(btrim(${table.customerAgreement})) > 0`,
    ),
    pgPolicy('cancellation_settlements_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const cancellationRefunds = pgTable(
  'cancellation_refunds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    garmentId: uuid('garment_id').notNull(),
    settlementId: uuid('settlement_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: refundMethod('method').notNull(),
    reference: varchar('reference', { length: 200 }),
    note: text('note'),
    refundedAt: timestamp('refunded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cancellation_refunds_business_garment_refunded_idx').on(
      table.businessId,
      table.garmentId,
      table.refundedAt,
    ),
    foreignKey({
      columns: [table.businessId, table.garmentId, table.settlementId],
      foreignColumns: [
        cancellationSettlements.businessId,
        cancellationSettlements.garmentId,
        cancellationSettlements.id,
      ],
      name: 'cancellation_refunds_settlement_fk',
    }).onDelete('restrict'),
    check(
      'cancellation_refunds_amount_positive_check',
      sql`${table.amount} > 0`,
    ),
    pgPolicy('cancellation_refunds_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: paymentMethod('method').notNull(),
    reference: varchar('reference', { length: 200 }),
    note: text('note'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    receivedBy: uuid('received_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payments_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    uniqueIndex('payments_business_order_id_unique').on(
      table.businessId,
      table.orderId,
      table.id,
    ),
    index('payments_business_order_received_idx').on(
      table.businessId,
      table.orderId,
      table.receivedAt,
    ),
    foreignKey({
      columns: [table.businessId, table.orderId],
      foreignColumns: [orders.businessId, orders.id],
      name: 'payments_business_order_fk',
    }).onDelete('restrict'),
    check('payments_amount_positive_check', sql`${table.amount} > 0`),
    pgPolicy('payments_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').notNull(),
    paymentId: uuid('payment_id').notNull(),
    garmentId: uuid('garment_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    allocatedBy: uuid('allocated_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_allocations_business_id_id_unique').on(
      table.businessId,
      table.id,
    ),
    uniqueIndex('payment_allocations_reversal_target_unique').on(
      table.businessId,
      table.orderId,
      table.paymentId,
      table.garmentId,
      table.id,
    ),
    index('payment_allocations_business_garment_idx').on(
      table.businessId,
      table.garmentId,
      table.createdAt,
    ),
    index('payment_allocations_business_payment_idx').on(
      table.businessId,
      table.paymentId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.businessId, table.orderId, table.paymentId],
      foreignColumns: [payments.businessId, payments.orderId, payments.id],
      name: 'payment_allocations_business_payment_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.businessId, table.orderId, table.garmentId],
      foreignColumns: [garments.businessId, garments.orderId, garments.id],
      name: 'payment_allocations_business_garment_fk',
    }).onDelete('restrict'),
    check(
      'payment_allocations_amount_positive_check',
      sql`${table.amount} > 0`,
    ),
    pgPolicy('payment_allocations_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const paymentAllocationReversals = pgTable(
  'payment_allocation_reversals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').notNull(),
    paymentId: uuid('payment_id').notNull(),
    garmentId: uuid('garment_id').notNull(),
    allocationId: uuid('allocation_id').notNull(),
    reason: text('reason').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_allocation_reversals_once_unique').on(
      table.businessId,
      table.allocationId,
    ),
    index('payment_allocation_reversals_payment_idx').on(
      table.businessId,
      table.paymentId,
      table.createdAt,
    ),
    index('payment_allocation_reversals_garment_idx').on(
      table.businessId,
      table.garmentId,
      table.createdAt,
    ),
    foreignKey({
      columns: [
        table.businessId,
        table.orderId,
        table.paymentId,
        table.garmentId,
        table.allocationId,
      ],
      foreignColumns: [
        paymentAllocations.businessId,
        paymentAllocations.orderId,
        paymentAllocations.paymentId,
        paymentAllocations.garmentId,
        paymentAllocations.id,
      ],
      name: 'payment_allocation_reversals_target_fk',
    }).onDelete('restrict'),
    check(
      'payment_allocation_reversals_reason_check',
      sql`length(btrim(${table.reason})) > 0`,
    ),
    pgPolicy('payment_allocation_reversals_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const paymentVoids = pgTable(
  'payment_voids',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').notNull(),
    paymentId: uuid('payment_id').notNull(),
    reason: text('reason').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_voids_once_unique').on(
      table.businessId,
      table.paymentId,
    ),
    foreignKey({
      columns: [table.businessId, table.orderId, table.paymentId],
      foreignColumns: [payments.businessId, payments.orderId, payments.id],
      name: 'payment_voids_payment_fk',
    }).onDelete('restrict'),
    check(
      'payment_voids_reason_check',
      sql`length(btrim(${table.reason})) > 0`,
    ),
    pgPolicy('payment_voids_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();

export const deliveryEvents = pgTable(
  'delivery_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    garmentId: uuid('garment_id').notNull(),
    eventType: deliveryEventType('event_type').notNull(),
    method: deliveryMethod('method'),
    recipientName: varchar('recipient_name', { length: 200 }),
    notes: text('notes'),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    balanceAtDelivery: numeric('balance_at_delivery', {
      precision: 12,
      scale: 2,
    }),
    agreementTerms: text('agreement_terms'),
    agreedFollowUpAt: timestamp('agreed_follow_up_at', { withTimezone: true }),
    reversesDeliveryEventId: uuid('reverses_delivery_event_id'),
    correctionReason: text('correction_reason'),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('delivery_events_business_garment_id_unique').on(
      table.businessId,
      table.garmentId,
      table.id,
    ),
    uniqueIndex('delivery_events_single_reversal_unique')
      .on(table.businessId, table.garmentId, table.reversesDeliveryEventId)
      .where(sql`${table.reversesDeliveryEventId} is not null`),
    index('delivery_events_business_garment_created_idx').on(
      table.businessId,
      table.garmentId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.businessId, table.garmentId],
      foreignColumns: [garments.businessId, garments.id],
      name: 'delivery_events_business_garment_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [
        table.businessId,
        table.garmentId,
        table.reversesDeliveryEventId,
      ],
      foreignColumns: [table.businessId, table.garmentId, table.id],
      name: 'delivery_events_reversal_target_fk',
    }).onDelete('restrict'),
    check(
      'delivery_events_payload_check',
      sql`(
        ${table.eventType} = 'delivered'
        and ${table.method} is not null
        and ${table.reversesDeliveryEventId} is null
        and ${table.correctionReason} is null
        and ${table.balanceAtDelivery} is not null
        and ${table.balanceAtDelivery} >= 0
        and (
          ${table.balanceAtDelivery} <= 0
          or (
            ${table.agreementTerms} is not null
            and length(btrim(${table.agreementTerms})) > 0
          )
        )
      ) or (
        ${table.eventType} = 'reversed'
        and ${table.method} is null
        and ${table.reversesDeliveryEventId} is not null
        and ${table.correctionReason} is not null
        and length(btrim(${table.correctionReason})) > 0
      )`,
    ),
    pgPolicy('delivery_events_current_tenant', {
      for: 'all',
      using: sql`${table.businessId}::text = ${currentBusinessId}`,
      withCheck: sql`${table.businessId}::text = ${currentBusinessId}`,
    }),
  ],
).enableRLS();
