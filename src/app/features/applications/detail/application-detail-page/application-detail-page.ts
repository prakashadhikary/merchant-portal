import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, merge, Observable, of, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { Loadable, LOADING, toLoadable } from '../../../../core/http/helpers/loadable';
import {
  DecisionInput,
  HistoryEntry,
  MerchantApplication,
  REVIEWABLE_STATUSES,
  SensitiveField,
} from '../../models/application.models';
import { UserRef } from '../../../../shared/models/user.models';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { Icon } from '../../../../shared/components/icon/icon';
import { MaskedField } from '../../../../shared/components/masked-field/masked-field';
import { StatusBadge } from '../../components/status-badge/status-badge';
import { ApplicationsApi } from '../../services/applications.api';
import { AssignmentPanel } from '../components/assignment-panel/assignment-panel';
import { DecisionPanel } from '../components/decision-panel/decision-panel';
import { HistoryList } from '../components/history-list/history-list';

@Component({
  selector: 'mp-application-detail-page',
  imports: [
    RouterLink,
    DecimalPipe,
    RelativeTimePipe,
    Icon,
    StatusBadge,
    MaskedField,
    DecisionPanel,
    AssignmentPanel,
    HistoryList,
  ],
  templateUrl: './application-detail-page.html',
  styleUrl: './application-detail-page.scss',
})
export class ApplicationDetailPage {
  readonly id = input.required<string>();

  private readonly api = inject(ApplicationsApi);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  private readonly reloadApplication$ = new Subject<void>();
  private readonly reloadHistory$ = new Subject<void>();

  /**
   * Detail and history are independent streams that both start on an id
   * change, so they load concurrently (and a 401 on both triggers one refresh).
   * `application` is a linkedSignal: actions write the server's response into
   * it directly, and it resets whenever the stream emits again.
   */
  private readonly applicationFromApi = toSignal(
    this.whenIdOr(this.reloadApplication$).pipe(
      switchMap((id) => this.api.get(id).pipe(toLoadable())),
    ),
    { initialValue: LOADING as Loadable<MerchantApplication> },
  );

  readonly application = linkedSignal(() => this.applicationFromApi());

  readonly history = toSignal(
    this.whenIdOr(this.reloadHistory$).pipe(
      switchMap((id) => this.api.history(id).pipe(toLoadable())),
    ),
    { initialValue: LOADING as Loadable<HistoryEntry[]> },
  );

  readonly submitted = signal(
    this.router.getCurrentNavigation()?.extras.state?.['submitted'] === true,
  );
  readonly revealed = signal<Partial<Record<SensitiveField, string>>>({});
  readonly revealing = signal<SensitiveField | null>(null);
  readonly busy = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly reviewers = toSignal(
    this.auth.hasRole('ADMIN')
      ? this.api.reviewers().pipe(
          catchError((error: unknown) => {
            this.actionError.set(errorMessage(error));
            return of<UserRef[]>([]);
          }),
        )
      : of<UserRef[]>([]),
    { initialValue: [] as UserRef[] },
  );

  private readonly loaded = computed(() => {
    const state = this.application();
    return state.status === 'loaded' ? state.data : null;
  });

  readonly canReveal = computed(() => {
    const app = this.loaded();
    const user = this.auth.user();
    if (!app || !user || app.status === 'DRAFT') return false;
    return user.role === 'ADMIN' || app.assignedReviewer?.id === user.id;
  });

  readonly canDecide = computed(() => {
    const app = this.loaded();
    const user = this.auth.user();
    if (!app || !user || user.role !== 'REVIEWER') return false;
    return app.assignedReviewer?.id === user.id && REVIEWABLE_STATUSES.includes(app.status);
  });

  readonly canAssign = computed(() => {
    const app = this.loaded();
    return !!app && this.auth.hasRole('ADMIN') && REVIEWABLE_STATUSES.includes(app.status);
  });

  readonly isOwnDraft = computed(() => {
    const app = this.loaded();
    return app?.status === 'DRAFT' && app.createdBy.id === this.auth.user()?.id;
  });

  reloadApplication(): void {
    this.reloadApplication$.next();
  }

  reloadHistory(): void {
    this.reloadHistory$.next();
  }

  reveal(field: SensitiveField): void {
    this.revealing.set(field);
    this.actionError.set(null);
    this.api.reveal(this.id(), field).subscribe({
      next: (result) => {
        this.revealed.update((values) => ({ ...values, [result.field]: result.value }));
        this.revealing.set(null);
        this.reloadHistory();
      },
      error: (error: unknown) => {
        this.actionError.set(errorMessage(error));
        this.revealing.set(null);
      },
    });
  }

  hide(field: SensitiveField): void {
    this.revealed.update((values) => {
      const next = { ...values };
      delete next[field];
      return next;
    });
  }

  assign(reviewerId: string): void {
    this.apply(this.api.assign(this.id(), reviewerId));
  }

  decide(input: DecisionInput): void {
    this.apply(this.api.decide(this.id(), input));
  }

  private apply(action: Observable<MerchantApplication>): void {
    this.busy.set(true);
    this.actionError.set(null);
    action.subscribe({
      next: (updated) => {
        this.application.set({ status: 'loaded', data: updated });
        this.busy.set(false);
        this.reloadHistory();
      },
      error: (error: unknown) => {
        this.actionError.set(errorMessage(error));
        this.busy.set(false);
      },
    });
  }

  private whenIdOr(reload$: Observable<void>): Observable<string> {
    return merge(toObservable(this.id), reload$.pipe(map(() => this.id())));
  }
}
