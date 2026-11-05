import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { DecisionInput } from '../../../models/application.models';
import { DecisionPanel } from './decision-panel';

describe('DecisionPanel', () => {
  let fixture: ComponentFixture<DecisionPanel>;
  let decide: Mock<(value: DecisionInput) => void>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DecisionPanel);
    decide = vi.fn<(value: DecisionInput) => void>();
    fixture.componentInstance.decide.subscribe(decide);
    fixture.detectChanges();
  });

  function click(label: string): void {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    buttons.find((b) => b.textContent?.trim() === label)?.click();
    fixture.detectChanges();
  }

  function typeNote(value: string): void {
    const textarea = (fixture.nativeElement as HTMLElement).querySelector('textarea');
    if (!textarea) throw new Error('textarea missing');
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
  }

  it('approves without a note', () => {
    click('Approve');
    expect(decide).toHaveBeenCalledWith({ decision: 'APPROVE', note: undefined });
  });

  it('refuses to reject with a short note and shows the rule', () => {
    typeNote('too short');
    click('Reject');
    expect(decide).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'A note of at least 10 characters is required when rejecting',
    );
  });

  it('rejects with a long enough note', () => {
    typeNote('Registration could not be verified.');
    click('Reject');
    expect(decide).toHaveBeenCalledWith({
      decision: 'REJECT',
      note: 'Registration could not be verified.',
    });
  });
});
