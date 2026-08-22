import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { MAX_SAFE_CURRENCY_VALUE } from '../../../../shared/validators/input-value.validators';
import { LancamentoModalComponent } from '../../components/lancamento-modal/lancamento-modal';
import { LOTE_TOTAL_LIMIT_ERROR_MESSAGE, LotesService } from '../../services/lotes.service';
import { LoteDetailPage } from './lote-detail-page';

describe('LoteDetailPage', () => {
  async function createComponent(idLote = 3, mode = 'visualizar') {
    await TestBed.configureTestingModule({
      imports: [LoteDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { mode },
              paramMap: convertToParamMap({ idLote }),
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoteDetailPage);
    fixture.detectChanges();

    return fixture;
  }

  function getModal(fixture: ComponentFixture<LoteDetailPage>): LancamentoModalComponent {
    const modal = fixture.debugElement.query(By.directive(LancamentoModalComponent));

    if (!modal) {
      throw new Error('O modal de lançamento não foi renderizado.');
    }

    return modal.componentInstance as LancamentoModalComponent;
  }

  function openCreateModal(fixture: ComponentFixture<LoteDetailPage>): LancamentoModalComponent {
    fixture.componentInstance.openCreateModal();
    fixture.detectChanges();

    return getModal(fixture);
  }

  it('should render the selected lot and every requested entry column', async () => {
    const fixture = await createComponent(3, 'alterar');
    const compiled = fixture.nativeElement as HTMLElement;
    const headers = Array.from(compiled.querySelectorAll('th:not(.selection-cell)')).map((header) =>
      header.textContent?.trim(),
    );

    expect(compiled.querySelector('.detail-heading h2')?.textContent).toContain('Lote');
    expect(compiled.textContent).toContain('Nr. Lote CCO');
    expect(compiled.textContent).toContain('Situação do lote');
    expect(compiled.textContent).toContain('Instituição');
    expect(compiled.textContent).toContain('Evento e Anexo por lote');
    expect(headers).toEqual([
      'ID lançamento',
      'PA',
      'Conta Corrente',
      'Valor',
      'Histórico',
      'Situação Documento CSC',
    ]);
    expect(compiled.textContent).toContain('3001');
    expect(compiled.querySelector('.value-cell')?.textContent).toContain('R$');
    expect(compiled.querySelector('.value-cell')?.textContent).toContain('1.250,00');

    const actionButtons = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.launch-actions button'),
    ).map((button) => button.textContent?.trim());
    expect(actionButtons).toEqual(['Duplicar', 'Visualizar', 'Incluir', 'Alterar', 'Excluir']);
    expect(compiled.querySelector('.launch-action-button--duplicate')).not.toBeNull();
    expect(compiled.querySelector('.launch-actions__group')).not.toBeNull();

    const detailActions = Array.from(
      compiled.querySelectorAll<HTMLElement>('.detail-actions button, .detail-actions a'),
    ).map((button) => button.textContent?.trim());
    expect(detailActions).toEqual(['Gravar', 'Cancelar']);
    expect(compiled.querySelector('.mode-badge')).toBeNull();
    expect(fixture.componentInstance.loteForm.controls.numeroLoteCco.enabled).toBeTrue();
    expect(fixture.componentInstance.loteForm.controls.idLote.disabled).toBeTrue();
    expect(fixture.componentInstance.loteForm.controls.instituicao.enabled).toBeTrue();
    expect(fixture.componentInstance.loteForm.controls.instituicao.value).toBe(
      fixture.componentInstance.lote?.instituicao ?? '',
    );
    expect(fixture.componentInstance.loteForm.controls.eventoAnexoPorLote.enabled).toBeTrue();

    const circularToggle = compiled.querySelector<HTMLInputElement>(
      '#detail-evento-anexo-por-lote',
    );
    expect(circularToggle?.type).toBe('checkbox');
    expect(circularToggle?.classList).toContain('circular-toggle');
  });

  it('should create a lot without entries and return to the listing after 0.5 seconds', async () => {
    jasmine.clock().install();
    const fixture = await createComponent(0, 'incluir');

    try {
      const component = fixture.componentInstance;
      const router = TestBed.inject(Router);
      const navigate = spyOn(router, 'navigate').and.resolveTo(true);
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.detail-heading h2')?.textContent).toContain('Novo lote');
      expect(compiled.textContent).not.toContain('ID lote');
      expect(compiled.textContent).not.toContain('ID lançamento');
      expect(compiled.textContent).not.toContain('Situação do lote');
      expect(compiled.textContent).toContain('Data de entrada (automática)');
      expect(component.lancamentos()).toEqual([]);
      expect(component.loteForm.controls.instituicao.hasError('required')).toBeTrue();

      component.loteForm.patchValue({
        numeroLoteCco: 'CCO-NOVO-TESTE',
        instituicao: '0002 - SICOOB CENTRAL',
        eventoAnexoPorLote: true,
      });
      component.saveLote();
      fixture.detectChanges();

      expect(component.saving()).toBeTrue();
      expect(compiled.textContent).toContain('Lote criado com sucesso.');
      expect(navigate).not.toHaveBeenCalled();

      jasmine.clock().tick(499);
      expect(navigate).not.toHaveBeenCalled();
      jasmine.clock().tick(1);
      expect(navigate).toHaveBeenCalledOnceWith(['/']);
    } finally {
      fixture.destroy();
      jasmine.clock().uninstall();
    }
  });

  it('should show field errors when the user tries to save an invalid new lot', async () => {
    const fixture = await createComponent(0, 'incluir');
    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const saveButton = compiled.querySelector<HTMLButtonElement>(
      '.save-button',
    ) as HTMLButtonElement;

    expect(component.loteForm.invalid).toBeTrue();
    expect(saveButton.disabled).toBeFalse();
    expect(compiled.querySelectorAll('.detail-field-error').length).toBe(0);

    saveButton.click();
    fixture.detectChanges();

    expect(component.loteForm.controls.numeroLoteCco.touched).toBeTrue();
    expect(component.loteForm.controls.instituicao.touched).toBeTrue();
    expect(compiled.textContent).toContain('Informe o Nr. Lote CCO com até 30 caracteres.');
    expect(compiled.textContent).toContain('Informe a instituição com até 100 caracteres.');
    expect(compiled.querySelectorAll('.detail-field-error').length).toBe(2);
    expect(component.saving()).toBeFalse();
  });

  it('should show a controlled error when the lot total exceeds the safe monetary limit', async () => {
    const fixture = await createComponent(0, 'incluir');
    const component = fixture.componentInstance;
    const service = TestBed.inject(LotesService);
    const sourceEntry = service.findLancamentosByLoteId(3)[0];
    component.loteForm.controls.numeroLoteCco.setValue('CCO-LIMITE-MONETARIO');
    component.loteForm.controls.instituicao.setValue('0002 - SICOOB CENTRAL');
    component.lancamentos.set([
      { ...sourceEntry, idLote: 0, idLancamento: 1, valor: MAX_SAFE_CURRENCY_VALUE },
      { ...sourceEntry, idLote: 0, idLancamento: 2, valor: MAX_SAFE_CURRENCY_VALUE },
    ]);

    component.saveLote();
    fixture.detectChanges();

    const feedback = (fixture.nativeElement as HTMLElement).querySelector('.lote-feedback');
    expect(component.saving()).toBeFalse();
    expect(component.loteFeedback()).toBe(LOTE_TOTAL_LIMIT_ERROR_MESSAGE);
    expect(feedback?.getAttribute('role')).toBe('alert');
    expect(feedback?.classList).toContain('lote-feedback--error');
    expect(service.findById(23)).toBeNull();
  });

  it('should select entries exclusively through the same checkbox behavior as the main grid', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const rowCheckbox = compiled.querySelector<HTMLInputElement>(
      'tbody .selection-checkbox',
    ) as HTMLInputElement;

    rowCheckbox.checked = true;
    rowCheckbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.selectedLancamentoIds().has(3001)).toBeTrue();
    expect(component.selectedLancamentoId()).toBe(3001);
    expect(compiled.querySelector('.launch-row--selected')).not.toBeNull();

    rowCheckbox.checked = false;
    rowCheckbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.selectedLancamentoIds().size).toBe(0);
  });

  it('should save the edited text fields in alteration mode', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    component.loteForm.controls.numeroLoteCco.setValue('CCO-EDITADO-00003');
    component.loteForm.controls.instituicao.setValue('0008 - NOVA INSTITUIÇÃO');
    component.saveLote();
    fixture.detectChanges();

    expect(component.lote?.numeroLoteCco).toBe('CCO-EDITADO-00003');
    expect(component.lote?.instituicao).toBe('0008 - NOVA INSTITUIÇÃO');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Alterações do lote gravadas com sucesso.',
    );
  });

  it('should show alteration success and return to the listing after 0.5 seconds', async () => {
    jasmine.clock().install();
    const fixture = await createComponent(3, 'alterar');

    try {
      const component = fixture.componentInstance;
      const router = TestBed.inject(Router);
      const navigate = spyOn(router, 'navigate').and.resolveTo(true);

      component.saveLote();
      fixture.detectChanges();

      expect(component.saving()).toBeTrue();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Alterações do lote gravadas com sucesso.',
      );
      expect(navigate).not.toHaveBeenCalled();

      jasmine.clock().tick(499);
      expect(navigate).not.toHaveBeenCalled();
      jasmine.clock().tick(1);
      expect(navigate).toHaveBeenCalledOnceWith(['/']);
    } finally {
      fixture.destroy();
      jasmine.clock().uninstall();
    }
  });

  it('should toggle and save the lot-level event and attachment option', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#detail-evento-anexo-por-lote',
    ) as HTMLInputElement;

    toggle.click();
    fixture.detectChanges();

    expect(component.loteForm.controls.eventoAnexoPorLote.value).toBeTrue();

    toggle.click();
    fixture.detectChanges();
    expect(component.loteForm.controls.eventoAnexoPorLote.value).toBeFalse();

    toggle.click();
    fixture.detectChanges();

    component.saveLote();
    expect(component.lote?.eventoAnexoPorLote).toBeTrue();
    expect(component.loteForm.controls.eventoAnexoPorLote.disabled).toBeTrue();
  });

  it('should disable every detail field and show only Voltar in visualization mode', async () => {
    const fixture = await createComponent();
    const compiled = fixture.nativeElement as HTMLElement;
    const detailInputs = Array.from(
      compiled.querySelectorAll<HTMLInputElement>(
        '.detail-section--summary input, .detail-section--date input',
      ),
    );

    expect(detailInputs.length).toBe(7);
    expect(detailInputs.every((input) => input.disabled)).toBeTrue();
    expect(fixture.componentInstance.loteForm.controls.eventoAnexoPorLote.disabled).toBeTrue();
    expect(fixture.componentInstance.filtro.disabled).toBeTrue();
    expect(compiled.querySelector('.launch-actions')).toBeNull();
    expect(compiled.querySelector('.mode-badge')).toBeNull();

    const detailActions = Array.from(
      compiled.querySelectorAll<HTMLElement>('.detail-actions button, .detail-actions a'),
    ).map((button) => button.textContent?.trim());
    expect(detailActions).toEqual(['Voltar']);
  });

  it('should render the reference empty state for a lot without entries', async () => {
    const fixture = await createComponent(22, 'alterar');
    const compiled = fixture.nativeElement as HTMLElement;
    const selectAll = compiled.querySelector<HTMLInputElement>('thead .selection-checkbox');

    expect(fixture.componentInstance.lancamentos()).toEqual([]);
    expect(compiled.querySelector('.empty-cell')?.textContent?.trim()).toBe(
      'Nenhum registro encontrado.',
    );
    expect(selectAll?.disabled).toBeTrue();
    expect(compiled.querySelector('.table-summary')).toBeNull();
    expect(compiled.querySelector('.pagination')).toBeNull();
  });

  it('should filter entries by normalized text', async () => {
    const fixture = await createComponent(3, 'alterar');

    fixture.componentInstance.filtro.setValue('credito de ajuste');
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredLancamentos().length).toBe(1);

    fixture.componentInstance.filtro.setValue('sem resultado');
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredLancamentos()).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Nenhum lançamento corresponde ao filtro informado.',
    );

    fixture.componentInstance.filtro.setValue('R$ 1.250,00');
    fixture.detectChanges();
    expect(
      fixture.componentInstance.filteredLancamentos().map((item) => item.idLancamento),
    ).toEqual([3001]);
  });

  it('should disable actions and protect a selected entry hidden by the filter', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const initialLancamentos = component.lancamentos();
    component.selectedLancamentoIds.set(new Set([3001]));
    component.filtro.setValue('sem resultado');
    fixture.detectChanges();

    const restrictedActions = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.launch-action-button',
      ),
    ).filter((button) => button.textContent?.trim() !== 'Incluir');

    expect(component.selectedLancamentoId()).toBe(3001);
    expect(component.visibleSelectedLancamentoId()).toBeNull();
    expect(restrictedActions.every((button) => button.disabled)).toBeTrue();

    component.deleteSelectedLancamento();
    expect(component.lancamentos()).toEqual(initialLancamentos);
  });

  it('should persist a valid entry and recalculate the lot total when saving', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const service = TestBed.inject(LotesService);
    const initialCount = component.lancamentos().length;

    const modalComponent = openCreateModal(fixture);
    modalComponent.lancamentoForm.controls.contaCorrente.setValue('44444');
    modalComponent.onContaInput();
    modalComponent.searchContaCorrente();
    modalComponent.lancamentoForm.patchValue({
      valor: 125.9,
      historico: 'Lançamento Manual',
      documento: 'DOC-TESTE-001',
      descricao: 'Lançamento incluído pelo teste',
      pa: 'Cooperativa',
      complementoHistorico: 'Complemento incluído pelo teste',
    });
    modalComponent.selectEvento(102);
    modalComponent.confirmEventoSelection();

    expect(modalComponent.lancamentoForm.valid).toBeTrue();
    expect(modalComponent.titularConta()).toBe('Cooperativa Central');

    modalComponent.submitLancamento();
    fixture.detectChanges();

    expect(component.lancamentos().length).toBe(initialCount + 1);
    expect(component.loteForm.controls.quantidadeLancamentos.value).toBe(initialCount + 1);
    expect(component.lancamentos().at(-1)?.documento).toBe('DOC-TESTE-001');
    expect(component.modalAberto()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('incluído no lote');

    component.saveLote();

    expect(service.findById(3)).toEqual(
      jasmine.objectContaining({
        valor: 1375.9,
        quantidadeLancamentos: 2,
      }),
    );
    expect(service.findLancamentosByLoteId(3).map((entry) => entry.documento)).toContain(
      'DOC-TESTE-001',
    );
  });

  it('should show the located account holder without a status icon', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    modalComponent.lancamentoForm.controls.contaCorrente.setValue('44444');
    modalComponent.onContaInput();
    modalComponent.searchContaCorrente();
    fixture.detectChanges();

    const holder = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.account-holder',
    );

    expect(holder?.textContent?.trim()).toBe('Cooperativa Central');
    expect(holder?.children.length).toBe(0);
  });

  it('should render an uppercase title and keep the scroll inside the modal shell', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const modal = compiled.querySelector<HTMLElement>('.lancamento-modal');
    const modalScroll = compiled.querySelector<HTMLElement>('.modal-scroll');
    const header = compiled.querySelector<HTMLElement>('.modal-header');
    const content = compiled.querySelector<HTMLElement>('.modal-content');

    expect(header?.textContent?.trim()).toBe('INCLUIR LANÇAMENTO');
    expect(modal?.querySelector(':scope > .modal-scroll')).toBe(modalScroll);
    expect(modalScroll?.querySelector(':scope > .modal-header')).toBe(header);
    expect(modalScroll?.querySelector(':scope > .lancamento-form')).not.toBeNull();
    expect(header?.children.length).toBe(1);
    expect(compiled.querySelector('.modal-close')).toBeNull();
    expect(content?.querySelector(':scope > .modal-actions')).not.toBeNull();
  });

  it('should close from the backdrop without closing from a click inside the modal', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const modal = compiled.querySelector<HTMLElement>('.lancamento-modal');
    const backdrop = compiled.querySelector<HTMLElement>('.modal-backdrop');

    modal?.click();
    fixture.detectChanges();
    expect(component.modalAberto()).toBeTrue();

    backdrop?.click();
    fixture.detectChanges();
    expect(component.modalAberto()).toBeFalse();
  });

  it('should start a new entry with the requested field defaults and selection pattern', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const statusLancamento = compiled.querySelector<HTMLInputElement>('#situacao-lancamento');
    const statusDocumento = compiled.querySelector<HTMLInputElement>('#situacao-documento-csc');
    const documento = compiled.querySelector<HTMLInputElement>('#documento-lancamento');

    expect(modalComponent.lancamentoForm.controls.idEvento.value).toBe('');
    expect(modalComponent.eventoSelecionado()).toBeNull();
    expect(modalComponent.lancamentoForm.controls.contaCorrente.hasError('required')).toBeFalse();
    expect(modalComponent.lancamentoForm.controls.pa.hasError('required')).toBeFalse();
    expect(statusLancamento?.readOnly).toBeTrue();
    expect(statusLancamento?.value).toBe('Pendente');
    expect(statusDocumento?.readOnly).toBeTrue();
    expect(statusDocumento?.value).toBe('Aguardando Processamento CCO');
    expect(documento?.hasAttribute('placeholder')).toBeFalse();
    expect(compiled.querySelector('#id-documento-csc')).toBeNull();
    expect(compiled.querySelectorAll('.modal-select-field .select-field__arrow').length).toBe(2);
    expect(compiled.textContent).not.toContain('Cada arquivo pode ter no máximo 50 MB.');
    expect(compiled.textContent).not.toContain('Tamanho máximo permitido por arquivo: 50 MB.');
  });

  it('should allow inclusion without the optional account field', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    modalComponent.lancamentoForm.patchValue({
      valor: 75,
      historico: 'Lançamento Manual',
      documento: 'DOC-SEM-CONTA',
      complementoHistorico: 'Lançamento sem conta informada',
    });
    modalComponent.selectEvento(102);
    modalComponent.confirmEventoSelection();

    expect(modalComponent.lancamentoForm.valid).toBeTrue();
    modalComponent.submitLancamento();

    expect(component.modalAberto()).toBeFalse();
    expect(component.lancamentos().at(-1)?.contaCorrente).toBe('');
    expect(component.lancamentos().at(-1)?.titularConta).toBe('');
  });

  it('should preserve alteration and duplication behavior through the modal contract', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const initialCount = component.lancamentos().length;
    component.selectedLancamentoIds.set(new Set([3001]));

    component.openSelectedLancamento('alterar');
    fixture.detectChanges();
    let modalComponent = getModal(fixture);
    modalComponent.lancamentoForm.controls.documento.setValue('DOC-ALTERADO');
    modalComponent.submitLancamento();
    fixture.detectChanges();

    expect(component.lancamentos().length).toBe(initialCount);
    expect(component.lancamentos()[0].documento).toBe('DOC-ALTERADO');
    expect(component.modalAberto()).toBeFalse();

    component.openSelectedLancamento('duplicar');
    fixture.detectChanges();
    modalComponent = getModal(fixture);

    expect(modalComponent.lancamentoForm.controls.documento.value).toBe('DOC-ALTERADO - CÓPIA');
    modalComponent.submitLancamento();

    expect(component.lancamentos().length).toBe(initialCount + 1);
    expect(component.lancamentos().at(-1)).toEqual(
      jasmine.objectContaining({
        idLancamento: 3002,
        documento: 'DOC-ALTERADO - CÓPIA',
        situacao: 'Pendente',
      }),
    );
    expect(component.modalAberto()).toBeFalse();
  });

  it('should search and select a CCO event from the reference dialog', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    modalComponent.openEventoModal();
    modalComponent.eventoBuscaCampo.setValue('descricao');
    modalComponent.eventoBuscaValor.setValue('débito');
    fixture.detectChanges();

    expect(modalComponent.eventoModalAberto()).toBeTrue();
    expect(modalComponent.filteredEventos().map((evento) => evento.idEvento)).toEqual([
      102, 108, 117,
    ]);

    jasmine.clock().install();
    try {
      modalComponent.listarEventos();
      fixture.detectChanges();

      const listButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.event-list-button',
      );

      expect(modalComponent.eventoBuscando()).toBeTrue();
      expect(listButton?.disabled).toBeTrue();
      expect(listButton?.getAttribute('aria-busy')).toBe('true');
      expect(listButton?.querySelector('.event-list-button__spinner')).not.toBeNull();
      expect(listButton?.textContent?.trim()).toBe('Listando...');
      expect(modalComponent.filteredEventos().map((evento) => evento.idEvento)).toEqual([
        102, 108, 117,
      ]);

      jasmine.clock().tick(650);
      fixture.detectChanges();
    } finally {
      jasmine.clock().uninstall();
    }

    expect(modalComponent.eventoBuscando()).toBeFalse();
    expect(modalComponent.filteredEventos().map((evento) => evento.idEvento)).toEqual([108]);

    modalComponent.selectEvento(108);
    modalComponent.confirmEventoSelection();

    expect(modalComponent.eventoSelecionado()?.idEvento).toBe(108);
    expect(modalComponent.lancamentoForm.controls.idEvento.value).toBe('108');
    expect(modalComponent.eventoModalAberto()).toBeFalse();
  });

  it('should render the event search dialog with its reference action hierarchy', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    modalComponent.openEventoModal();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const listButton = compiled.querySelector<HTMLButtonElement>('.event-list-button');
    const confirmButton = compiled.querySelector<HTMLButtonElement>('.event-confirm-button');

    expect(listButton?.textContent?.trim()).toBe('Listar');
    expect(confirmButton?.textContent?.trim()).toBe('OK');
    expect(confirmButton?.disabled).toBeTrue();
    expect(compiled.querySelector('.event-close-button')?.textContent?.trim()).toBe('Fechar');
    expect(compiled.querySelectorAll('.event-pagination-button').length).toBe(2);

    modalComponent.selectEvento(102);
    fixture.detectChanges();

    expect(confirmButton?.disabled).toBeFalse();
    expect(getComputedStyle(confirmButton!).backgroundColor).toBe(
      getComputedStyle(listButton!).backgroundColor,
    );
    expect(getComputedStyle(confirmButton!).color).toBe(getComputedStyle(listButton!).color);
  });

  it('should reject attachments larger than 50 MB and show a clear error', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const oversizedFile = {
      name: 'documento-muito-grande.pdf',
      size: 50 * 1024 * 1024 + 1,
      type: 'application/pdf',
    } as File;

    const modalComponent = openCreateModal(fixture);
    modalComponent.addAnexo(oversizedFile);
    fixture.detectChanges();

    expect(modalComponent.anexos()).toEqual([]);
    expect(modalComponent.anexoError()).toContain('tamanho máximo permitido de 50 MB');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('documento-muito-grande.pdf');
  });

  it('should accept an attachment without showing success feedback and persist it', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const maximumSizeFile = {
      name: 'comprovante.pdf',
      size: 50 * 1024 * 1024,
      type: 'application/pdf',
    } as File;

    const modalComponent = openCreateModal(fixture);
    modalComponent.addAnexo(maximumSizeFile);
    fixture.detectChanges();

    expect(modalComponent.anexos().length).toBe(1);
    expect(modalComponent.anexos()[0].descricao).toBe('comprovante.pdf');
    expect(modalComponent.anexoError()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('#attachment-feedback')).toBeNull();

    modalComponent.lancamentoForm.controls.contaCorrente.setValue('44444');
    modalComponent.onContaInput();
    modalComponent.searchContaCorrente();
    modalComponent.lancamentoForm.patchValue({
      valor: 100,
      historico: 'Lançamento Manual',
      documento: 'DOC-COM-ANEXO',
      pa: 'Cooperativa',
      complementoHistorico: 'Lançamento com comprovante',
    });
    modalComponent.selectEvento(102);
    modalComponent.confirmEventoSelection();
    modalComponent.submitLancamento();

    expect(component.lancamentos().at(-1)?.anexos.length).toBe(1);
    expect(component.lancamentos().at(-1)?.anexos[0].descricao).toBe('comprovante.pdf');
  });

  it('should reject unsupported extensions and mismatched MIME types', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;

    const modalComponent = openCreateModal(fixture);
    modalComponent.addAnexo(
      new File(['document'], 'documento.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    expect(modalComponent.anexos()).toEqual([]);
    expect(modalComponent.anexoError()).toContain('Selecione PDF, PowerPoint ou imagem');

    modalComponent.addAnexo(new File(['content'], 'imagem.png', { type: 'application/pdf' }));

    expect(modalComponent.anexos()).toEqual([]);
    expect(modalComponent.anexoError()).toContain('não corresponde à extensão .png');
  });

  it('should show attachment metadata and preview images without distortion', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const createObjectUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:image-preview');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    const image = new File(['image-content'], 'comprovante.png', { type: 'image/png' });

    const modalComponent = openCreateModal(fixture);
    modalComponent.addAnexo(image);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const fileInput = compiled.querySelector<HTMLInputElement>('.visually-hidden-file');
    const attachmentHeaders = Array.from(
      compiled.querySelectorAll<HTMLElement>('.attachment-table th'),
    ).map((header) => header.textContent?.trim());

    expect(compiled.textContent).toContain('comprovante.png');
    expect(attachmentHeaders).toEqual([
      'Nome Reduzido do Arquivo',
      'Descrição',
      'Data Inclusão',
      'ID Usuário',
    ]);
    expect(fileInput?.accept).toContain('.pdf');
    expect(fileInput?.accept).toContain('.pptx');
    expect(fileInput?.accept).toContain('.png');
    expect(fileInput?.accept).not.toContain('.docx');

    modalComponent.viewSelectedAnexo();
    fixture.detectChanges();

    const previewImage = compiled.querySelector<HTMLImageElement>('.image-preview-stage img');

    expect(createObjectUrl).toHaveBeenCalledOnceWith(image);
    expect(modalComponent.attachmentPreview()?.kind).toBe('image');
    expect(previewImage?.alt).toBe('comprovante.png');
    expect(compiled.querySelector('.attachment-preview-modal')).not.toBeNull();
    expect(compiled.textContent).toContain('PNG · Imagem PNG');
    expect(compiled.textContent).toContain('13 B');

    modalComponent.deleteSelectedAnexo();
    fixture.detectChanges();

    expect(modalComponent.previewAberto()).toBeFalse();
    expect(modalComponent.anexos()).toEqual([]);
    expect(revokeObjectUrl).toHaveBeenCalledOnceWith('blob:image-preview');
  });

  it('should use ngx-doc-viewer for PDF and release its object URL on destroy', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:pdf-preview');
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');

    const modalComponent = openCreateModal(fixture);
    modalComponent.addAnexo(
      new File(['pdf-content'], 'relatorio.pdf', { type: 'application/pdf' }),
    );
    modalComponent.viewSelectedAnexo();
    fixture.detectChanges();

    expect(modalComponent.attachmentPreview()?.viewer).toBe('pdf');
    expect((fixture.nativeElement as HTMLElement).querySelector('ngx-doc-viewer')).not.toBeNull();

    fixture.destroy();

    expect(revokeObjectUrl).toHaveBeenCalledOnceWith('blob:pdf-preview');
  });

  it('should route PowerPoint files to the Office viewer with fallback actions', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:powerpoint-preview');

    const modalComponent = openCreateModal(fixture);
    modalComponent.addAnexo(
      new File(['slides'], 'apresentacao.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
    );
    modalComponent.viewSelectedAnexo();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const fallbackActions = Array.from(
      compiled.querySelectorAll<HTMLElement>('.attachment-preview-actions a'),
    ).map((action) => action.textContent?.trim());

    expect(modalComponent.attachmentPreview()?.viewer).toBe('office');
    expect(compiled.textContent).toContain('Microsoft Office Online');
    expect(fallbackActions).toEqual(['Abrir arquivo', 'Baixar']);
  });

  it('should show every field error and scroll to the first invalid field from top to bottom', async () => {
    const fixture = await createComponent(3, 'alterar');
    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;

    const modalComponent = openCreateModal(fixture);
    modalComponent.lancamentoForm.patchValue({ valor: 0, documento: '' });
    fixture.detectChanges();

    const submitButton = compiled.querySelector<HTMLButtonElement>(
      '.modal-primary-button',
    ) as HTMLButtonElement;
    const valor = compiled.querySelector<HTMLInputElement>('#valor-lancamento') as HTMLInputElement;
    const scrollIntoView = spyOn(HTMLElement.prototype, 'scrollIntoView');

    expect(submitButton.disabled).toBeFalse();
    expect(compiled.querySelectorAll('.field-error').length).toBe(0);

    submitButton.click();
    fixture.detectChanges();

    expect(component.modalAberto()).toBeTrue();
    expect(modalComponent.lancamentoForm.invalid).toBeTrue();
    expect(modalComponent.lancamentoForm.controls.valor.touched).toBeTrue();
    expect(modalComponent.lancamentoForm.controls.documento.touched).toBeTrue();
    expect(modalComponent.lancamentoForm.controls.idEvento.touched).toBeTrue();
    expect(modalComponent.lancamentoForm.controls.complementoHistorico.touched).toBeTrue();
    expect(compiled.textContent).toContain('O valor deve ser maior que zero.');
    expect(compiled.textContent).toContain('Informe o documento.');
    expect(compiled.textContent).toContain('Informe o evento.');
    expect(compiled.textContent).toContain('Informe o complemento do histórico.');
    expect(compiled.querySelectorAll('.field-error[role="alert"]').length).toBe(4);
    expect(compiled.querySelectorAll('[aria-invalid="true"]').length).toBe(4);
    expect(compiled.querySelectorAll('.ng-invalid.ng-touched').length).toBeGreaterThan(0);
    expect(scrollIntoView.calls.mostRecent().object).toBe(valor);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    expect(document.activeElement).toBe(valor);
  });

  it('should render a controlled not-found state for an unknown lot', async () => {
    const fixture = await createComponent(999);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('Lote não encontrado');
    expect(compiled.querySelector('table')).toBeNull();
  });
});
