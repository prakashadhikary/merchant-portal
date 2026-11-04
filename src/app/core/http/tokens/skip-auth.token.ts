import { HttpContextToken } from '@angular/common/http';

/** Marks requests that must not carry a bearer token or trigger a refresh (login, refresh). */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
