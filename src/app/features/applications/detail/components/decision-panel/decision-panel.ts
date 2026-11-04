import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldError } from '../../../../../shared/components/field-error/field-error';
import { Icon } from '../../../../../shared/components/icon/icon';
import { Decision, DecisionInput } from '../../../../../shared/models/application.models';
import { noteRequiredWhenRejecting } from '../../../../../shared/validators/validators';

@Component({
  selector: 'mp-decision-panel',
  imports: [ReactiveFormsModule, FieldError, Icon],
  templateUrl: './decision-panel.html',
})
export class DecisionPanel {
  readonly busy = input(false);
  readonly decide = output<DecisionInput>();

  readonly form = new FormGroup(
    {
      decision: new FormControl<Decision | null>(null),
      note: new FormControl('', { nonNullable: true }),
    },
    { validators: [noteRequiredWhenRejecting] },
  );

  submit(decision: Decision): void {
    this.form.controls.decision.setValue(decision);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const note = this.form.controls.note.value.trim();
    this.decide.emit({ decision, note: note || undefined });
  }
}
