import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service.js';
import { Public } from '../auth/public.decorator.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Check whether the API process is running' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Check whether the API is ready to accept requests' })
  async ready(): Promise<{ status: 'ready' }> {
    await this.database.checkReadiness();
    return { status: 'ready' };
  }
}
