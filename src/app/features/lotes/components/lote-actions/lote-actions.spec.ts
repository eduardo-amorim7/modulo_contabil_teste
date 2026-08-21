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
});
