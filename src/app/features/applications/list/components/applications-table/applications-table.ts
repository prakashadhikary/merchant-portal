import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../../../../../shared/components/avatar/avatar';
import type { Role } from '../../../../../shared/models/user.models';
import { RelativeTimePipe } from '../../../../../shared/pipes/relative-time.pipe';
import { StatusBadge } from '../../../components/status-badge/status-badge';
import { MerchantApplication } from '../../../models/application.models';

/** Fixed row height in px; the virtual scroll strategy relies on every row being this tall. */
export const ROW_HEIGHT = 64;
/** Emit `nearEnd` when the rendered range gets this close to the last loaded row. */
export const PREFETCH_ROWS = 5;

export interface RowAction {
  readonly label: 'Continue' | 'Review' | 'View';
  readonly link: string[];
}

/**
 * Virtualized grid of applications. It renders what it is given and says when
 * the user nears the last row; fetching more is the page's job.
 */
@Component({
  selector: 'mp-applications-table',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    RelativeTimePipe,
    ScrollingModule,
    StatusBadge,
    Avatar,
  ],
  templateUrl: './applications-table.html',
  styleUrl: './applications-table.scss',
})
export class ApplicationsTable {
  readonly items = input.required<readonly MerchantApplication[]>();
  /** Rows on the server, for `aria-rowcount`; may exceed the rows loaded so far. */
  readonly total = input.required<number>();
  readonly role = input<Role>();
  readonly nearEnd = output<void>();

  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  readonly rowHeight = ROW_HEIGHT;
  readonly showCreator = computed(() => this.role() === 'ADMIN');

  checkNearEnd(): void {
    const viewport = this.viewport();
    if (!viewport) return;
    if (viewport.getRenderedRange().end >= this.items().length - PREFETCH_ROWS) {
      this.nearEnd.emit();
    }
  }

  trackById(_index: number, app: MerchantApplication): string {
    return app.id;
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
