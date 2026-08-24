import { TestBed } from '@angular/core/testing';

import { LancamentoLote } from '../../models/lote.model';
import { LancamentoModalComponent } from './lancamento-modal';

const EXISTING_LANCAMENTO: LancamentoLote = {
  idLancamento: 3001,
  idLote: 3,
  contaCorrente: '44444',
  titularConta: 'Cooperativa Central',
  valor: 1250,
  historico: 'Crédito de ajuste contábil',
  estorno: false,
  documento: 'DOC-3001',
  descricao: 'Lançamento existente',
  situacao: 'Pendente',
  pa: 'Cooperativa',
  tipoDocumentoCsc: 'Documento interno',
  idEvento: 102,
  codigoEvento: 300,
  descricaoEvento: 'Centralização Título CSC Crédito',
  complementoHistorico: 'Complemento existente',
  idDocumentoCsc: '',
  situacaoDocumentoCsc: 'Aguardando Processamento CCO',
  anexos: [],
};

describe('LancamentoModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LancamentoModalComponent],
    }).compileComponents();
  });

  it('should expose a reusable input/output contract and emit a valid new entry', () => {
    const fixture = TestBed.createComponent(LancamentoModalComponent);
    const saved = jasmine.createSpy('saved');
    fixture.componentRef.setInput('mode', 'incluir');
    fixture.componentRef.setInput('idLote', 3);
    fixture.componentRef.setInput('nextLancamentoId', 3002);
    fixture.componentInstance.saved.subscribe(saved);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const eventSearchButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.event-search button',
    );

    expect(eventSearchButton?.disabled).toBeFalse();

    component.lancamentoForm.patchValue({
      valor: 75.5,
      historico: 'Lançamento Manual',
      documento: 'DOC-NOVO',
      complementoHistorico: 'Novo lançamento isolado',
    });
    component.selectEvento(102);
    component.confirmEventoSelection();
    component.submitLancamento();

    expect(saved).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        lancamento: jasmine.objectContaining({
          idLancamento: 3002,
          idLote: 3,
          valor: 75.5,
          documento: 'DOC-NOVO',
        }),
        manterDadosTela: false,
      }),
    );
  });

  it('should initialize existing data in read-only visualization mode', () => {
    const fixture = TestBed.createComponent(LancamentoModalComponent);
    fixture.componentRef.setInput('mode', 'visualizar');
    fixture.componentRef.setInput('initialLancamento', EXISTING_LANCAMENTO);
    fixture.componentRef.setInput('idLote', 3);
    fixture.componentRef.setInput('nextLancamentoId', 3002);
    fixture.detectChanges();

    expect(fixture.componentInstance.lancamentoForm.disabled).toBeTrue();
    expect(fixture.componentInstance.lancamentoForm.getRawValue()).toEqual(
      jasmine.objectContaining({
        documento: 'DOC-3001',
        valor: 1250,
        idEvento: '102',
      }),
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Visualizar lançamento');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.modal-primary-button'),
    ).toBeNull();
  });
});
