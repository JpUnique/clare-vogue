import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class InitializationService implements OnModuleInit {
  private readonly logger = new Logger(InitializationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSecretsGenerated();
    await this.runMigrations();
  }

  private async ensureSecretsGenerated(): Promise<void> {
    const envFilePath = join(process.cwd(), '.env');

    // Check if secrets are already set
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (accessSecret && refreshSecret) {
      this.logger.log('JWT secrets already configured');
      return;
    }

    // Generate new secrets if missing
    const generatedAccessSecret = randomBytes(32).toString('base64');
    const generatedRefreshSecret = randomBytes(32).toString('base64');

    let envContent = '';
    if (existsSync(envFilePath)) {
      envContent = readFileSync(envFilePath, 'utf-8');
    }

    // Update or add JWT secrets
    if (!envContent.includes('JWT_ACCESS_SECRET')) {
      envContent += `\nJWT_ACCESS_SECRET=${generatedAccessSecret}`;
    } else {
      envContent = envContent.replace(
        /JWT_ACCESS_SECRET=.*/,
        `JWT_ACCESS_SECRET=${generatedAccessSecret}`,
      );
    }

    if (!envContent.includes('JWT_REFRESH_SECRET')) {
      envContent += `\nJWT_REFRESH_SECRET=${generatedRefreshSecret}`;
    } else {
      envContent = envContent.replace(
        /JWT_REFRESH_SECRET=.*/,
        `JWT_REFRESH_SECRET=${generatedRefreshSecret}`,
      );
    }

    writeFileSync(envFilePath, envContent);
    this.logger.log('Generated and saved JWT secrets to .env');

    // Update process.env for current session
    process.env.JWT_ACCESS_SECRET = generatedAccessSecret;
    process.env.JWT_REFRESH_SECRET = generatedRefreshSecret;
  }

  private async runMigrations(): Promise<void> {
    try {
      this.logger.log('Checking database migrations...');
      await this.database.checkReadiness();
      // Migrations are managed by drizzle-kit and run automatically via the database setup
      this.logger.log('Database is ready');
    } catch (error) {
      this.logger.warn(`Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
