import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'mp-forbidden-page',
  imports: [RouterLink, Icon],
  template: `
    <div class="mp-status-page">
      <div class="mp-empty-icon text-danger"><mp-icon name="lock" [size]="24" /></div>
      <h1 class="h4">Access denied</h1>
      <p class="text-secondary">Your role does not allow you to open this page.</p>
      <a class="btn btn-outline-secondary" routerLink="/applications">
        <mp-icon name="arrow-left" [size]="16" />
        Back to applications
      </a>
    </div>
  `,
})
export class ForbiddenPage {}
