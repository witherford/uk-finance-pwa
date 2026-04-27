import { AppState } from '../types';
import { combinedXlsx } from './import-export';
import { sealBytes, unsealBytes } from '../store/encryption';
import { APP_VERSION } from '../version';

const ITER = 600_000;

interface UkfEnvelope {
  format: 'ukf';
  version: 1;
  algo: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string;
  iv: string;
  ciphertext: string;
  inner: 'json' | 'xlsx';
  appVersion: string;
  createdAt: string;
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function buildUkfFromState(state: AppState, password: string, inner: 'json' | 'xlsx'): Promise<Blob> {
  if (!password || password.length < 1) throw new Error('Password is required');
  let bytes: Uint8Array;
  if (inner === 'json') {
    bytes = new TextEncoder().encode(JSON.stringify(state));
  } else {
    bytes = await blobToBytes(combinedXlsx(state));
  }
  const sealed = await sealBytes(bytes, password, ITER);
  const env: UkfEnvelope = {
    format: 'ukf',
    version: 1,
    algo: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iter: ITER,
    salt: sealed.salt,
    iv: sealed.iv,
    ciphertext: sealed.payload,
    inner,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString()
  };
  return new Blob([JSON.stringify(env)], { type: 'application/octet-stream' });
}

export async function unwrapUkfFile(file: File, password: string): Promise<{ inner: 'json' | 'xlsx'; bytes: Uint8Array; envelope: UkfEnvelope }> {
  let env: UkfEnvelope;
  try {
    const text = await file.text();
    env = JSON.parse(text);
  } catch {
    throw new Error('File is not a valid .ukf envelope.');
  }
  if (env.format !== 'ukf') throw new Error('Not a UK Finance encrypted backup (.ukf).');
  if (env.version !== 1) throw new Error(`Unsupported .ukf version ${env.version}.`);
  if (env.algo !== 'AES-GCM-256' || env.kdf !== 'PBKDF2-SHA256') throw new Error('Unsupported encryption format in this file.');
  let bytes: Uint8Array;
  try {
    bytes = await unsealBytes({ payload: env.ciphertext, iv: env.iv, salt: env.salt }, password, env.iter || ITER);
  } catch {
    throw new Error('Wrong password or the file is corrupted.');
  }
  return { inner: env.inner, bytes, envelope: env };
}

export function decodeJsonInner(bytes: Uint8Array): AppState {
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([bytes as BlobPart], { type: mime });
}
