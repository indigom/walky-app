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

/** 가비아 등 호스팅별 경로 후보 (설정값 우선) */
function getRemoteDirCandidates() {
  const configured = process.env.SFTP_REMOTE_DIR?.trim();
  const defaults = [
    'www_root/profiles',
    '/www_root/profiles',
    'www/profiles',
    '/www/profiles',
    'public_html/profiles',
  ];
  const list = configured ? [configured, ...defaults] : defaults;
  const seen = new Set();
  return list
    .map((d) => d.replace(/\/+$/, ''))
    .filter((d) => {
      if (!d || seen.has(d)) return false;
      seen.add(d);
      return true;
    });
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

async function uploadToRemoteDir(userId, jpegBuffer, remoteDir) {
  const remotePath = `${remoteDir}/${userId}.jpg`;
  const client = new SftpClient();

  try {
    await client.connect(buildConnectOptions());
    await ensureRemoteDir(client, remoteDir);
    await client.put(jpegBuffer, remotePath);
    console.log('SFTP profile saved:', { remoteDir, remotePath });
  } finally {
    try {
      await client.end();
    } catch {
      // noop
    }
  }

  return `${getPublicBaseUrl()}/${userId}.jpg`;
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

  const candidates = getRemoteDirCandidates();
  const failures = [];

  for (const remoteDir of candidates) {
    try {
      return await uploadToRemoteDir(userId, jpegBuffer, remoteDir);
    } catch (err) {
      const msg = err?.message ?? String(err);
      failures.push({ remoteDir, message: msg, code: err?.code });
      console.warn('SFTP try failed:', remoteDir, msg);
    }
  }

  console.error('SFTP upload error (all paths):', {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT || 22,
    tried: candidates,
    failures,
  });

  throw new Error(
    `SFTP failed (${failures.length} paths). First: ${failures[0]?.message ?? 'unknown'}`
  );
}

module.exports = {
  sftpConfigured,
  getPublicBaseUrl,
  getRemoteDirCandidates,
  uploadProfileJpeg,
};
