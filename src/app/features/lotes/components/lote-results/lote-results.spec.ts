import { TestBed } from '@angular/core/testing';

import { Lote } from '../../models/lote.model';
import { LoteResultsComponent } from './lote-results';

const ITEMS: readonly Lote[] = [
  {
    idLote: 3,
    dataEntrada: '28/04/2026',
    valor: 1250,
    quantidadeLancamentos: 1,
    usuarioRegistro: 'maria.silva',
    usuarioAprovacao: null,
    situacaoLote: 'Aberto',
    dataHoraSituacaoLote: '28/04/2026 09:14:22',
  },
  {
    idLote: 4,
    dataEntrada: '29/04/2026',
    valor: 875.5,
    quantidadeLancamentos: 2,
    usuarioRegistro: 'joao.pereira',
    usuarioAprovacao: 'renata.alves',
    situacaoLote: 'Confirmado',
    dataHoraSituacaoLote: '29/04/2026 10:32:15',
  },
];

describe('LoteResultsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoteResultsComponent] }).compileComponents();
  });

  it('should render every result column and format BRL values', () => {
    const fixture = TestBed.createComponent(LoteResultsComponent);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('totalItems', 2);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const headers = Array.from(compiled.querySelectorAll('th')).map((header) =>
      header.textContent?.trim(),
    );

    expect(headers).toEqual([
      '',
      'ID Lote',
      'Data Entrada',
      'Valor',
      'Quant. Lançamentos',
      'Usuário Registro',
      'Usuário Aprovação',
      'Situação Lote',
      'Data/Hora Situação Lote',
    ]);
    expect(compiled.querySelector('.value-cell')?.textContent).toContain('1.250,00');
    expect(compiled.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('should select all visible rows while preserving an existing selection', () => {
    const fixture = TestBed.createComponent(LoteResultsComponent);
    const selectionChanged = jasmine.createSpy('selectionChanged');
    fixture.componentInstance.selectionChanged.subscribe(selectionChanged);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('selectedIds', new Set([99]));
    fixture.detectChanges();

    const selectAll = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'thead .selection-checkbox',
    );
    selectAll?.click();

    const emittedSelection = selectionChanged.calls.mostRecent().args[0] as ReadonlySet<number>;
    expect([...emittedSelection]).toEqual([99, 3, 4]);
  });

  it('should render loading and error feedback accessibly', () => {
    const fixture = TestBed.createComponent(LoteResultsComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(compiled.textContent).toContain('Consultando lotes');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', 'Falha simulada');
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Falha simulada');
    expect(compiled.querySelector('.retry-button')).not.toBeNull();
  });

  it('should keep the total visible while only the page is loading', () => {
    const fixture = TestBed.createComponent(LoteResultsComponent);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('totalItems', 20);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('searching', false);
    fixture.detectChanges();

    const summary = (fixture.nativeElement as HTMLElement).querySelector('.results-summary');

    expect(summary?.textContent).toContain('20');
    expect(summary?.textContent).toContain('lotes encontrados');
    expect(summary?.textContent).not.toContain('Consultando lotes');
  });
});
