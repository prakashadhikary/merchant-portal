import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ApplicationData,
  ApplicationsQuery,
  DecisionInput,
  HistoryEntry,
  MerchantApplication,
  Page,
  RevealResult,
  SensitiveField,
} from '../models/application.models';
import type { UserRef } from '../../../shared/models/user.models';

/** Thin typed wrapper over the HTTP endpoints; no state, no error handling. */
@Injectable({ providedIn: 'root' })
export class ApplicationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/applications';

  list(query: ApplicationsQuery): Observable<Page<MerchantApplication>> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.q) params = params.set('q', query.q);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<Page<MerchantApplication>>(this.base, { params });
  }

  createDraft(): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(this.base, {});
  }

  get(id: string): Observable<MerchantApplication> {
    return this.http.get<MerchantApplication>(`${this.base}/${id}`);
  }

  saveDraft(id: string, data: ApplicationData): Observable<MerchantApplication> {
    return this.http.put<MerchantApplication>(`${this.base}/${id}`, data);
  }

  submit(id: string): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(`${this.base}/${id}/submit`, {});
  }

  history(id: string): Observable<HistoryEntry[]> {
    return this.http.get<HistoryEntry[]>(`${this.base}/${id}/history`);
  }

  reveal(id: string, field: SensitiveField): Observable<RevealResult> {
    return this.http.get<RevealResult>(`${this.base}/${id}/reveal/${field}`);
  }

  reviewers(): Observable<UserRef[]> {
    return this.http.get<UserRef[]>('/api/reviewers');
  }

  assign(id: string, reviewerId: string): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(`${this.base}/${id}/assign`, { reviewerId });
  }

  decide(id: string, input: DecisionInput): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(`${this.base}/${id}/decision`, input);
  }
}
