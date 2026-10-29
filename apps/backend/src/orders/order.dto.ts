import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  IsNumberString,
  Max,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const PRICE_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

export class CreateGarmentDto {
  @IsString()
  @MaxLength(300)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @IsOptional()
  @IsIn(['customer', 'business', 'unknown'])
  materialSource?: 'customer' | 'business' | 'unknown';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  materialNotes?: string;

  @IsOptional()
  @Matches(PRICE_PATTERN)
  agreedPrice?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  measurementSetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAction?: string;
}

export class CreateOrderDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  orderDate?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  internalNotes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateGarmentDto)
  garments!: CreateGarmentDto[];
}

export class ListOrdersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export class RecordProgressDto {
  @IsIn([
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
  ])
  stage!: GarmentStage;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  note?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(500)
  nextAction?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  reworkReason?: string | null;
}

export class BlockGarmentDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class CancelGarmentDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class RecordFittingDto {
  @IsIn(['pending', 'approved', 'alterations_required'])
  outcome!: FittingOutcome;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  requestedAlterations?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  completedAt?: string;
}

export class PaymentAllocationDto {
  @IsUUID()
  garmentId!: string;

  @IsNumberString()
  @Matches(PRICE_PATTERN)
  amount!: string;
}

export class RecordPaymentDto {
  @IsNumberString()
  @Matches(PRICE_PATTERN)
  amount!: string;

  @IsIn(['cash', 'bank_transfer', 'card', 'mobile_money', 'other'])
  method!: 'cash' | 'bank_transfer' | 'card' | 'mobile_money' | 'other';

  @IsOptional()
  @IsISO8601({ strict: true })
  receivedAt?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(200)
  reference?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  note?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];
}

export class AllocatePaymentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}

export class FinancialCorrectionDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(1000)
  reason!: string;
}

export class RecordDeliveryDto {
  @IsIn(['customer_collection', 'physical_delivery'])
  method!: 'customer_collection' | 'physical_delivery';

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(200)
  recipientName?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  occurredAt?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  agreementTerms?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  agreedFollowUpAt?: string;
}

export class ConfirmGarmentPriceDto {
  @Matches(PRICE_PATTERN)
  agreedPrice!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class AdjustGarmentPriceDto {
  @Matches(PRICE_PATTERN)
  agreedPrice!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class CancellationSettlementDto {
  @Matches(PRICE_PATTERN)
  amountToRefund!: string;

  @Matches(PRICE_PATTERN)
  amountRetained!: string;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsString()
  @MaxLength(5000)
  customerAgreement!: string;
}

export class RecordCancellationRefundDto {
  @Matches(PRICE_PATTERN)
  amount!: string;

  @IsIn(['cash', 'bank_transfer', 'card', 'mobile_money', 'other'])
  method!: 'cash' | 'bank_transfer' | 'card' | 'mobile_money' | 'other';

  @IsOptional()
  @IsISO8601({ strict: true })
  refundedAt?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(200)
  reference?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  note?: string | null;
}

export class ReverseDeliveryDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export type GarmentStage =
  | 'request_confirmed'
  | 'measurements_recorded'
  | 'material_pending'
  | 'ready_to_cut'
  | 'cutting'
  | 'sewing'
  | 'customer_fitting'
  | 'alterations'
  | 'dry_cleaning'
  | 'packaging'
  | 'ready_for_delivery'
  | 'payment_check'
  | 'customer_notified'
  | 'delivery_arranged'
  | 'delivered';

export type OrderSummaryStatus =
  'active' | 'blocked' | 'partially_delivered' | 'completed' | 'cancelled';

export type FittingOutcome = 'pending' | 'approved' | 'alterations_required';
