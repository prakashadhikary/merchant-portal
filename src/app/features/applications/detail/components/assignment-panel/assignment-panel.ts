import { Component, input, linkedSignal, output } from '@angular/core';
import { UserRef } from '../../../../../shared/models/user.models';

@Component({
  selector: 'mp-assignment-panel',
  templateUrl: './assignment-panel.html',
})
export class AssignmentPanel {
  readonly reviewers = input.required<readonly UserRef[]>();
  readonly current = input<UserRef | null>(null);
  readonly busy = input(false);
  readonly assign = output<string>();

  readonly selected = linkedSignal(() => this.current()?.id ?? '');

  onSelect(event: Event): void {
    this.selected.set((event.target as HTMLSelectElement).value);
  }

  canAssign(): boolean {
    return !this.busy() && this.selected() !== '' && this.selected() !== this.current()?.id;
  }
}
