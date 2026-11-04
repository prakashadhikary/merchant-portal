import { Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';
import { firstErrorMessage } from '../../helpers/error-messages';

/**
 * Shows the first validation message of a control once it has been touched.
 * It listens to the control's own event stream, so it updates under zoneless
 * change detection without the parent having to re-render it.
 */
@Component({
  selector: 'mp-field-error',
  template: `
    @if (message(); as message) {
      <div class="invalid-feedback d-block">{{ message }}</div>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();
  readonly messages = input<Partial<Record<string, string>>>({});

  readonly message = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) =>
        control.events.pipe(
          startWith(null),
          map(() =>
            control.touched && control.invalid
              ? firstErrorMessage(control.errors, this.messages())
              : null,
          ),
        ),
      ),
    ),
    { initialValue: null },
  );
}
