import { DEFAULT_SEED_SIZE, MockDb, SEED_SIZES, seedDb } from './mock-data';

/**
 * Mock data survives reloads so drafts can be resumed; "Reset demo data" clears
 * it. Large seeds do not fit in localStorage (about 5 MB); when a write fails
 * the data stays in memory for the session and the chosen size is regenerated
 * deterministically on the next load.
 */
const DB_KEY = 'merchant-portal.db';
const SIZE_KEY = 'merchant-portal.seed-size';
let memo: MockDb | null = null;
let storageUsable = true;

export function loadDb(): MockDb {
  memo ??= readStoredDb() ?? seedDb(readSeedSize());
  return memo;
}

/** Returns false when the data could not be stored; later calls are skipped until the next reset. */
export function saveDb(db: MockDb): boolean {
  if (!storageUsable) return false;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return true;
  } catch {
    storageUsable = false;
    localStorage.removeItem(DB_KEY);
    return false;
  }
}

export function resetDb(size = DEFAULT_SEED_SIZE): void {
  memo = null;
  storageUsable = true;
  localStorage.removeItem(DB_KEY);
  localStorage.setItem(SIZE_KEY, String(size));
}

export function readSeedSize(): number {
  const size = Number(localStorage.getItem(SIZE_KEY));
  return SEED_SIZES.includes(size) ? size : DEFAULT_SEED_SIZE;
}

function readStoredDb(): MockDb | null {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const value: unknown = raw === null ? null : JSON.parse(raw);
    return isDb(value) ? value : null;
  } catch {
    return null;
  }
}

function isDb(value: unknown): value is MockDb {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v['applications']) &&
    Array.isArray(v['history']) &&
    typeof v['version'] === 'number'
  );
}
