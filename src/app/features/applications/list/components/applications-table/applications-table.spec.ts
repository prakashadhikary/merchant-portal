import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { Role } from '../../../../../shared/models/user.models';
import { makeApplication, makeDraft } from '../../../../../../testing/fixtures';
import { MerchantApplication } from '../../../models/application.models';
import { ApplicationsTable, RANGE_SETTLE_MS } from './applications-table';

describe('ApplicationsTable', () => {
  let fixture: ComponentFixture<ApplicationsTable>;

  /** Lets the virtual scroll viewport measure itself and render its first rows. */
  async function render(rows: (MerchantApplication | null)[], role?: Role) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ApplicationsTable);
    fixture.componentRef.setInput('rows', rows);
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

  it('renders loaded rows, a skeleton for each unloaded one, and every row in the count', async () => {
    await render(
      [
        makeApplication({
          business: { ...makeApplication().business, legalName: 'Everest Coffee' },
        }),
        ...Array<null>(29).fill(null),
      ],
      'ADMIN',
    );
    expect(el().textContent).toContain('Everest Coffee');
    expect(el().querySelector('[role="table"]')?.getAttribute('aria-rowcount')).toBe('30');
    expect(el().querySelectorAll('[role="row"][aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it('shows static skeleton rows, with no virtual list, while busy', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ApplicationsTable);
    fixture.componentRef.setInput('busy', true);
    fixture.componentRef.setInput('role', 'SALES');
    fixture.detectChanges();
    const grid = el().querySelector('[role="table"]');
    expect(grid?.getAttribute('aria-busy')).toBe('true');
    expect(grid?.hasAttribute('aria-rowcount')).toBe(false);
    expect(fixture.debugElement.query(By.directive(CdkVirtualScrollViewport))).toBeNull();
    expect(el().querySelectorAll('.mp-grid-row:not(.mp-grid-row-head)')).toHaveLength(5);
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

  it('emits the rendered range only once it has settled', async () => {
    await render([makeApplication(), ...Array<null>(99).fill(null)], 'ADMIN');
    const rangeChange = vi.fn();
    fixture.componentInstance.rangeChange.subscribe(rangeChange);
    const viewport = fixture.debugElement
      .query(By.directive(CdkVirtualScrollViewport))
      .injector.get(CdkVirtualScrollViewport);

    // jsdom has no layout; let the viewport's first scroll check (an animation
    // frame) run before standing in for the user dragging down the list.
    await new Promise((resolve) => setTimeout(resolve, RANGE_SETTLE_MS));
    expect(rangeChange).toHaveBeenCalledWith(expect.objectContaining({ start: 0 }));
    rangeChange.mockClear();

    viewport.setRenderedRange({ start: 40, end: 50 });
    viewport.setRenderedRange({ start: 90, end: 100 });
    expect(rangeChange).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, RANGE_SETTLE_MS));
    expect(rangeChange).toHaveBeenCalledExactlyOnceWith({ start: 90, end: 100 });
  });
});
