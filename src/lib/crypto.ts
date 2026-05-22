import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY debe ser un hex de 64 caracteres (32 bytes). Generalo con: openssl rand -hex 32");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Formato de texto cifrado inválido");
  const [ivHex, dataHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// Detecta si un valor ya está cifrado (formato iv:data:tag en hex)
export function isEncrypted(value: string): boolean {
  return /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/.test(value);
}

// Encripta solo si no está ya cifrado (safe para migraciones graduales)
export function encryptIfNeeded(value: string | null): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

// Desencripta solo si está cifrado
export function decryptIfNeeded(value: string | null): string | null {
  if (!value) return null;
  if (!isEncrypted(value)) return value;
  return decrypt(value);
}
