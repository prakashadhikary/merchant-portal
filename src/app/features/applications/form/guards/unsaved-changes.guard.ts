import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ApplicationFormPage } from '../application-form-page/application-form-page';

export const unsavedChangesGuard: CanDeactivateFn<ApplicationFormPage> = (page) => {
  const authService = inject(AuthService);

  if (!authService.isSignedIn() || !page.store.hasUnsavedChanges()) return true;

  return window.confirm('Your draft has unsaved changes. Leave anyway?');
};
