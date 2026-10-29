import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MEASUREMENT_PATTERN = /^(?=.*[1-9])\d{1,6}(?:\.\d{1,2})?$/;

export class CreateCustomerDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsIn(['phone', 'email', 'whatsapp', 'in_person', 'other'])
  preferredContact?:
    'phone' | 'email' | 'whatsapp' | 'in_person' | 'other' | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  internalNotes?: string | null;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsIn(['phone', 'email', 'whatsapp', 'in_person', 'other'])
  preferredContact?:
    'phone' | 'email' | 'whatsapp' | 'in_person' | 'other' | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  internalNotes?: string | null;
}

export class ListCustomersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  includeArchived?: string;

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

export class CustomMeasurementDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsString()
  @MaxLength(10)
  @Matches(MEASUREMENT_PATTERN)
  value!: string;
}

export class CreateMeasurementSetDto {
  @IsISO8601({ strict: true })
  measuredAt!: string;

  @IsIn(['cm', 'in'])
  unit!: 'cm' | 'in';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  templateVersion?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  bust?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  waist?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  hips?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  shoulderWidth?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  shoulderToWaist?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  sleeveLength?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  armhole?: string;

  @IsOptional()
  @IsString()
  @Matches(MEASUREMENT_PATTERN)
  desiredDressLength?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CustomMeasurementDto)
  customMeasurements: CustomMeasurementDto[] = [];

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
