import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, filter, Subject } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { Icon } from '../../../../shared/components/icon/icon';
import { APPLICATION_STATUSES, STATUS_LABELS } from '../../models/application.models';
import { ApplicationsApi } from '../../services/applications.api';
import { ApplicationsTable } from '../components/applications-table/applications-table';
import { ApplicationsListStore } from '../services/applications-list.store';

export const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'mp-applications-list-page',
  imports: [DecimalPipe, ApplicationsTable, Icon],
  providers: [ApplicationsListStore],
  templateUrl: './applications-list-page.html',
  styleUrl: './applications-list-page.scss',
})
export class ApplicationsListPage {
  readonly store = inject(ApplicationsListStore);
  readonly auth = inject(AuthService);

  private readonly api = inject(ApplicationsApi);
  private readonly router = inject(Router);
  private readonly search$ = new Subject<string>();

  readonly statuses = APPLICATION_STATUSES;
  readonly statusLabels = STATUS_LABELS;
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly subtitle = computed(() => {
    switch (this.auth.user()?.role) {
      case 'SALES':
        return 'Merchant applications you created, including drafts.';
      case 'REVIEWER':
        return 'Applications assigned to you for review.';
      default:
        return 'Every merchant application, across all sales users.';
    }
  });

  constructor() {
    // Compare with the store rather than the previous emission, because
    // clearFilters() resets q without going through search$.
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        filter((q) => q !== this.store.filters().q),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.store.setFilters({ q }));
  }

  search(value: string): void {
    this.search$.next(value.trim());
  }

  setStatus(value: string): void {
    this.store.setFilters({ status: APPLICATION_STATUSES.find((s) => s === value) ?? '' });
  }

  clearFilters(): void {
    this.store.setFilters({ q: '', status: '' });
  }

  createDraft(): void {
    this.creating.set(true);
    this.createError.set(null);
    this.api.createDraft().subscribe({
      next: (draft) => void this.router.navigate(['/applications', draft.id, 'edit']),
      error: (error: unknown) => {
        this.createError.set(errorMessage(error));
        this.creating.set(false);
      },
    });
  }

  emptyMessage(): string {
    switch (this.auth.user()?.role) {
      case 'SALES':
        return "You haven't created an application yet.";
      case 'REVIEWER':
        return 'Nothing is assigned to you yet.';
      default:
        return 'No applications yet.';
    }
  }
}
