import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEMO_USERS, toRef } from '../../../../../mocks/data/mock-data';
import { seedSession } from '../../../../../testing/auth';
import { makeApplication, makeHistoryEntry } from '../../../../../testing/fixtures';
import type { MerchantApplication } from '../../../../shared/models/application.models';
import type { Role } from '../../../../shared/models/user.models';
import { ApplicationDetailPage } from './application-detail-page';

describe('ApplicationDetailPage', () => {
  let fixture: ComponentFixture<ApplicationDetailPage>;
  let http: HttpTestingController;

  function render(role: Role, application: MerchantApplication): void {
    seedSession(role);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ApplicationDetailPage);
    fixture.componentRef.setInput('id', application.id);
    fixture.detectChanges();

    // Detail and history are requested together, before either answers.
    const detail = http.expectOne(`/api/applications/${application.id}`);
    const history = http.expectOne(`/api/applications/${application.id}/history`);
    detail.flush(application);
    history.flush([makeHistoryEntry()]);
    fixture.detectChanges();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function hasReveal(): boolean {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).some(
      (b) => b.textContent?.trim() === 'Reveal',
    );
  }

  const underReview = makeApplication({
    status: 'UNDER_REVIEW',
    assignedReviewer: toRef(DEMO_USERS.REVIEWER),
  });

  it('gives the assigned reviewer reveal buttons and the decision panel', () => {
    render('REVIEWER', underReview);
    expect(hasReveal()).toBe(true);
    expect(text()).toContain('Risk decision');
    expect(text()).not.toContain('Assignment');
    expect(text()).toContain('Created by Sita Gurung');
  });

  it('gives SALES neither reveal buttons nor review controls', () => {
    render('SALES', underReview);
    expect(hasReveal()).toBe(false);
    expect(text()).not.toContain('Risk decision');
    expect(text()).not.toContain('Assignment');
    expect(text()).toContain('•••••••89');
  });

  it('gives ADMIN the assignment panel while reviewable, and never the decision panel', () => {
    render('ADMIN', underReview);
    http.expectOne('/api/reviewers').flush([toRef(DEMO_USERS.REVIEWER)]);
    fixture.detectChanges();
    expect(text()).toContain('Assignment');
    expect(text()).not.toContain('Risk decision');
    expect(hasReveal()).toBe(true);
  });

  it('shows no review controls once a decision has been recorded', () => {
    render('REVIEWER', { ...underReview, status: 'APPROVED' });
    expect(text()).not.toContain('Risk decision');
  });

  it('reveals a value and refreshes only the history, which then shows the audit entry', () => {
    render('REVIEWER', underReview);
    fixture.componentInstance.reveal('taxId');
    http
      .expectOne(`/api/applications/${underReview.id}/reveal/taxId`)
      .flush({ field: 'taxId', value: '123456789' });
    fixture.detectChanges();
    expect(text()).toContain('123456789');

    http.expectNone(`/api/applications/${underReview.id}`);
    http.expectOne(`/api/applications/${underReview.id}/history`).flush([
      makeHistoryEntry({
        id: 'H-2',
        type: 'REVEALED',
        actor: toRef(DEMO_USERS.REVIEWER),
        detail: 'Tax ID',
      }),
    ]);
    fixture.detectChanges();
    expect(text()).toContain('Tax ID revealed by Rita Shrestha');
  });

  it('applies the server response after a decision and drops the decision panel', () => {
    render('REVIEWER', underReview);
    fixture.componentInstance.decide({ decision: 'APPROVE' });
    const req = http.expectOne({
      method: 'POST',
      url: `/api/applications/${underReview.id}/decision`,
    });
    expect(req.request.body).toEqual({ decision: 'APPROVE' });
    req.flush({ ...underReview, status: 'APPROVED' });
    http.expectOne(`/api/applications/${underReview.id}/history`).flush([makeHistoryEntry()]);
    fixture.detectChanges();
    expect(text()).toContain('Approved');
    expect(text()).not.toContain('Risk decision');
  });
});
