import httpStatus from 'http-status';
import AppError from '../../app/errors/AppError';
import config from '../../app/config';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_SIGNATURES: Record<string, (image: Buffer) => boolean> = {
  'image/jpeg': (image) =>
    image.length >= 3 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff,
  'image/png': (image) =>
    image.length >= 8 &&
    image.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
  'image/webp': (image) =>
    image.length >= 12 &&
    image.toString('ascii', 0, 4) === 'RIFF' &&
    image.toString('ascii', 8, 12) === 'WEBP',
};

const uploadImage = async (base64Image: string, mimeType: string) => {
  const isValidBase64 =
    base64Image.length > 0 &&
    base64Image.length <= Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(base64Image) &&
    base64Image.length % 4 === 0;
  if (!isValidBase64 || !MIME_SIGNATURES[mimeType]) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid image upload.');
  }

  const image = Buffer.from(base64Image, 'base64');
  if (
    image.length === 0 ||
    image.length > MAX_IMAGE_BYTES ||
    image.toString('base64') !== base64Image ||
    !MIME_SIGNATURES[mimeType](image)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Image content does not match an allowed image type or size.',
    );
  }
  if (!config.imgbb_api_key) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Image uploads are not configured on the server.',
    );
  }

  const formData = new FormData();
  formData.append('image', base64Image);
  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(
      config.imgbb_api_key,
    )}`,
    { method: 'POST', body: formData },
  );
  if (!response.ok) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'The image provider could not process the upload.',
    );
  }

  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('success' in result) ||
    result.success !== true ||
    !('data' in result) ||
    typeof result.data !== 'object' ||
    result.data === null ||
    !('url' in result.data) ||
    typeof result.data.url !== 'string'
  ) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'The image provider returned an invalid response.',
    );
  }
  return result;
};

export const ImageUploadService = { uploadImage };
