import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Loadable } from '../../../../../core/http/helpers/loadable';
import { HistoryEntry } from '../../../models/application.models';
import { RelativeTimePipe } from '../../../../../shared/pipes/relative-time.pipe';

type Tone = 'secondary' | 'primary' | 'warning' | 'success' | 'danger';

const TONES: Record<HistoryEntry['type'], Tone> = {
  CREATED: 'secondary',
  SUBMITTED: 'primary',
  ASSIGNED: 'primary',
  REVEALED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

@Component({
  selector: 'mp-history-list',
  imports: [DatePipe, RelativeTimePipe],
  templateUrl: './history-list.html',
  styleUrl: './history-list.scss',
})
export class HistoryList {
  readonly state = input.required<Loadable<HistoryEntry[]>>();
  readonly retry = output<void>();

  describe(entry: HistoryEntry): string {
    switch (entry.type) {
      case 'CREATED':
        return `Created by ${entry.actor.name}`;
      case 'SUBMITTED':
        return `Submitted by ${entry.actor.name}`;
      case 'ASSIGNED':
        return `Assigned to ${entry.detail} by ${entry.actor.name}`;
      case 'REVEALED':
        return `${entry.detail} revealed by ${entry.actor.name}`;
      case 'APPROVED':
        return `Approved by ${entry.actor.name}`;
      case 'REJECTED':
        return `Rejected by ${entry.actor.name}`;
    }
  }

  toneOf(entry: HistoryEntry): string {
    return `mp-timeline-item tone-${TONES[entry.type]}`;
  }

  isDecision(entry: HistoryEntry): boolean {
    return entry.type === 'APPROVED' || entry.type === 'REJECTED';
  }
}
