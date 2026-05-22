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

function getRemoteDir() {
  return (process.env.SFTP_REMOTE_DIR ?? 'www/profiles').replace(/\/+$/, '');
}

function remotePathForUserId(userId) {
  const dir = getRemoteDir();
  return `${dir}/${userId}.jpg`;
}

function buildConnectOptions() {
  const opts = {
    host: process.env.SFTP_HOST,
    port: Number(process.env.SFTP_PORT) || 22,
    username: process.env.SFTP_USER,
    readyTimeout: 25000,
    retries: 1,
    retry_factor: 2,
  };

  if (process.env.SFTP_PASSWORD) {
    opts.password = process.env.SFTP_PASSWORD;
  }
  if (process.env.SFTP_PRIVATE_KEY) {
    opts.privateKey = process.env.SFTP_PRIVATE_KEY;
  }

  return opts;
}

async function ensureRemoteDir(client, remoteDir) {
  const stat = await client.exists(remoteDir);
  if (stat) return;

  await client.mkdir(remoteDir, true);
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
  const remoteDir = getRemoteDir();
  const client = new SftpClient();

  try {
    await client.connect(buildConnectOptions());
    await ensureRemoteDir(client, remoteDir);
    await client.put(jpegBuffer, remotePath);
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error('SFTP upload error:', {
      host: process.env.SFTP_HOST,
      port: process.env.SFTP_PORT || 22,
      remoteDir,
      remotePath,
      message: msg,
      code: err?.code,
    });
    throw new Error(`SFTP: ${msg}`);
  } finally {
    try {
      await client.end();
    } catch {
      // noop
    }
  }

  return `${getPublicBaseUrl()}/${userId}.jpg`;
}

module.exports = {
  sftpConfigured,
  getPublicBaseUrl,
  getRemoteDir,
  uploadProfileJpeg,
};
