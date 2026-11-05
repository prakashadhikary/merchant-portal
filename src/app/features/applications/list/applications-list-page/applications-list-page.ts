import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, filter, Subject } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { Icon } from '../../../../shared/components/icon/icon';
import { StatusBadge } from '../../components/status-badge/status-badge';
import {
  APPLICATION_STATUSES,
  MerchantApplication,
  STATUS_LABELS,
} from '../../models/application.models';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { ApplicationsApi } from '../../services/applications.api';
import { ApplicationsListStore } from '../services/applications-list.store';

export const SEARCH_DEBOUNCE_MS = 300;
/** Fixed row height in px; the virtual scroll strategy relies on every row being this tall. */
export const ROW_HEIGHT = 64;
/** Fetch the next page when the rendered range gets this close to the last loaded row. */
const PREFETCH_ROWS = 5;

interface RowAction {
  readonly label: 'Continue' | 'Review' | 'View';
  readonly link: string[];
}

@Component({
  selector: 'mp-applications-list-page',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    RelativeTimePipe,
    ScrollingModule,
    StatusBadge,
    Avatar,
    Icon,
  ],
  providers: [ApplicationsListStore],
  templateUrl: './applications-list-page.html',
  styleUrl: './applications-list-page.scss',
})
export class ApplicationsListPage {
  readonly store = inject(ApplicationsListStore);
  readonly auth = inject(AuthService);

  private readonly api = inject(ApplicationsApi);
  private readonly router = inject(Router);
  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  private readonly search$ = new Subject<string>();

  readonly statuses = APPLICATION_STATUSES;
  readonly statusLabels = STATUS_LABELS;
  readonly rowHeight = ROW_HEIGHT;
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly isAdmin = computed(() => this.auth.user()?.role === 'ADMIN');

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

  /** Called by the viewport as the user scrolls; fetches ahead before the last row is reached. */
  onScrolled(): void {
    const viewport = this.viewport();
    if (!viewport) return;
    if (viewport.getRenderedRange().end >= this.store.state().items.length - PREFETCH_ROWS) {
      this.store.loadMore();
    }
  }

  trackById(_index: number, app: MerchantApplication): string {
    return app.id;
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

  actionFor(app: MerchantApplication): RowAction {
    const role = this.auth.user()?.role;
    if (role === 'SALES' && app.status === 'DRAFT') {
      return { label: 'Continue', link: ['/applications', app.id, 'edit'] };
    }
    if (role === 'REVIEWER' && (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW')) {
      return { label: 'Review', link: ['/applications', app.id] };
    }
    return { label: 'View', link: ['/applications', app.id] };
  }
}
