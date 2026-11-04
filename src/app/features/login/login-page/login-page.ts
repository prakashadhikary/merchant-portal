import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DEMO_USERS, SEED_SIZES } from '../../../../mocks/data/mock-data';
import { readSeedSize, resetDb } from '../../../../mocks/data/mock-db';
import { AuthService } from '../../../core/auth/services/auth.service';
import { errorMessage } from '../../../core/http/helpers/api-error';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Icon } from '../../../shared/components/icon/icon';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../../shared/models/user.models';

@Component({
  selector: 'mp-login-page',
  imports: [ReactiveFormsModule, DecimalPipe, Avatar, Icon],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly demoUsers = Object.values(DEMO_USERS);
  readonly roleLabels = ROLE_LABELS;
  readonly roleDescriptions = ROLE_DESCRIPTIONS;
  readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly seedSizes = SEED_SIZES;
  readonly seedSize = signal(readSeedSize());
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  signInWithEmail(): void {
    this.email.markAsTouched();
    if (this.email.valid) this.signIn(this.email.value);
  }

  signIn(email: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(email).subscribe({
      next: () => void this.router.navigateByUrl(this.returnUrl()),
      error: (error: unknown) => {
        this.error.set(errorMessage(error));
        this.busy.set(false);
      },
    });
  }

  setSeedSize(value: string): void {
    const size = SEED_SIZES.find((s) => s === Number(value));
    if (size) this.seedSize.set(size);
  }

  resetDemoData(): void {
    resetDb(this.seedSize());
    this.notice.set(
      `Demo data has been reset with ${this.seedSize().toLocaleString('en')} applications.`,
    );
  }

  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url?.startsWith('/') && !url.startsWith('//') ? url : '/applications';
  }
}
