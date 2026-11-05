import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import type { ListRange } from '@angular/cdk/collections';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, EMPTY, switchMap } from 'rxjs';
import { Avatar } from '../../../../../shared/components/avatar/avatar';
import type { Role } from '../../../../../shared/models/user.models';
import { RelativeTimePipe } from '../../../../../shared/pipes/relative-time.pipe';
import { StatusBadge } from '../../../components/status-badge/status-badge';
import { MerchantApplication } from '../../../models/application.models';

/** Fixed row height in px; the virtual scroll strategy relies on every row being this tall. */
export const ROW_HEIGHT = 64;
/**
 * How long the rendered range must hold still before `rangeChange` emits, so
 * dragging the scrollbar across the list does not request every page it
 * passes over.
 */
export const RANGE_SETTLE_MS = 150;

export interface RowAction {
  readonly label: 'Continue' | 'Review' | 'View';
  readonly link: string[];
}

/**
 * Virtualized grid of applications that scrolls with the window. A null row
 * renders as a skeleton; the table reports which rows are on screen, and
 * fetching them is the page's job.
 */
@Component({
  selector: 'mp-applications-table',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    RelativeTimePipe,
    ScrollingModule,
    StatusBadge,
    Avatar,
  ],
  templateUrl: './applications-table.html',
  styleUrl: './applications-table.scss',
})
export class ApplicationsTable {
  /** One slot per application on the server; null until its page has arrived. */
  readonly rows = input<readonly (MerchantApplication | null)[]>([]);
  readonly role = input<Role>();
  /** Before the total is known: a few static skeleton rows instead of the virtual list. */
  readonly busy = input(false);

  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  /** The rows rendered (visible plus buffer), once the range has settled. */
  readonly rangeChange = output<ListRange>();

  readonly rowHeight = ROW_HEIGHT;
  readonly busyRows = [1, 2, 3, 4, 5];
  readonly showCreator = computed(() => this.role() === 'ADMIN');

  constructor() {
    toObservable(this.viewport)
      .pipe(
        switchMap((viewport) => viewport?.renderedRangeStream ?? EMPTY),
        debounceTime(RANGE_SETTLE_MS),
        takeUntilDestroyed(),
      )
      .subscribe((range) => this.rangeChange.emit(range));
  }

  /** Skeleton slots are keyed by position, so a row is recreated once its page arrives. */
  trackRow(index: number, app: MerchantApplication | null): string | number {
    return app?.id ?? index;
  }

  actionFor(app: MerchantApplication): RowAction {
    const role = this.role();
    if (role === 'SALES' && app.status === 'DRAFT') {
      return { label: 'Continue', link: ['/applications', app.id, 'edit'] };
    }
    if (role === 'REVIEWER' && (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW')) {
      return { label: 'Review', link: ['/applications', app.id] };
    }
    return { label: 'View', link: ['/applications', app.id] };
  }
}
