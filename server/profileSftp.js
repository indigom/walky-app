const SftpClient = require('ssh2-sftp-client');

function sftpConfigured() {
  return Boolean(
    process.env.SFTP_HOST &&
      process.env.SFTP_USER &&
      (process.env.SFTP_PASSWORD || process.env.SFTP_PRIVATE_KEY)
  );
}

function getPublicBaseUrl() {
  const base =
    process.env.PROFILE_PUBLIC_BASE_URL ?? 'https://walky.co.kr/profiles';
  return base.replace(/\/+$/, '');
}

function remotePathForUserId(userId) {
  const dir = (process.env.SFTP_REMOTE_DIR ?? '/www/profiles').replace(
    /\/+$/,
    ''
  );
  return `${dir}/${userId}.jpg`;
}

/**
 * @param {string} userId
 * @param {Buffer} jpegBuffer
 * @returns {Promise<string>} public HTTPS URL
 */
async function uploadProfileJpeg(userId, jpegBuffer) {
  if (!sftpConfigured()) {
    throw new Error('SFTP not configured (SFTP_HOST, SFTP_USER, SFTP_PASSWORD)');
  }

  const remotePath = remotePathForUserId(userId);
  const client = new SftpClient();

  try {
    await client.connect({
      host: process.env.SFTP_HOST,
      port: Number(process.env.SFTP_PORT) || 22,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASSWORD,
      privateKey: process.env.SFTP_PRIVATE_KEY,
      readyTimeout: 20000,
    });

    const remoteDir = remotePath.replace(/\/[^/]+$/, '');
    try {
      await client.mkdir(remoteDir, true);
    } catch {
      // directory may already exist
    }

    await client.put(jpegBuffer, remotePath);
  } finally {
    client.end().catch(() => {});
  }

  return `${getPublicBaseUrl()}/${userId}.jpg`;
}

module.exports = {
  sftpConfigured,
  getPublicBaseUrl,
  uploadProfileJpeg,
};
