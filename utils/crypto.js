const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'ghostdrop-key-derivation';

function deriveKey(slug) {
  const secret = process.env.ENCRYPTION_SECRET || 'default-dev-secret-change-me';
  return crypto.pbkdf2Sync(slug, secret + SALT, 100000, KEY_LENGTH, 'sha512');
}

function hashSlug(slug) {
  return crypto.createHash('sha256').update(slug).digest('hex');
}

function encrypt(text, slug) {
  const key = deriveKey(slug);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag,
  };
}

function decrypt(encryptedData, iv, authTag, slug) {
  const key = deriveKey(slug);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateSlug() {
  return crypto.randomBytes(18).toString('base64url');
}

function hashIP(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 32);
}

module.exports = { encrypt, decrypt, hashSlug, generateSlug, hashIP };
