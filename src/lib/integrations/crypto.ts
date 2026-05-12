import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type EncryptedSecret = {
  encrypted_token: string; // base64 ciphertext
  iv: string;              // base64 IV (12 bytes)
  auth_tag: string;        // base64 auth tag (16 bytes)
};

function getKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) throw new Error('INTEGRATIONS_ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `INTEGRATIONS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  return key;
}

export function encryptApiKey(plaintext: string): EncryptedSecret {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted_token: ct.toString('base64'),
    iv: iv.toString('base64'),
    auth_tag: tag.toString('base64'),
  };
}

export function decryptApiKey(secret: EncryptedSecret): string {
  const key = getKey();
  const iv = Buffer.from(secret.iv, 'base64');
  const tag = Buffer.from(secret.auth_tag, 'base64');
  const ct = Buffer.from(secret.encrypted_token, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
