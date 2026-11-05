import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Role } from '../../../../../shared/models/user.models';
import { makeApplication, makeDraft } from '../../../../../../testing/fixtures';
import { MerchantApplication } from '../../../models/application.models';
import { ApplicationsTable } from './applications-table';

describe('ApplicationsTable', () => {
  let fixture: ComponentFixture<ApplicationsTable>;

  /** Lets the virtual scroll viewport measure itself and render its first rows. */
  async function render(items: MerchantApplication[], role?: Role, total = items.length) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ApplicationsTable);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function actionLabels(): string[] {
    return Array.from(el().querySelectorAll('.mp-col-action a')).map(
      (a) => a.textContent?.trim() ?? '',
    );
  }

  it('renders a row per loaded application and reports the server total', async () => {
    await render(
      [
        makeApplication({
          business: { ...makeApplication().business, legalName: 'Everest Coffee' },
        }),
      ],
      'ADMIN',
      30,
    );
    expect(el().textContent).toContain('Everest Coffee');
    expect(el().querySelector('[role="table"]')?.getAttribute('aria-rowcount')).toBe('30');
  });

  it('shows the Created-by column to ADMIN only', async () => {
    await render([makeApplication()], 'ADMIN');
    expect(el().textContent).toContain('Created by');

    TestBed.resetTestingModule();
    await render([makeApplication()], 'REVIEWER');
    expect(el().textContent).not.toContain('Created by');
  });

  it('offers Continue on a SALES draft and Review on a REVIEWER submission', async () => {
    await render([makeDraft()], 'SALES');
    expect(actionLabels()).toEqual(['Continue']);

    TestBed.resetTestingModule();
    await render([makeApplication({ status: 'SUBMITTED' })], 'REVIEWER');
    expect(actionLabels()).toEqual(['Review']);

    TestBed.resetTestingModule();
    await render([makeApplication({ status: 'APPROVED' })], 'REVIEWER');
    expect(actionLabels()).toEqual(['View']);
  });

  it('emits nearEnd once the rendered rows reach the last loaded ones', async () => {
    await render([makeApplication()], 'ADMIN', 30);
    const nearEnd = vi.fn();
    fixture.componentInstance.nearEnd.subscribe(nearEnd);
    fixture.componentInstance.checkNearEnd();
    expect(nearEnd).toHaveBeenCalledOnce();
  });
});
