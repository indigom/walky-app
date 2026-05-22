const { S3Client, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

function s3Configured() {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.S3_PUBLIC_BASE_URL?.trim()
  );
}

function getObjectKey(userId) {
  const prefix = (process.env.S3_KEY_PREFIX ?? 'profiles/').replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/${userId}.jpg` : `${userId}.jpg`;
}

function getPublicUrl(userId) {
  const base = process.env.S3_PUBLIC_BASE_URL.replace(/\/+$/, '');
  const key = getObjectKey(userId);
  const path = key.startsWith('/') ? key : `/${key}`;
  return `${base}${path}`.replace(/([^:]\/)\/+/g, '$1');
}

function buildS3Client() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  return new S3Client({
    region: process.env.S3_REGION?.trim() || 'auto',
    ...(endpoint ? { endpoint } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY.trim(),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
}

/**
 * Cloudflare R2 / AWS S3 호환. Railway → 객체 스토리지 (가비아 SFTP 불필요).
 */
async function uploadProfileJpeg(userId, jpegBuffer) {
  if (!s3Configured()) {
    throw new Error('S3 not configured (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL)');
  }

  const client = buildS3Client();
  const Key = getObjectKey(userId);

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET.trim(),
      Key,
      Body: jpegBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=86400',
    })
  );

  const url = getPublicUrl(userId);
  console.log('S3 profile saved:', { bucket: process.env.S3_BUCKET, key: Key, url });
  return url;
}

async function testS3Storage() {
  if (!s3Configured()) {
    return { ok: false, error: 'S3 not configured' };
  }
  try {
    const client = buildS3Client();
    await client.send(
      new HeadBucketCommand({ Bucket: process.env.S3_BUCKET.trim() })
    );
    return {
      ok: true,
      bucket: process.env.S3_BUCKET.trim(),
      endpoint: process.env.S3_ENDPOINT?.trim() || '(default)',
      publicBase: process.env.S3_PUBLIC_BASE_URL?.trim(),
      sampleUrl: getPublicUrl('w_test'),
    };
  } catch (err) {
    return {
      ok: false,
      message: err?.message ?? String(err),
      code: err?.Code ?? err?.code,
      hint: 'R2: S3_ENDPOINT, region auto, 버킷 Public access 또는 커스텀 도메인',
    };
  }
}

module.exports = {
  s3Configured,
  uploadProfileJpeg,
  testS3Storage,
  getPublicUrl,
};
