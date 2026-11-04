import { DEFAULT_SEED_SIZE } from './mock-data';
import { loadDb, readSeedSize, resetDb, saveDb } from './mock-db';

describe('mock db persistence', () => {
  beforeEach(() => resetDb());

  it('seeds the default size, persists, and reloads the stored copy', () => {
    const db = loadDb();
    expect(db.applications).toHaveLength(DEFAULT_SEED_SIZE);
    expect(saveDb(db)).toBe(true);
    expect(localStorage.getItem('merchant-portal-lite.db')).not.toBeNull();
  });

  it('regenerates with the size chosen at reset', () => {
    resetDb(1_000);
    expect(readSeedSize()).toBe(1_000);
    expect(loadDb().applications).toHaveLength(1_000);
  });

  it('falls back to memory when storage is full and stops retrying', () => {
    const db = loadDb();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(saveDb(db)).toBe(false);
    expect(saveDb(db)).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
    expect(localStorage.getItem('merchant-portal-lite.db')).toBeNull();
  });
});
