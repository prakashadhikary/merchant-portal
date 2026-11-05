import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { errorMessage } from '../../../../core/http/helpers/api-error';
import { LOADING, toLoadable } from '../../../../core/http/helpers/loadable';
import { FieldError } from '../../../../shared/components/field-error/field-error';
import { Icon } from '../../../../shared/components/icon/icon';
import { BusinessStep } from '../components/business-step/business-step';
import { ContactsStep } from '../components/contacts-step/contacts-step';
import {
  canEnterStep,
  STEP_LABELS,
  stepGroup,
  APPLICATION_FORM_STEPS,
  ApplicationFormStep,
} from '../helpers/application-form.helper';
import { ApplicationFormStore } from '../services/application-form.store';

type StepState = 'current' | 'complete' | 'upcoming';

@Component({
  selector: 'mp-application-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    FieldError,
    Icon,
    BusinessStep,
    ContactsStep,
  ],
  providers: [ApplicationFormStore],
  templateUrl: './application-form-page.html',
  styleUrl: './application-form-page.scss',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class ApplicationFormPage {
  readonly id = input.required<string>();
  readonly store = inject(ApplicationFormStore);
  private readonly router = inject(Router);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  readonly steps = APPLICATION_FORM_STEPS;
  readonly stepLabels = STEP_LABELS;
  readonly form = this.store.form;
  readonly step = signal<ApplicationFormStep>('business');
  readonly stepIndex = computed(() => APPLICATION_FORM_STEPS.indexOf(this.step()));
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly loadState = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.store.load(id).pipe(toLoadable()))),
    { initialValue: LOADING },
  );

  constructor() {
    // Only drafts are editable; anything else opens read-only.
    effect(() => {
      const state = this.loadState();
      if (state.status === 'loaded' && state.data.status !== 'DRAFT') {
        void this.router.navigate(['/applications', state.data.id], { replaceUrl: true });
      }
    });
  }

  canGoTo(step: ApplicationFormStep): boolean {
    return canEnterStep(this.form, step);
  }

  stepState(step: ApplicationFormStep): StepState {
    if (step === this.step()) return 'current';
    return stepGroup(this.form, step).valid && step !== 'review' ? 'complete' : 'upcoming';
  }

  goTo(step: ApplicationFormStep | undefined): void {
    if (!step || !this.canGoTo(step)) return;
    this.step.set(step);
    // Focus the heading so assistive technology announces the new step.
    this.heading()?.nativeElement.focus();
    this.store.saveNow();
  }

  next(): void {
    const current = stepGroup(this.form, this.step());
    current.markAllAsTouched();
    if (current.valid) this.goTo(APPLICATION_FORM_STEPS[this.stepIndex() + 1]);
  }

  back(): void {
    this.goTo(APPLICATION_FORM_STEPS[this.stepIndex() - 1]);
  }

  onSubmit(): void {
    if (this.step() !== 'review') {
      this.next();
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.store.submit().subscribe({
      next: (app) => {
        this.store.saveStatus.set({ kind: 'idle' });
        void this.router.navigate(['/applications', app.id], { state: { submitted: true } });
      },
      error: (error: unknown) => {
        this.submitError.set(errorMessage(error));
        this.submitting.set(false);
      },
    });
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.store.hasUnsavedChanges()) event.preventDefault();
  }
}
