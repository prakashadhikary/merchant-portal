import { Component, inject, isDevMode } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Icon } from '../../shared/components/icon/icon';
import { ROLE_LABELS } from '../../shared/models/user.models';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'mp-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar, Icon],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly devMode = isDevMode();
  readonly roleLabels = ROLE_LABELS;

  /** The /logout route ends the session; see signOutGuard for why the layout does not. */
  signOut(): Promise<boolean> {
    return this.router.navigateByUrl('/logout');
  }
}
