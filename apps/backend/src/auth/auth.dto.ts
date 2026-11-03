import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UsernameSignInDto {
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  @Matches(/^(?:[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}|[^\s@]+@[^\s@]+\.[^\s@]+)$/)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class UsernameSignUpDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/)
  username!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @IsString()
  @Matches(/^\+[1-9][0-9]{7,14}$/)
  phone!: string;
}

export class UsernameAvailabilityDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/)
  username!: string;
}

export class UsernamePasswordResetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  @Matches(/^(?:[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}|[^\s@]+@[^\s@]+\.[^\s@]+)$/)
  username!: string;
}
