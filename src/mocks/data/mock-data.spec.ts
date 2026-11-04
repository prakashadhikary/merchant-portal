import { DEFAULT_SEED_SIZE, seedDb } from './mock-data';

describe('seedDb', () => {
  it('is deterministic and defaults to the small set', () => {
    expect(seedDb()).toEqual(seedDb());
    expect(seedDb().applications).toHaveLength(DEFAULT_SEED_SIZE);
    expect(seedDb().version).toBe(0);
  });

  it('scales to large sets with unique ids and names, each with a CREATED entry', () => {
    const db = seedDb(1_000);
    expect(db.applications).toHaveLength(1_000);
    expect(new Set(db.applications.map((a) => a.id)).size).toBe(1_000);
    expect(new Set(db.applications.map((a) => a.business.legalName)).size).toBe(1_000);
    expect(db.applications[999].id).toBe('APP-1000');
    const created = db.history.filter((h) => h.type === 'CREATED');
    expect(created).toHaveLength(1_000);
  });

  it('keeps large sets within the last two years', () => {
    const db = seedDb(10_000);
    const oldest = Math.min(...db.applications.map((a) => new Date(a.createdAt).getTime()));
    expect(Date.UTC(2026, 10, 1) - oldest).toBeLessThanOrEqual(2 * 365 * 24 * 3600 * 1000);
  });
});
