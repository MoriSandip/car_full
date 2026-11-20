import type { Asset, PhotoQuality } from 'react-native-image-picker';

export type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export type NormalizedImageAsset = Asset & {
  base64: string;
  type: SupportedImageMimeType;
};

export const describeImageAsset = (asset?: Asset) => {
  if (!asset) return 'The picker returned no image asset.';

  const uriScheme =
    /^([a-z][a-z0-9+.-]*):/i.exec(asset.uri || '')?.[1] || 'missing';
  const fileExtension =
    /\.([a-z0-9]+)(?:[?#].*)?$/i
      .exec(asset.fileName || asset.uri || '')?.[1]
      ?.toLowerCase() || 'missing';
  const dimensions =
    asset.width && asset.height ? `${asset.width}x${asset.height}` : 'missing';
  const dataLength = asset.base64?.trim().length || 0;

  return [
    `Picker details: MIME=${asset.type || 'missing'}`,
    `base64=${dataLength ? `present (${dataLength} chars)` : 'missing'}`,
    `URI scheme=${uriScheme}`,
    `extension=${fileExtension}`,
    `dimensions=${dimensions}`,
    `fileSize=${asset.fileSize ?? 'missing'}`,
  ].join('; ');
};

export const photoPickerOptions = (
  quality: PhotoQuality,
  maxDimension: number,
) => ({
  mediaType: 'photo' as const,
  selectionLimit: 1,
  includeBase64: true,
  quality,
  maxWidth: maxDimension,
  maxHeight: maxDimension,
  assetRepresentationMode: 'compatible' as const,
});

const normalizeMimeType = (value?: string): SupportedImageMimeType | null => {
  const mimeType = value?.split(';')[0].trim().toLowerCase();
  if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') {
    return 'image/jpeg';
  }
  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp'
  ) {
    return mimeType;
  }
  return null;
};

const mimeTypeFromSignature = (
  base64: string,
): SupportedImageMimeType | null => {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  return null;
};

const mimeTypeFromFileName = (asset: Asset): SupportedImageMimeType | null => {
  const fileName = asset.fileName || asset.uri || '';
  const extension = fileName
    .match(/\.([a-z0-9]+)(?:[?#].*)?$/i)?.[1]
    ?.toLowerCase();

  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return null;
};

export const normalizeImageAsset = (asset: Asset): NormalizedImageAsset => {
  let base64 = asset.base64?.trim() || '';
  let embeddedMimeType: string | undefined;

  if (base64.startsWith('data:')) {
    const commaIndex = base64.indexOf(',');
    const header = commaIndex < 0 ? '' : base64.slice(0, commaIndex);
    embeddedMimeType = /^data:(image\/[^;]+);base64$/i.exec(header)?.[1];
    base64 = commaIndex < 0 ? '' : base64.slice(commaIndex + 1);
  }
  base64 = base64.replace(/\s/g, '');

  if (!base64) {
    throw new Error(
      `The picker returned no image bytes. ${describeImageAsset(asset)}`,
    );
  }

  const type =
    mimeTypeFromSignature(base64) ||
    normalizeMimeType(embeddedMimeType) ||
    normalizeMimeType(asset.type) ||
    mimeTypeFromFileName(asset);
  if (!type) {
    throw new Error(
      `The picker returned an unsupported image format. Use JPEG, PNG, or WebP. ${describeImageAsset(
        asset,
      )}`,
    );
  }

  return { ...asset, base64, type };
};

export const imageDataUrl = (asset: Asset) => {
  const normalized = normalizeImageAsset(asset);
  return `data:${normalized.type};base64,${normalized.base64}`;
};
