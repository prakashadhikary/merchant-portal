import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  const now = Date.UTC(2026, 10, 3, 12, 0, 0);
  const pipe = new RelativeTimePipe();
  const at = (offsetSeconds: number) => new Date(now + offsetSeconds * 1000).toISOString();

  it('says "just now" under a minute', () => {
    expect(pipe.transform(at(-30), now)).toBe('just now');
  });

  it('picks the largest fitting unit', () => {
    expect(pipe.transform(at(-120), now)).toBe('2 minutes ago');
    expect(pipe.transform(at(-3 * 3600), now)).toBe('3 hours ago');
    expect(pipe.transform(at(-86_400), now)).toBe('yesterday');
    expect(pipe.transform(at(-14 * 86_400), now)).toBe('2 weeks ago');
  });

  it('handles future timestamps', () => {
    expect(pipe.transform(at(3600), now)).toBe('in 1 hour');
  });
});
