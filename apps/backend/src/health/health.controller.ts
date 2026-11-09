import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check - returns 200 if service is ready',
  })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness probe - checks all dependencies',
  })
  async readiness() {
    const checks = await this.health.checkDependencies();
    const allReady = Object.values(checks).every((c) => c.ready);

    return {
      ready: allReady,
      timestamp: new Date().toISOString(),
      dependencies: checks,
    };
  }

  @Get('startup')
  @Public()
  @ApiOperation({
    summary: 'Startup probe - comprehensive dependency verification',
  })
  async startup() {
    const checks = await this.health.checkDependenciesStrict();
    const allReady = Object.values(checks).every((c) => c.ready);

    if (!allReady) {
      const failedChecks = Object.entries(checks)
        .filter(([, c]) => !c.ready)
        .map(([name, c]) => `${name}: ${c.error || 'Unknown error'}`)
        .join('; ');

      throw new Error(`Startup checks failed: ${failedChecks}`);
    }

    return {
      ready: true,
      timestamp: new Date().toISOString(),
      dependencies: checks,
    };
  }
}
