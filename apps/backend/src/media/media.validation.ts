import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import type { SupportedMediaType } from './media.dto.js';

const imageTypes = new Set<SupportedMediaType>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const maximumImageSize = 20 * 1024 * 1024;
const maximumVideoSize = 200 * 1024 * 1024;

export function validateMediaUpload(
  filename: string,
  contentType: SupportedMediaType,
  fileSizeBytes: number,
): { filename: string; contentType: SupportedMediaType; fileSizeBytes: number } {
  const safeFilename = [...filename]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return character === '/' ||
        character === '\\' ||
        codePoint < 32 ||
        codePoint === 127
        ? '_'
        : character;
    })
    .join('')
    .trim();
  if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
    throw new BadRequestException('A valid media filename is required.');
  }

  const maximumSize = imageTypes.has(contentType)
    ? maximumImageSize
    : maximumVideoSize;
  if (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes > maximumSize) {
    throw new BadRequestException(
      `The selected media type exceeds its ${maximumSize} byte size limit.`,
    );
  }

  return {
    filename: safeFilename,
    contentType,
    fileSizeBytes,
  };
}

export async function verifyMediaSignature(
  bytes: Uint8Array,
  expectedContentType: SupportedMediaType,
): Promise<void> {
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || detected.mime !== expectedContentType) {
    throw new BadRequestException(
      'The uploaded file content does not match the permitted media type.',
    );
  }
}
