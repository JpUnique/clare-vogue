import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';

type DependencyCheck = {
  ready: boolean;
  error?: string;
  latency?: number;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async checkDependencies(): Promise<Record<string, DependencyCheck>> {
    const checks: Record<string, DependencyCheck> = {
      database: await this.checkDatabase(),
    };

    return checks;
  }

  async checkDependenciesStrict(): Promise<Record<string, DependencyCheck>> {
    const checks = await this.checkDependencies();

    // Strict mode: ensure critical dependencies (database only) are ready
    const criticalDependencies = ['database'];
    for (const dep of criticalDependencies) {
      if (!checks[dep]?.ready) {
        this.logger.error(`Critical dependency failed: ${dep}`, checks[dep]?.error);
      }
    }

    return checks;
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    try {
      const startTime = Date.now();

      await this.database.checkReadiness();

      const latency = Date.now() - startTime;
      this.logger.debug(`Database check passed (${latency}ms)`);

      return {
        ready: true,
        latency,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Database check failed', message);

      return {
        ready: false,
        error: message,
      };
    }
  }

}
