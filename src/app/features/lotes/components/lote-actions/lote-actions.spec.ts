import { TestBed } from '@angular/core/testing';

import { LoteActionsComponent } from './lote-actions';

describe('LoteActionsComponent', () => {
  it('should render all required actions and disable single-selection actions', async () => {
    await TestBed.configureTestingModule({ imports: [LoteActionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LoteActionsComponent);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Confirmar',
      'Enviar',
      'Visualizar Justificativa',
      'Incluir',
      'Alterar',
      'Excluir',
      'Visualizar',
    ]);
    expect(buttons.slice(4).every((button) => button.disabled)).toBeTrue();
  });

  it('should emit alter and view requests when one lot is selected', async () => {
    await TestBed.configureTestingModule({ imports: [LoteActionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LoteActionsComponent);
    const alterRequested = jasmine.createSpy('alterRequested');
    const viewRequested = jasmine.createSpy('viewRequested');
    fixture.componentInstance.alterRequested.subscribe(alterRequested);
    fixture.componentInstance.viewRequested.subscribe(viewRequested);
    fixture.componentRef.setInput('selectedCount', 1);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons[4].click();
    buttons[6].click();

    expect(alterRequested).toHaveBeenCalledTimes(1);
    expect(viewRequested).toHaveBeenCalledTimes(1);
  });

  it('should always allow requesting a new lot', async () => {
    await TestBed.configureTestingModule({ imports: [LoteActionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LoteActionsComponent);
    const includeRequested = jasmine.createSpy('includeRequested');
    fixture.componentInstance.includeRequested.subscribe(includeRequested);
    fixture.detectChanges();

    const includeButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.trim() === 'Incluir');

    expect(includeButton?.disabled).toBeFalse();
    includeButton?.click();
    expect(includeRequested).toHaveBeenCalledTimes(1);
  });

  it('should enable and emit multi-selection actions when lots are selected', async () => {
    await TestBed.configureTestingModule({ imports: [LoteActionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LoteActionsComponent);
    const approveRequested = jasmine.createSpy('approveRequested');
    const sendRequested = jasmine.createSpy('sendRequested');
    const justificationRequested = jasmine.createSpy('justificationRequested');
    const deleteRequested = jasmine.createSpy('deleteRequested');
    fixture.componentInstance.approveRequested.subscribe(approveRequested);
    fixture.componentInstance.sendRequested.subscribe(sendRequested);
    fixture.componentInstance.justificationRequested.subscribe(justificationRequested);
    fixture.componentInstance.deleteRequested.subscribe(deleteRequested);
    fixture.componentRef.setInput('selectedCount', 2);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    buttons[5].click();

    expect(approveRequested).toHaveBeenCalledTimes(1);
    expect(sendRequested).toHaveBeenCalledTimes(1);
    expect(justificationRequested).toHaveBeenCalledTimes(1);
    expect(deleteRequested).toHaveBeenCalledTimes(1);
    expect(buttons[4].disabled).toBeTrue();
    expect(buttons[6].disabled).toBeTrue();
  });
});
