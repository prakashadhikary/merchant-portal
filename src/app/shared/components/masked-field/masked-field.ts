import { Component, effect, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Renders a masked sensitive value. When the parent supplies the revealed
 * `value`, it is shown with a Hide button and re-masked automatically after
 * `revealSeconds`; the timer is cleared on hide and on destroy.
 */
@Component({
  selector: 'mp-masked-field',
  imports: [Icon],
  templateUrl: './masked-field.html',
  styleUrl: './masked-field.scss',
})
export class MaskedField {
  readonly label = input.required<string>();
  readonly masked = input.required<string>();
  readonly canReveal = input(false);
  readonly value = input<string | null>(null);
  readonly busy = input(false);
  readonly revealSeconds = input(30);
  readonly reveal = output<void>();
  readonly hide = output<void>();

  constructor() {
    effect((onCleanup) => {
      if (this.value() === null) return;
      const timer = setTimeout(() => this.hide.emit(), this.revealSeconds() * 1000);
      onCleanup(() => clearTimeout(timer));
    });
  }
}
