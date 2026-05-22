/**
 * Railway → 가비아 HTTPS 업로드 API (SFTP 대신).
 * 가비아 서버에 server/gabia-profile-upload 를 띄우고 URL을 GABIA_PROFILE_UPLOAD_URL 로 지정.
 */

function gabiaHttpConfigured() {
  return Boolean(
    process.env.GABIA_PROFILE_UPLOAD_URL?.trim() &&
      process.env.GABIA_UPLOAD_API_KEY?.trim()
  );
}

async function uploadProfileJpeg(userId, jpegBuffer) {
  const url = process.env.GABIA_PROFILE_UPLOAD_URL.trim();
  const key = process.env.GABIA_UPLOAD_API_KEY.trim();

  const form = new FormData();
  form.append('userId', userId);
  form.append('photo', new Blob([jpegBuffer], { type: 'image/jpeg' }), `${userId}.jpg`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-walky-upload-key': key },
    body: form,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Gabia upload invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || !data?.ok || !data?.profilePhotoUrl) {
    throw new Error(
      data?.error ?? `Gabia upload failed HTTP ${res.status}: ${text.slice(0, 200)}`
    );
  }

  console.log('Gabia HTTP profile saved:', data.profilePhotoUrl);
  return data.profilePhotoUrl;
}

async function testGabiaHttpUpload() {
  if (!gabiaHttpConfigured()) {
    return { ok: false, error: 'Gabia HTTP upload not configured' };
  }
  return {
    ok: true,
    url: process.env.GABIA_PROFILE_UPLOAD_URL.trim(),
    hint: '실제 업로드는 POST multipart (userId, photo). 앱 직접 업로드도 같은 URL 사용 가능',
  };
}

module.exports = {
  gabiaHttpConfigured,
  uploadProfileJpeg,
  testGabiaHttpUpload,
};
