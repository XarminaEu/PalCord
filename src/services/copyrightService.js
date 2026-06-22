const crypto = require('crypto');
const axios = require('axios');

const PROGRAM = 'Palcord';
const COPYRIGHT = 'Copyright 2026 RL-Dev.de';
const ALGORITHM = 'aes-256-gcm';
const TIMEOUT = 10000;

function getKey(program, copyright) {
  const salt = Buffer.from('cGFsY29yZHNhbHRybGRldjIwMjY=', 'base64');
  return crypto.pbkdf2Sync(program + copyright + 'rl-dev', salt, 200000, 32, 'sha512');
}

function encryptToken(token, program = PROGRAM, copyright = COPYRIGHT) {
  const key = getKey(program, copyright);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

function decryptToken(encryptedToken, program = PROGRAM, copyright = COPYRIGHT) {
  const key = getKey(program, copyright);
  const [ivB64, authTagB64, dataB64] = encryptedToken.split(':');
  if (!ivB64 || !authTagB64 || !dataB64) return null;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(dataB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function checkCopyright(apiKey, program, copyright) {
  if (program !== PROGRAM) {
    return { status: 'error', allowed: false, message: 'startet nicht' };
  }
  if (copyright !== COPYRIGHT) {
    return { status: 'error', allowed: false, message: 'startet nicht' };
  }
  const expectedToken = decryptToken(EXPECTED_TOKEN, program, copyright);
  if (!expectedToken) {
    return { status: 'error', allowed: false, message: 'startet nicht' };
  }
  if (apiKey !== expectedToken) {
    return { status: 'error', allowed: false, message: 'startet nicht' };
  }
  return { status: 'ok', allowed: true, message: 'startet' };
}

function verifyLocal(program = PROGRAM, copyright = COPYRIGHT) {
  try {
    const decrypted = decryptToken(EXPECTED_TOKEN, program, copyright);
    if (!decrypted) return false;
    const check = checkCopyright(decrypted, program, copyright);
    return check.allowed === true;
  } catch (err) {
    return false;
  }
}

const EXPECTED_TOKEN = 'PWkJdvVJAeYzrazfvA8DGw==:UFBdCuJAuBUrdviYORR06g==:SwHr+6YuT6+f0PEirHxxK5KkjR+dVFfaGgw3g7wh2ineyWYX0ZSeUrLkOo9f2n6eMjCOqk5uR0th5R52ZwevBw==';
const EXPECTED_URL = 'E5pue9J6lz/tncsvyC5wGQ==:SQnmJtBfTwY+AVv6F2t+8Q==:MRs9/jLkM+VTo10K0I5oBZt0f64LzFPChC7KUZ91pBqgJRtTEw==';

async function verifyRemote() {
  try {
    const decryptedToken = decryptToken(EXPECTED_TOKEN);
    const url = decryptToken(EXPECTED_URL);
    if (!decryptedToken || !url) return false;
    const response = await axios.post(url, {
      api_key: decryptedToken,
      program: PROGRAM,
      copyright: COPYRIGHT,
    }, { timeout: TIMEOUT });
    return response.data && response.data.allowed === true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  PROGRAM,
  COPYRIGHT,
  encryptToken,
  decryptToken,
  checkCopyright,
  verifyLocal,
  verifyRemote,
  EXPECTED_TOKEN,
  EXPECTED_URL,
};
