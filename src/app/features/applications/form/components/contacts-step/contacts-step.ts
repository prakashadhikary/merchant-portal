import { Component, input } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { BANKS } from '../../../../../shared/models/application.models';
import { FieldError } from '../../../../../shared/components/field-error/field-error';
import { ContactsForm } from '../../helpers/application-form.helper';

@Component({
  selector: 'mp-contacts-step',
  imports: [ReactiveFormsModule, FieldError],
  templateUrl: './contacts-step.html',
})
export class ContactsStep {
  readonly form = input.required<ContactsForm>();
  readonly banks = BANKS;

  invalid(control: AbstractControl): boolean {
    return control.touched && control.invalid;
  }
}
