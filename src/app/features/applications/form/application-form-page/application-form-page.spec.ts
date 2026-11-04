import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { seedSession } from '../../../../../testing/auth';
import { makeDraft } from '../../../../../testing/fixtures';
import { ApplicationFormPage } from './application-form-page';

describe('ApplicationFormPage', () => {
  let fixture: ComponentFixture<ApplicationFormPage>;
  let http: HttpTestingController;

  const completeDraft = makeDraft({
    business: {
      legalName: 'Everest Coffee House',
      registrationNumber: 'REG-2024-12345',
      taxId: '123456789',
      website: 'https://example.com',
    },
    contacts: {
      contactEmail: 'owner@example.com',
      contactPhone: '+9779812345678',
      bankName: 'Nabil Bank',
      accountNumber: '1234567890123456',
      expectedMonthlyVolume: 250000,
      maxTransactionAmount: 20000,
    },
  });

  function render(): void {
    seedSession('SALES');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ApplicationFormPage);
    fixture.componentRef.setInput('id', completeDraft.id);
    fixture.detectChanges();
    http.expectOne(`/api/applications/${completeDraft.id}`).flush(completeDraft);
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement | undefined {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((b) => b.textContent?.trim() === label);
  }

  it('relies on auto-save alone, with no manual save button', () => {
    render();
    expect(button('Next')).toBeDefined();
    expect(button('Save draft')).toBeUndefined();
  });

  it('keeps Submit disabled until the whole form, declaration included, is valid', () => {
    render();
    fixture.componentInstance.goTo('review');
    fixture.detectChanges();
    expect(button('Submit application')?.disabled).toBe(true);

    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#declaration')!.click();
    fixture.detectChanges();
    expect(button('Submit application')?.disabled).toBe(false);
  });
});
