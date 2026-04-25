import Dexie, { Table } from 'dexie';

export interface VaultRecord {
  id: string;
  encrypted: boolean;
  payload: string; // JSON string (plaintext) or base64 ciphertext
  iv?: string;
  salt?: string;
  updatedAt: string;
}

class FinanceDB extends Dexie {
  vault!: Table<VaultRecord, string>;
  constructor() {
    super('uk-finance-pwa');
    this.version(1).stores({ vault: 'id' });
  }
}

export const db = new FinanceDB();

export async function loadVault(): Promise<VaultRecord | null> {
  return (await db.vault.get('main')) ?? null;
}

export async function saveVault(rec: VaultRecord): Promise<void> {
  await db.vault.put(rec);
}

export async function wipeVault(): Promise<void> {
  await db.vault.clear();
}
