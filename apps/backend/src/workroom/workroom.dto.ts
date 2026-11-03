import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const QUANTITY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

export class CreatePurchaseItemDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsNumberString()
  @Matches(QUANTITY_PATTERN)
  quantity!: string;

  @IsString()
  @MaxLength(40)
  unit!: string;

  @IsNumberString()
  @Matches(MONEY_PATTERN)
  unitPrice!: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(200)
  supplier?: string | null;

  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class UpdatePurchaseItemDto {
  @IsOptional()
  @IsIn(['to_buy', 'ordered', 'received'])
  status?: 'to_buy' | 'ordered' | 'received';
}

export class ListPurchaseItemsDto {
  @IsOptional()
  @IsIn(['to_buy', 'ordered', 'received'])
  status?: 'to_buy' | 'ordered' | 'received';
}

export class CreateAppointmentDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  garmentId?: string;

  @IsIn([
    'consultation',
    'first_fitting',
    'progress_fitting',
    'final_fitting',
    'pickup',
  ])
  type!:
    | 'consultation'
    | 'first_fitting'
    | 'progress_fitting'
    | 'final_fitting'
    | 'pickup';

  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i)
  scheduledAt!: string;

  @IsOptional()
  @IsIn(['needs_confirmation', 'confirmed'])
  status?: 'needs_confirmation' | 'confirmed';

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsIn(['needs_confirmation', 'confirmed', 'completed', 'cancelled'])
  status?: 'needs_confirmation' | 'confirmed' | 'completed' | 'cancelled';

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i)
  scheduledAt?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class CreateClientStoryDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  garmentId!: string;

  @IsUUID()
  mediaId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MaxLength(5000)
  feedback!: string;
}
