import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import type { BusinessTransaction } from '../database/database.service.js';
import {
  garments,
  mediaObjects,
  portfolioConsentEvents,
} from '../database/schema.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import type {
  GrantPortfolioConsentDto,
  RequestMediaUploadDto,
  SupportedMediaType,
  WithdrawPortfolioConsentDto,
} from './media.dto.js';
import { ObjectStorageService } from './object-storage.service.js';
import {
  validateMediaUpload,
  verifyMediaSignature,
} from './media.validation.js';

const uploadUrlLifetimeMs = 5 * 60 * 1000;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly storage: ObjectStorageService,
  ) {}

  async requestUpload(
    user: AuthenticatedUser,
    garmentId: string,
    input: RequestMediaUploadDto,
  ) {
    const upload = validateMediaUpload(
      input.filename,
      input.contentType,
      input.fileSizeBytes,
    );

    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        await this.requireGarment(transaction, garmentId);

        const mediaId = randomUUID();
        const objectKey = `${businessId}/${garmentId}/${mediaId}`;
        const uploadExpiresAt = new Date(Date.now() + uploadUrlLifetimeMs);
        const uploadUrl = await this.storage.createUploadUrl(
          objectKey,
          upload.contentType,
          upload.fileSizeBytes,
        );
        const [media] = await transaction
          .insert(mediaObjects)
          .values({
            id: mediaId,
            businessId,
            garmentId,
            objectKey,
            originalFilename: upload.filename,
            contentType: upload.contentType,
            fileSizeBytes: String(upload.fileSizeBytes),
            uploadedBy: user.id,
            uploadExpiresAt,
          })
          .returning();

        return {
          media: this.toMediaResponse(media),
          uploadUrl,
          uploadExpiresAt,
          requiredHeaders: { 'Content-Type': upload.contentType },
        };
      },
    );
  }

  async listGarmentMedia(user: AuthenticatedUser, garmentId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireGarment(transaction, garmentId);
        const rows = await transaction
          .select()
          .from(mediaObjects)
          .where(
            and(
              eq(mediaObjects.garmentId, garmentId),
              eq(mediaObjects.status, 'available'),
            ),
          )
          .orderBy(desc(mediaObjects.createdAt), desc(mediaObjects.id));
        return rows.map((row) => this.toMediaResponse(row));
      },
    );
  }

  async completeUpload(user: AuthenticatedUser, mediaId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const [media] = await transaction
          .select()
          .from(mediaObjects)
          .where(eq(mediaObjects.id, mediaId))
          .limit(1)
          .for('update');
        if (!media || media.status === 'deleted') {
          throw new NotFoundException('Media was not found.');
        }
        if (media.status === 'available') {
          return this.toMediaResponse(media);
        }
        if (media.uploadExpiresAt.getTime() < Date.now()) {
          throw new ConflictException('The media upload URL has expired.');
        }

        let metadata;
        let prefix: Uint8Array;
        try {
          metadata = await this.storage.inspectObject(media.objectKey);
          prefix = await this.storage.readObjectPrefix(media.objectKey);
        } catch (error) {
          if (isStorageNotFound(error)) {
            throw new ConflictException(
              'The uploaded media object could not be found.',
            );
          }
          if (error instanceof ServiceUnavailableException) {
            throw error;
          }
          this.logStorageFailure('media_upload_verification_failed', error);
          throw new ServiceUnavailableException(
            'Uploaded media could not be verified.',
          );
        }

        if (metadata.ContentLength !== Number(media.fileSizeBytes)) {
          throw new BadRequestException(
            'The uploaded file size does not match the requested size.',
          );
        }
        await verifyMediaSignature(
          prefix,
          media.contentType as SupportedMediaType,
        );

        const [completed] = await transaction
          .update(mediaObjects)
          .set({ status: 'available', completedAt: new Date() })
          .where(
            and(
              eq(mediaObjects.id, mediaId),
              eq(mediaObjects.status, 'pending'),
            ),
          )
          .returning();

        if (!completed) {
          throw new ConflictException('The media upload state has changed.');
        }
        return this.toMediaResponse(completed);
      },
    );
  }

  async createDownloadUrl(user: AuthenticatedUser, mediaId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const media = await this.requireAvailableMedia(transaction, mediaId);
        return {
          downloadUrl: await this.storage.createDownloadUrl(media.objectKey),
          expiresInSeconds: uploadUrlLifetimeMs / 1000,
        };
      },
    );
  }

  async deleteMedia(user: AuthenticatedUser, mediaId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        const [media] = await transaction
          .select()
          .from(mediaObjects)
          .where(eq(mediaObjects.id, mediaId))
          .limit(1)
          .for('update');
        if (!media || media.status === 'deleted') {
          throw new NotFoundException('Media was not found.');
        }
        try {
          await this.storage.deleteObject(media.objectKey);
        } catch (error) {
          this.logStorageFailure('media_object_deletion_failed', error);
          throw new ServiceUnavailableException(
            'Media could not be deleted from private storage.',
          );
        }
        await transaction
          .update(mediaObjects)
          .set({ status: 'deleted', completedAt: null })
          .where(eq(mediaObjects.id, mediaId));
        return { deleted: true };
      },
    );
  }

  async grantPortfolioConsent(
    user: AuthenticatedUser,
    mediaId: string,
    input: GrantPortfolioConsentDto,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const media = await this.lockMedia(transaction, mediaId);
        if (!media || media.status !== 'available') {
          throw new NotFoundException('Available media was not found.');
        }
        const latest = await this.latestConsent(transaction, mediaId);
        if (latest?.action === 'granted') {
          throw new ConflictException(
            'Portfolio consent is already active for this media.',
          );
        }

        const [event] = await transaction
          .insert(portfolioConsentEvents)
          .values({
            businessId,
            mediaId,
            action: 'granted',
            method: input.method,
            occurredAt: new Date(input.consentedAt),
            note: normalizeNote(input.note),
            actorId: user.id,
          })
          .returning();
        return event;
      },
    );
  }

  async withdrawPortfolioConsent(
    user: AuthenticatedUser,
    mediaId: string,
    input: WithdrawPortfolioConsentDto,
  ) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction, businessId) => {
        const media = await this.lockMedia(transaction, mediaId);
        if (!media) {
          throw new NotFoundException('Media was not found.');
        }
        const latest = await this.latestConsent(transaction, mediaId);
        if (latest?.action !== 'granted') {
          throw new ConflictException(
            'There is no active portfolio consent to withdraw.',
          );
        }

        const [event] = await transaction
          .insert(portfolioConsentEvents)
          .values({
            businessId,
            mediaId,
            action: 'withdrawn',
            method: null,
            occurredAt: new Date(input.withdrawnAt),
            note: normalizeNote(input.note),
            actorId: user.id,
          })
          .returning();
        return event;
      },
    );
  }

  async listPortfolioConsent(user: AuthenticatedUser, mediaId: string) {
    return this.database.withAuthorizedBusinessTransaction(
      user.id,
      async (transaction) => {
        await this.requireMedia(transaction, mediaId);
        return transaction
          .select({
            id: portfolioConsentEvents.id,
            action: portfolioConsentEvents.action,
            method: portfolioConsentEvents.method,
            occurredAt: portfolioConsentEvents.occurredAt,
            note: portfolioConsentEvents.note,
            actorId: portfolioConsentEvents.actorId,
            createdAt: portfolioConsentEvents.createdAt,
          })
          .from(portfolioConsentEvents)
          .where(eq(portfolioConsentEvents.mediaId, mediaId))
          .orderBy(desc(portfolioConsentEvents.createdAt));
      },
    );
  }

  private async requireGarment(
    transaction: BusinessTransaction,
    garmentId: string,
  ) {
    const [garment] = await transaction
      .select({ id: garments.id })
      .from(garments)
      .where(eq(garments.id, garmentId))
      .limit(1);
    if (!garment) {
      throw new NotFoundException('Garment was not found.');
    }
    return garment;
  }

  private async requireMedia(
    transaction: BusinessTransaction,
    mediaId: string,
  ) {
    const [media] = await transaction
      .select()
      .from(mediaObjects)
      .where(eq(mediaObjects.id, mediaId))
      .limit(1);
    if (!media) {
      throw new NotFoundException('Media was not found.');
    }
    return media;
  }

  private async requireAvailableMedia(
    transaction: BusinessTransaction,
    mediaId: string,
  ) {
    const media = await this.requireMedia(transaction, mediaId);
    if (media.status !== 'available') {
      throw new NotFoundException('Available media was not found.');
    }
    return media;
  }

  private async lockMedia(
    transaction: BusinessTransaction,
    mediaId: string,
  ) {
    const [media] = await transaction
      .select()
      .from(mediaObjects)
      .where(eq(mediaObjects.id, mediaId))
      .limit(1)
      .for('update');
    return media;
  }

  private async latestConsent(
    transaction: BusinessTransaction,
    mediaId: string,
  ) {
    const [latest] = await transaction
      .select({
        action: portfolioConsentEvents.action,
      })
      .from(portfolioConsentEvents)
      .where(eq(portfolioConsentEvents.mediaId, mediaId))
      .orderBy(
        desc(portfolioConsentEvents.createdAt),
        desc(portfolioConsentEvents.id),
      )
      .limit(1);
    return latest;
  }

  private toMediaResponse(media: typeof mediaObjects.$inferSelect) {
    const { objectKey: _objectKey, ...publicMetadata } = media;
    return publicMetadata;
  }

  private logStorageFailure(event: string, error: unknown): void {
    this.logger.error(
      JSON.stringify({
        event,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
  }
}

function isStorageNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    '$metadata' in error &&
    typeof error.$metadata === 'object' &&
    error.$metadata !== null &&
    'httpStatusCode' in error.$metadata &&
    error.$metadata.httpStatusCode === 404
  );
}

function normalizeNote(note: string | undefined): string | null {
  const normalized = note?.trim();
  return normalized || null;
}
