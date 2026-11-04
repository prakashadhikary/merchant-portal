import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'mp-not-found-page',
  imports: [RouterLink, Icon],
  template: `
    <div class="mp-status-page">
      <div class="mp-empty-icon"><mp-icon name="search" [size]="24" /></div>
      <h1 class="h4">Page not found</h1>
      <p class="text-secondary">The address may be wrong or the page may have moved.</p>
      <a class="btn btn-outline-secondary" routerLink="/applications">
        <mp-icon name="arrow-left" [size]="16" />
        Back to applications
      </a>
    </div>
  `,
})
export class NotFoundPage {}
