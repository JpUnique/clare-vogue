import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const signedUrlLifetimeSeconds = 5 * 60;

@Injectable()
export class ObjectStorageService {
  private readonly bucket: string | undefined;
  private readonly client: S3Client | undefined;
  private readonly publicClient: S3Client | undefined;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('OBJECT_STORAGE_ENDPOINT');
    const publicEndpoint =
      config.get<string>('OBJECT_STORAGE_PUBLIC_ENDPOINT') ?? endpoint;
    const accessKeyId = config.get<string>('OBJECT_STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>(
      'OBJECT_STORAGE_SECRET_ACCESS_KEY',
    );
    this.bucket = config.get<string>('OBJECT_STORAGE_BUCKET');

    if (
      endpoint &&
      publicEndpoint &&
      accessKeyId &&
      secretAccessKey &&
      this.bucket
    ) {
      const options = {
        region: config.get<string>('OBJECT_STORAGE_REGION') ?? 'us-east-1',
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      };
      this.client = new S3Client({ ...options, endpoint });
      this.publicClient =
        endpoint === publicEndpoint
          ? this.client
          : new S3Client({ ...options, endpoint: publicEndpoint });
    }
  }

  get isConfigured(): boolean {
    return this.client !== undefined && this.publicClient !== undefined;
  }

  async createUploadUrl(
    key: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<string> {
    const { publicClient, bucket } = this.requireConfiguration();
    return getSignedUrl(
      publicClient,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: fileSizeBytes,
      }),
      { expiresIn: signedUrlLifetimeSeconds },
    );
  }

  async createDownloadUrl(key: string): Promise<string> {
    const { publicClient, bucket } = this.requireConfiguration();
    return getSignedUrl(
      publicClient,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: signedUrlLifetimeSeconds },
    );
  }

  async inspectObject(key: string): Promise<HeadObjectCommandOutput> {
    const { client, bucket } = this.requireConfiguration();
    return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  }

  async readObjectPrefix(key: string): Promise<Uint8Array> {
    const { client, bucket } = this.requireConfiguration();
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: 'bytes=0-4100',
      }),
    );
    if (!result.Body) {
      throw new Error('Object storage returned an empty media body.');
    }
    return result.Body.transformToByteArray();
  }

  async deleteObject(key: string): Promise<void> {
    const { client, bucket } = this.requireConfiguration();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.client?.destroy(),
      this.publicClient === this.client
        ? undefined
        : this.publicClient?.destroy(),
    ]);
  }

  private requireConfiguration(): {
    client: S3Client;
    publicClient: S3Client;
    bucket: string;
  } {
    if (!this.client || !this.publicClient || !this.bucket) {
      throw new ServiceUnavailableException(
        'Private media storage is not configured.',
      );
    }
    return {
      client: this.client,
      publicClient: this.publicClient,
      bucket: this.bucket,
    };
  }
}
