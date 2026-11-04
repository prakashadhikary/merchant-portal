import { Component, input } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { FieldError } from '../../../../../shared/components/field-error/field-error';
import { BusinessForm } from '../../helpers/application-form.helper';

@Component({
  selector: 'mp-business-step',
  imports: [ReactiveFormsModule, FieldError],
  templateUrl: './business-step.html',
})
export class BusinessStep {
  readonly form = input.required<BusinessForm>();

  invalid(control: AbstractControl): boolean {
    return control.touched && control.invalid;
  }
}
