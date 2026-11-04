import { HttpErrorResponse } from '@angular/common/http';

/** The only place that reads HttpErrorResponse; everything else sees a message. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (typeof body === 'object' && body !== null) {
      const message = (body as Record<string, unknown>)['message'];
      if (typeof message === 'string') return message;
    }
    return error.status === 0 ? 'Network error' : `Request failed (${error.status})`;
  }
  return 'Unexpected error';
}

export function isStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}
