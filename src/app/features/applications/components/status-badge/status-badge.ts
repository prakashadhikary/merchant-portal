import { Component, computed, input } from '@angular/core';
import { ApplicationStatus, STATUS_LABELS } from '../../models/application.models';

const TONE: Record<ApplicationStatus, string> = {
  DRAFT: 'secondary',
  SUBMITTED: 'primary',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/** Status pill: colour and a dot, always paired with the label so colour is never the only cue. */
@Component({
  selector: 'mp-status-badge',
  template: `
    <span [class]="classes()">
      <span class="mp-status-dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  readonly status = input.required<ApplicationStatus>();
  readonly label = computed(() => STATUS_LABELS[this.status()]);
  readonly classes = computed(() => `mp-status mp-status-${TONE[this.status()]}`);
}
