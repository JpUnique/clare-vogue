import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const supportedMediaTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
] as const;

export type SupportedMediaType = (typeof supportedMediaTypes)[number];

export class RequestMediaUploadDto {
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsIn(supportedMediaTypes)
  contentType!: SupportedMediaType;

  @IsInt()
  @Min(1)
  @Max(200 * 1024 * 1024)
  fileSizeBytes!: number;
}

export class GrantPortfolioConsentDto {
  @IsISO8601({ strict: true })
  consentedAt!: string;

  @IsIn(['verbal', 'written', 'electronic'])
  method!: 'verbal' | 'written' | 'electronic';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class WithdrawPortfolioConsentDto {
  @IsISO8601({ strict: true })
  withdrawnAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
