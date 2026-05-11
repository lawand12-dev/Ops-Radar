import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual
} from "node:crypto";
import { env } from "../config/env";

/* ============================================================
   Password hashing — scrypt with random salt
   ============================================================
   Format: scrypt$N=...,r=...,p=...$saltBase64$hashBase64
   We embed the params alongside the hash so cost can be raised later
   without invalidating existing hashes — verifyPassword reads them
   from the stored string.
   ============================================================ */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_SALT_BYTES = 16;

function scryptAsync(password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scryptAsync(plain, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  });
  return `scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;

  const params: Record<string, string> = {};
  for (const pair of parts[1]!.split(",")) {
    const [k, v] = pair.split("=");
    if (k && v !== undefined) params[k] = v;
  }
  const N = Number(params.N);
  const r = Number(params.r);
  const p = Number(params.p);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2]!, "base64");
    expected = Buffer.from(parts[3]!, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scryptAsync(plain, salt, expected.length, { N, r, p });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/* ============================================================
   At-rest encryption for per-user secrets (AES-256-GCM)
   ============================================================
   Encoding: base64( iv (12) | tag (16) | ciphertext )
   Master key is derived from env.SECRETS_ENCRYPTION_KEY via SHA-256 to
   guarantee a 32-byte key regardless of the env value's length.
   ============================================================ */

let cachedMasterKey: Buffer | null = null;
function getMasterKey(): Buffer {
  if (!cachedMasterKey) {
    cachedMasterKey = createHash("sha256").update(env.SECRETS_ENCRYPTION_KEY).digest();
  }
  return cachedMasterKey;
}

export function encryptSecret(plain: string): string {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("encryptSecret: plain must be a non-empty string");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(encoded: string | null | undefined): string | null {
  if (!encoded || typeof encoded !== "string") return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(encoded, "base64");
  } catch {
    return null;
  }
  if (buf.length < 12 + 16 + 1) return null;
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  try {
    const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/* ============================================================
   JWT (HS256) — minimal, no external dep
   ============================================================ */

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export function signJwt(claims: { sub: string; email: string; [k: string]: unknown }): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    ...claims,
    sub: claims.sub,
    email: claims.email,
    iat: now,
    exp: now + env.JWT_EXPIRES_IN_SECONDS
  };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = createHmac("sha256", env.JWT_SECRET).update(signingInput).digest();
  return `${signingInput}.${base64url(sig)}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  const expected = createHmac("sha256", env.JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  let provided: Buffer;
  try {
    provided = base64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(expected, provided)) return null;

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8")) as JwtPayload;
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}
