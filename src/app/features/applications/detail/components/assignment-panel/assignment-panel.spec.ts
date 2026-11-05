import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEMO_USERS, toRef } from '../../../../../../mocks/data/mock-data';
import { AssignmentPanel } from './assignment-panel';

describe('AssignmentPanel', () => {
  let fixture: ComponentFixture<AssignmentPanel>;
  const rita = toRef(DEMO_USERS.REVIEWER);
  const other = { id: 'u-other', name: 'Other Reviewer' };

  function select(): HTMLSelectElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector('select');
    if (!element) throw new Error('select missing');
    return element;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentPanel);
  });

  it('preselects the currently assigned reviewer', () => {
    fixture.componentRef.setInput('reviewers', [rita, other]);
    fixture.componentRef.setInput('current', rita);
    fixture.detectChanges();
    expect(select().value).toBe(rita.id);
  });

  it('selects the current reviewer once the reviewer list arrives', () => {
    fixture.componentRef.setInput('reviewers', []);
    fixture.componentRef.setInput('current', rita);
    fixture.detectChanges();
    fixture.componentRef.setInput('reviewers', [rita, other]);
    fixture.detectChanges();
    expect(select().value).toBe(rita.id);
  });
});
