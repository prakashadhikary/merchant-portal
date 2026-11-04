import { Pipe, PipeTransform } from '@angular/core';

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "2 hours ago", "yesterday", "just now" - for timestamps where the exact time matters less. */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  private readonly formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  transform(iso: string, nowMs = Date.now()): string {
    const seconds = Math.round((new Date(iso).getTime() - nowMs) / 1000);
    for (const [unit, size] of UNITS) {
      if (Math.abs(seconds) >= size) return this.formatter.format(Math.round(seconds / size), unit);
    }
    return 'just now';
  }
}
