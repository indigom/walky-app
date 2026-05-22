const multer = require('multer');
const sharp = require('sharp');
const {
  normalizeUserId,
  normalizeNickname,
  getProfile,
  upsertProfile,
  listProfiles,
} = require('./profileStore');
const { sftpConfigured, uploadProfileJpeg } = require('./profileSftp');

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function profileUploadMiddleware(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Photo too large (max 3MB)' });
    }
    return res.status(400).json({ error: 'Invalid upload' });
  });
}

async function processPhotoBuffer(buffer) {
  return sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: 'cover' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

/**
 * POST /api/profile — multipart: userId, nickname?, photo?
 */
async function handleProfilePost(req, res) {
  const userId = normalizeUserId(req.body?.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  const nickname = normalizeNickname(req.body?.nickname);
  if (req.body?.nickname != null && req.body.nickname !== '' && !nickname) {
    return res.status(400).json({ error: 'Invalid nickname (1–20 chars)' });
  }

  const existing = getProfile(userId);
  let profilePhotoUrl = existing?.profilePhotoUrl;

  if (req.file?.buffer) {
    const mime = req.file.mimetype ?? '';
    if (!/^image\/(jpeg|png|webp)$/i.test(mime)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }

    if (!sftpConfigured()) {
      return res.status(503).json({
        error: 'Profile photo storage not configured (SFTP)',
      });
    }

    try {
      const jpeg = await processPhotoBuffer(req.file.buffer);
      profilePhotoUrl = await uploadProfileJpeg(userId, jpeg);
    } catch (e) {
      const detail = e?.message ?? String(e);
      console.error('profile upload failed:', detail);
      return res.status(502).json({
        error: 'Failed to store profile photo',
        hint: 'Check Railway SFTP_* variables and Gabia SFTP_REMOTE_DIR (see Deploy Logs)',
      });
    }
  }

  const record = upsertProfile(userId, {
    nickname: nickname ?? existing?.nickname,
    profilePhotoUrl,
  });

  return res.json({
    ok: true,
    userId: record.userId,
    nickname: record.nickname,
    profilePhotoUrl: record.profilePhotoUrl,
    updatedAt: record.updatedAt,
  });
}

/**
 * GET /api/profile?userId=w_xxx
 */
function handleProfileGet(req, res) {
  const userId = normalizeUserId(req.query?.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  const record = getProfile(userId);
  if (!record) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  return res.json({ ok: true, ...record });
}

/**
 * GET /api/admin/profiles — Header: x-walky-admin-key
 */
function handleAdminProfiles(req, res) {
  const expected = process.env.ADMIN_API_KEY?.trim();
  if (!expected) {
    return res.status(503).json({ error: 'Admin API disabled' });
  }

  const key = req.get('x-walky-admin-key')?.trim();
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limit = Number(req.query?.limit) || 200;
  const profiles = listProfiles({ limit });

  return res.json({
    ok: true,
    count: profiles.length,
    profiles,
    sftpConfigured: sftpConfigured(),
  });
}

module.exports = {
  profileUploadMiddleware,
  handleProfilePost,
  handleProfileGet,
  handleAdminProfiles,
};
