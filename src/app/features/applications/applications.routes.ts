import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards/auth.guard';
import { ApplicationDetailPage } from './detail/application-detail-page/application-detail-page';
import { ApplicationsListPage } from './list/applications-list-page/applications-list-page';
import { unsavedChangesGuard } from './form/guards/unsaved-changes.guard';
import { ApplicationFormPage } from './form/application-form-page/application-form-page';

export const APPLICATIONS_ROUTES: Routes = [
  { path: '', component: ApplicationsListPage },
  {
    path: ':id/edit',
    component: ApplicationFormPage,
    canActivate: [roleGuard('SALES')],
    canDeactivate: [unsavedChangesGuard],
  },
  { path: ':id', component: ApplicationDetailPage },
];
