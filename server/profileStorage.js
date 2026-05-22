const {
  sftpConfigured,
  uploadProfileJpeg: sftpUpload,
  testSftpConnection,
} = require('./profileSftp');
const {
  s3Configured,
  uploadProfileJpeg: s3Upload,
  testS3Storage,
} = require('./profileS3');
const {
  gabiaHttpConfigured,
  uploadProfileJpeg: gabiaHttpUpload,
  testGabiaHttpUpload,
} = require('./profileGabiaHttp');

const MODES = ['s3', 'gabia-http', 'sftp'];

/**
 * PROFILE_STORAGE=s3 | gabia-http | sftp (없으면 s3 → gabia-http → sftp 순 자동)
 */
function getStorageMode() {
  const forced = process.env.PROFILE_STORAGE?.trim().toLowerCase();
  if (forced && MODES.includes(forced)) {
    if (forced === 's3' && s3Configured()) return 's3';
    if (forced === 'gabia-http' && gabiaHttpConfigured()) return 'gabia-http';
    if (forced === 'sftp' && sftpConfigured()) return 'sftp';
    return null;
  }
  if (s3Configured()) return 's3';
  if (gabiaHttpConfigured()) return 'gabia-http';
  if (sftpConfigured()) return 'sftp';
  return null;
}

function isPhotoStorageConfigured() {
  return getStorageMode() != null;
}

function getStorageSummary() {
  return {
    mode: getStorageMode(),
    s3: s3Configured(),
    gabiaHttp: gabiaHttpConfigured(),
    sftp: sftpConfigured(),
    profileStorageEnv: process.env.PROFILE_STORAGE?.trim() || null,
  };
}

async function uploadProfileJpeg(userId, jpegBuffer) {
  const mode = getStorageMode();
  if (!mode) {
    throw new Error(
      'Profile photo storage not configured. Set S3_* (R2), GABIA_PROFILE_UPLOAD_URL, or SFTP_*'
    );
  }
  if (mode === 's3') return s3Upload(userId, jpegBuffer);
  if (mode === 'gabia-http') return gabiaHttpUpload(userId, jpegBuffer);
  return sftpUpload(userId, jpegBuffer);
}

async function testPhotoStorage() {
  const mode = getStorageMode();
  if (!mode) {
    return {
      ok: false,
      error: 'No storage backend configured',
      ...getStorageSummary(),
      hint: 'Railway: PROFILE_STORAGE=s3 + S3_* (R2 권장). 가비아 HTTPS: gabia-http 또는 앱 직접 업로드',
    };
  }
  if (mode === 's3') {
    const r = await testS3Storage();
    return { mode, ...r };
  }
  if (mode === 'gabia-http') {
    const r = await testGabiaHttpUpload();
    return { mode, ...r };
  }
  const r = await testSftpConnection();
  return { mode, ...r };
}

module.exports = {
  getStorageMode,
  isPhotoStorageConfigured,
  getStorageSummary,
  uploadProfileJpeg,
  testPhotoStorage,
};
