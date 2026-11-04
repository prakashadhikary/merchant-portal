import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaskedField } from './masked-field';

describe('MaskedField', () => {
  beforeEach(() => vi.useFakeTimers());

  function create(
    inputs: { canReveal?: boolean; value?: string | null } = {},
  ): ComponentFixture<MaskedField> {
    const fixture = TestBed.createComponent(MaskedField);
    fixture.componentRef.setInput('label', 'Tax ID');
    fixture.componentRef.setInput('masked', '•••••••89');
    fixture.componentRef.setInput('canReveal', inputs.canReveal ?? false);
    fixture.componentRef.setInput('value', inputs.value ?? null);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<MaskedField>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function button(fixture: ComponentFixture<MaskedField>): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button');
  }

  it('shows the masked value and no button when the viewer may not reveal', () => {
    const fixture = create({ canReveal: false });
    expect(text(fixture)).toContain('•••••••89');
    expect(button(fixture)).toBeNull();
  });

  it('emits reveal when the Reveal button is clicked', () => {
    const fixture = create({ canReveal: true });
    const reveal = vi.fn<() => void>();
    fixture.componentInstance.reveal.subscribe(reveal);
    button(fixture)?.click();
    expect(reveal).toHaveBeenCalledTimes(1);
  });

  it('shows the revealed value and emits hide after 30 seconds', () => {
    const fixture = create({ canReveal: true, value: '123456789' });
    const hide = vi.fn<() => void>();
    fixture.componentInstance.hide.subscribe(hide);
    expect(text(fixture)).toContain('123456789');
    expect(button(fixture)?.textContent).toContain('Hide');

    vi.advanceTimersByTime(29_999);
    expect(hide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('emits hide immediately when Hide is clicked', () => {
    const fixture = create({ canReveal: true, value: '123456789' });
    const hide = vi.fn<() => void>();
    fixture.componentInstance.hide.subscribe(hide);
    button(fixture)?.click();
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('clears the re-mask timer when destroyed', () => {
    const fixture = create({ canReveal: true, value: '123456789' });
    const hide = vi.fn<() => void>();
    fixture.componentInstance.hide.subscribe(hide);
    fixture.destroy();
    vi.advanceTimersByTime(30_000);
    expect(hide).not.toHaveBeenCalled();
  });
});
