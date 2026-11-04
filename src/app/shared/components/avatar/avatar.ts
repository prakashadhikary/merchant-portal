import { Component, computed, input } from '@angular/core';

const TONES = 6;

/** Initials in a coloured circle; the colour is derived from the name so it is stable. */
@Component({
  selector: 'mp-avatar',
  template: `<span [class]="classes()" aria-hidden="true">{{ initials() }}</span>`,
  styleUrl: './avatar.scss',
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  readonly classes = computed(() => {
    const hash = [...this.name()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `mp-avatar mp-avatar-${this.size()} mp-avatar-tone-${hash % TONES}`;
  });
}
