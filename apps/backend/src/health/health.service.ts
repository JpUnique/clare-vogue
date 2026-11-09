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
      supabase: this.checkSupabaseConfig(),
      config: await this.checkConfig(),
    };

    return checks;
  }

  async checkDependenciesStrict(): Promise<Record<string, DependencyCheck>> {
    const checks = await this.checkDependencies();

    // Strict mode: ensure all critical dependencies are ready
    const criticalDependencies = ['database', 'supabase', 'config'];
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

  private checkSupabaseConfig(): DependencyCheck {
    try {
      const url = this.config.get<string>('SUPABASE_URL');
      const publishableKey = this.config.get<string>('SUPABASE_PUBLISHABLE_KEY');
      const secretKey = this.config.get<string>('SUPABASE_SECRET_KEY');

      if (!url || !publishableKey) {
        return {
          ready: false,
          error: 'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY',
        };
      }

      const authConfigured = !!secretKey;
      this.logger.debug(
        `Supabase configured: url=${url.substring(0, 30)}... (auth: ${authConfigured})`,
      );

      return {
        ready: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        ready: false,
        error: message,
      };
    }
  }

  private async checkConfig(): Promise<DependencyCheck> {
    try {
      const requiredEnvVars = [
        'DATABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_PUBLISHABLE_KEY',
      ];

      const missing: string[] = [];
      for (const envVar of requiredEnvVars) {
        if (!this.config.get<string>(envVar)) {
          missing.push(envVar);
        }
      }

      if (missing.length > 0) {
        return {
          ready: false,
          error: `Missing environment variables: ${missing.join(', ')}`,
        };
      }

      this.logger.debug('Configuration check passed');

      return {
        ready: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        ready: false,
        error: message,
      };
    }
  }
}
