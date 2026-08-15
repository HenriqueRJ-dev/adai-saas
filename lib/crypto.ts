import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;

function getKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("TOKEN_ENCRYPTION_KEY nao configurada");
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("TOKEN_ENCRYPTION_KEY deve conter exatamente 64 caracteres hexadecimais");
  }

  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("TOKEN_ENCRYPTION_KEY deve ter 32 bytes");
  }
  return key;
}

export function encryptToken(plainText: string): string {
  if (!plainText) throw new Error("Token vazio nao pode ser criptografado");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Token criptografado em formato invalido");
  }

  const [ivHex, authTagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Token criptografado corrompido");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
