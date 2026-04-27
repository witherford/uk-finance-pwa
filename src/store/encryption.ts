const DEFAULT_ITER = 210_000;

function b64encode(bytes: Uint8Array): string {
  // Chunked to avoid stack overflow on big buffers (e.g. an XLSX with attachments).
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
  }
  return btoa(bin);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: iter, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface SealedPayload {
  payload: string;
  iv: string;
  salt: string;
}

export async function seal(plaintext: string, password: string, iter: number = DEFAULT_ITER): Promise<SealedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plaintext) as BufferSource
    )
  );
  return { payload: b64encode(ct), iv: b64encode(iv), salt: b64encode(salt) };
}

export async function unseal(sealed: SealedPayload, password: string, iter: number = DEFAULT_ITER): Promise<string> {
  const key = await deriveKey(password, b64decode(sealed.salt), iter);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(sealed.iv) as BufferSource },
    key,
    b64decode(sealed.payload) as BufferSource
  );
  return new TextDecoder().decode(pt);
}

/**
 * Seal raw bytes (e.g. an .xlsx workbook) with AES-GCM, returning base64 outputs.
 * The plaintext-side helper in `backup-ukf.ts` wraps this with a versioned envelope.
 */
export async function sealBytes(plain: Uint8Array, password: string, iter: number = DEFAULT_ITER): Promise<SealedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      plain as BufferSource
    )
  );
  return { payload: b64encode(ct), iv: b64encode(iv), salt: b64encode(salt) };
}

export async function unsealBytes(sealed: SealedPayload, password: string, iter: number = DEFAULT_ITER): Promise<Uint8Array> {
  const key = await deriveKey(password, b64decode(sealed.salt), iter);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(sealed.iv) as BufferSource },
    key,
    b64decode(sealed.payload) as BufferSource
  );
  return new Uint8Array(pt);
}
