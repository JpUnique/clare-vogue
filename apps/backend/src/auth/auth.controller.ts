import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';
import {
  UsernameAvailabilityDto,
  UsernamePasswordResetDto,
  UsernameSignInDto,
  UsernameSignUpDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('username-sign-in')
  @Public()
  @ApiOperation({ summary: 'Sign in using a username and password' })
  signInWithUsername(@Body() input: UsernameSignInDto) {
    return this.auth.signInWithUsername(input.username, input.password);
  }

  @Post('username-availability')
  @Public()
  @ApiOperation({ summary: 'Check whether a username can be registered' })
  async checkUsernameAvailability(
    @Body() input: UsernameAvailabilityDto,
  ): Promise<{ available: boolean }> {
    return {
      available: await this.auth.isUsernameAvailable(input.username),
    };
  }

  @Post('username-sign-up')
  @Public()
  @ApiOperation({
    summary: 'Create an account with username and phone details',
  })
  signUpWithUsername(@Body() input: UsernameSignUpDto) {
    return this.auth.signUpWithUsername(input);
  }

  @Post('password-reset')
  @Public()
  @ApiOperation({ summary: 'Send a password reset email by username' })
  async requestPasswordReset(@Body() input: UsernamePasswordResetDto) {
    await this.auth.requestUsernamePasswordReset(input.username);
    return {
      message:
        'If an account exists for that username or email, a reset link is on its way.',
    };
  }
}
