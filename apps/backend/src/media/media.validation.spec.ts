import { BadRequestException } from '@nestjs/common';
import {
  validateMediaUpload,
  verifyMediaSignature,
} from './media.validation.js';

describe('validateMediaUpload', () => {
  it('sanitizes filenames and allows the image size limit', () => {
    expect(
      validateMediaUpload('../dress/photo.jpg', 'image/jpeg', 20 * 1024 * 1024),
    ).toEqual({
      filename: '.._dress_photo.jpg',
      contentType: 'image/jpeg',
      fileSizeBytes: 20 * 1024 * 1024,
    });
  });

  it('rejects images above 20 MB and videos above 200 MB', () => {
    expect(() =>
      validateMediaUpload(
        'large.png',
        'image/png',
        20 * 1024 * 1024 + 1,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      validateMediaUpload(
        'large.mp4',
        'video/mp4',
        200 * 1024 * 1024 + 1,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a filename that is blank', () => {
    expect(() =>
      validateMediaUpload('   ', 'image/png', 1),
    ).toThrow(BadRequestException);
  });
});

describe('verifyMediaSignature', () => {
  it('accepts a matching PNG signature', async () => {
    await expect(
      verifyMediaSignature(
        Buffer.from(
          '89504e470d0a1a0a0000000d494844520000000100000001',
          'hex',
        ),
        'image/png',
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a declared type that does not match the file signature', async () => {
    await expect(
      verifyMediaSignature(
        Buffer.from(
          '89504e470d0a1a0a0000000d494844520000000100000001',
          'hex',
        ),
        'image/jpeg',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
