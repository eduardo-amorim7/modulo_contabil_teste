import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDocViewerComponent, viewerType } from 'ngx-doc-viewer';

import { PtBrCurrencyDirective } from '../../../../shared/directives/pt-br-currency.directive';
import {
  MAX_SAFE_CURRENCY_VALUE,
  nonBlankValidator,
} from '../../../../shared/validators/input-value.validators';
import { CONTAS_CORRENTES_MOCK } from '../../data/contas-correntes.mock';
import { LancamentoAnexo, LancamentoLote } from '../../models/lote.model';
import { LotesService } from '../../services/lotes.service';

type LoteDetailMode = 'incluir' | 'alterar' | 'visualizar';
type LancamentoModalMode = 'incluir' | 'duplicar' | 'alterar' | 'visualizar';
type EventoSearchField = 'idEvento' | 'codigoEvento' | 'descricao';

interface EventoCco {
  readonly idEvento: number;
  readonly codigoEvento: number;
  readonly descricao: string;
  readonly dataInicio: string;
  readonly dataFim: string;
}

type AttachmentPreviewKind = 'image' | 'document' | 'unsupported';

interface AttachmentTypeConfig {
  readonly label: string;
  readonly mimeTypes: readonly string[];
  readonly previewKind: AttachmentPreviewKind;
  readonly viewer?: viewerType;
}

interface AttachmentPreview {
  readonly anexo: LancamentoAnexo;
  readonly objectUrl: string;
  readonly kind: AttachmentPreviewKind;
  readonly viewer?: viewerType;
}

const HISTORICOS = [
  'Lançamento Manual',
  'Crédito de ajuste contábil',
  'Débito de regularização',
  'Ajuste de conciliação',
] as const;

const POSTOS_ATENDIMENTO = ['Cooperativa', 'PA Centro', 'PA Digital'] as const;

const TIPOS_DOCUMENTO_CSC = ['Documento interno', 'Nota fiscal', 'Comprovante contábil'] as const;

const EVENTOS_CCO: readonly EventoCco[] = [
  {
    idEvento: 102,
    codigoEvento: 300,
    descricao: 'Centralização Título CSC Crédito',
    dataInicio: '31/12/2019',
    dataFim: '',
  },
  {
    idEvento: 108,
    codigoEvento: 312,
    descricao: 'Regularização de débito CCO',
    dataInicio: '15/03/2021',
    dataFim: '',
  },
  {
    idEvento: 117,
    codigoEvento: 341,
    descricao: 'Ajuste contábil de crédito',
    dataInicio: '01/01/2024',
    dataFim: '',
  },
] as const;

const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream']);
const ATTACHMENT_TYPES: Readonly<Record<string, AttachmentTypeConfig>> = {
  pdf: {
    label: 'Documento PDF',
    mimeTypes: ['application/pdf'],
    previewKind: 'document',
    viewer: 'pdf',
  },
  ppt: {
    label: 'Apresentação PowerPoint',
    mimeTypes: ['application/vnd.ms-powerpoint'],
    previewKind: 'document',
    viewer: 'office',
  },
  pptx: {
    label: 'Apresentação PowerPoint',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    previewKind: 'document',
    viewer: 'office',
  },
  jpg: {
    label: 'Imagem JPEG',
    mimeTypes: ['image/jpeg'],
    previewKind: 'image',
  },
  jpeg: {
    label: 'Imagem JPEG',
    mimeTypes: ['image/jpeg'],
    previewKind: 'image',
  },
  png: {
    label: 'Imagem PNG',
    mimeTypes: ['image/png'],
    previewKind: 'image',
  },
  gif: {
    label: 'Imagem GIF',
    mimeTypes: ['image/gif'],
    previewKind: 'image',
  },
  webp: {
    label: 'Imagem WebP',
    mimeTypes: ['image/webp'],
    previewKind: 'image',
  },
  bmp: {
    label: 'Imagem BMP',
    mimeTypes: ['image/bmp', 'image/x-ms-bmp'],
    previewKind: 'image',
  },
};
const CURRENT_USER_ID = 'usuario.logado';
const SAVE_SUCCESS_TRANSITION_MS = 500;
const EVENT_SEARCH_LATENCY_MS = 650;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    A11yModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    NgxDocViewerComponent,
    PtBrCurrencyDirective,
    ReactiveFormsModule,
    RouterLink,
  ],
  selector: 'app-lote-detail-page',
  templateUrl: './lote-detail-page.html',
})
export class LoteDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly lotesService = inject(LotesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly attachmentObjectUrls = new Map<File, string>();
  private saveNavigationTimeout?: ReturnType<typeof globalThis.setTimeout>;
  private eventSearchTimeout?: ReturnType<typeof globalThis.setTimeout>;

  readonly mode: LoteDetailMode = this.getDetailMode();
  readonly isCreateMode = this.mode === 'incluir';
  readonly idLote = this.isCreateMode ? 0 : Number(this.route.snapshot.paramMap.get('idLote'));
  readonly lote = this.isCreateMode ? null : this.lotesService.findById(this.idLote);
  readonly lancamentos = signal<LancamentoLote[]>([
    ...(this.isCreateMode ? [] : this.lotesService.findLancamentosByLoteId(this.idLote)),
  ]);
  readonly loteForm = new FormGroup({
    idLote: new FormControl({ value: this.lote?.idLote ?? null, disabled: true }),
    numeroLoteCco: new FormControl(
      {
        value: this.lote?.numeroLoteCco ?? '',
        disabled: this.mode === 'visualizar',
      },
      {
        nonNullable: true,
        validators: [nonBlankValidator, Validators.maxLength(30)],
      },
    ),
    situacaoLote: new FormControl({ value: this.lote?.situacaoLote ?? '', disabled: true }),
    quantidadeLancamentos: new FormControl({
      value: this.lancamentos().length,
      disabled: true,
    }),
    dataEntrada: new FormControl({
      value: this.lote?.dataEntrada ?? this.formatDate(new Date()),
      disabled: true,
    }),
    instituicao: new FormControl(
      {
        value: this.lote?.instituicao ?? '',
        disabled: this.mode === 'visualizar',
      },
      {
        nonNullable: true,
        validators: [nonBlankValidator, Validators.maxLength(100)],
      },
    ),
    eventoAnexoPorLote: new FormControl(
      {
        value: this.lote?.eventoAnexoPorLote ?? false,
        disabled: this.mode === 'visualizar',
      },
      { nonNullable: true },
    ),
  });
  readonly filtro = new FormControl(
    { value: '', disabled: this.mode === 'visualizar' },
    { nonNullable: true },
  );
  private readonly filterValue = toSignal(this.filtro.valueChanges, { initialValue: '' });

  readonly historicos = HISTORICOS;
  readonly postosAtendimento = POSTOS_ATENDIMENTO;
  readonly tiposDocumentoCsc = TIPOS_DOCUMENTO_CSC;
  readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
  readonly maxAttachmentSizeLabel = '50 MB';
  readonly attachmentAccept = Object.keys(ATTACHMENT_TYPES)
    .map((extension) => `.${extension}`)
    .join(',');
  readonly modalAberto = signal(false);
  readonly modalMode = signal<LancamentoModalMode>('incluir');
  readonly eventoModalAberto = signal(false);
  readonly eventoSelecionado = signal<EventoCco | null>(null);
  readonly eventoModalSelection = signal<number | null>(null);
  readonly eventoBuscaCampo = new FormControl<EventoSearchField>('idEvento', {
    nonNullable: true,
  });
  readonly eventoBuscaValor = new FormControl('', { nonNullable: true });
  readonly eventoBuscando = signal(false);
  private readonly eventoBuscaAplicada = signal<{
    readonly campo: EventoSearchField;
    readonly valor: string;
  }>({
    campo: 'idEvento',
    valor: '',
  });
  readonly titularConta = signal<string | null>(null);
  readonly anexos = signal<LancamentoAnexo[]>([]);
  readonly selectedAnexoId = signal<number | null>(null);
  readonly anexoError = signal<string | null>(null);
  readonly attachmentPreview = signal<AttachmentPreview | null>(null);
  readonly previewAberto = computed(() => this.attachmentPreview() !== null);
  readonly selectedLancamentoIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly selectedLancamentoId = computed(() => {
    const selection = this.selectedLancamentoIds();

    return selection.size === 1 ? (selection.values().next().value ?? null) : null;
  });
  readonly editingLancamentoId = signal<number | null>(null);
  readonly loteFeedback = signal<string | null>(null);
  readonly saving = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.saveNavigationTimeout !== undefined) {
        globalThis.clearTimeout(this.saveNavigationTimeout);
      }

      this.cancelEventSearch();
      this.revokeAllAttachmentObjectUrls();
    });
  }

  readonly isModalReadOnly = computed(() => this.modalMode() === 'visualizar');
  readonly modalTitle = computed(() => {
    switch (this.modalMode()) {
      case 'alterar':
        return 'Alterar lançamento';
      case 'duplicar':
        return 'Duplicar lançamento';
      case 'visualizar':
        return 'Visualizar lançamento';
      default:
        return 'INCLUIR LANÇAMENTO';
    }
  });
  readonly confirmationLabel = computed(() =>
    this.modalMode() === 'alterar' ? 'Gravar' : 'Incluir',
  );

  readonly filteredEventos = computed(() => {
    const { campo, valor } = this.eventoBuscaAplicada();
    const busca = this.normalize(valor);

    if (!busca) {
      return EVENTOS_CCO;
    }

    return EVENTOS_CCO.filter((evento) => {
      const value =
        campo === 'idEvento'
          ? evento.idEvento
          : campo === 'codigoEvento'
            ? evento.codigoEvento
            : evento.descricao;

      return this.normalize(String(value)).includes(busca);
    });
  });

  readonly lancamentoForm = new FormGroup({
    contaCorrente: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    valor: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(0.01),
        Validators.max(MAX_SAFE_CURRENCY_VALUE),
      ],
    }),
    historico: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankValidator],
    }),
    estorno: new FormControl(false, { nonNullable: true }),
    documento: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankValidator, Validators.maxLength(40)],
    }),
    descricao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    situacao: new FormControl('Pendente', { nonNullable: true }),
    pa: new FormControl('', {
      nonNullable: true,
    }),
    tipoDocumentoCsc: new FormControl('Documento interno', { nonNullable: true }),
    idEvento: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankValidator],
    }),
    complementoHistorico: new FormControl('', {
      nonNullable: true,
      validators: [nonBlankValidator, Validators.maxLength(500)],
    }),
    idDocumentoCsc: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    situacaoDocumentoCsc: new FormControl('Aguardando Processamento CCO', {
      nonNullable: true,
    }),
    manterDadosTela: new FormControl(false, { nonNullable: true }),
  });

  readonly filteredLancamentos = computed(() => {
    const normalizedFilter = this.normalize(this.filterValue());

    if (!normalizedFilter) {
      return this.lancamentos();
    }

    return this.lancamentos().filter((lancamento) =>
      [
        lancamento.idLancamento,
        lancamento.pa,
        lancamento.contaCorrente,
        lancamento.titularConta,
        this.currencyFormatter.format(lancamento.valor),
        lancamento.historico,
        lancamento.documento,
        lancamento.situacaoDocumentoCsc,
      ].some((value) => this.normalize(String(value)).includes(normalizedFilter)),
    );
  });

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.previewAberto()) {
      this.closeAttachmentPreview();
    } else if (this.eventoModalAberto()) {
      this.closeEventoModal();
    } else if (this.modalAberto()) {
      this.closeModal();
    }
  }

  isLancamentoSelected(idLancamento: number): boolean {
    return this.selectedLancamentoIds().has(idLancamento);
  }

  allFilteredLancamentosSelected(): boolean {
    const items = this.filteredLancamentos();

    return items.length > 0 && items.every((item) => this.isLancamentoSelected(item.idLancamento));
  }

  someFilteredLancamentosSelected(): boolean {
    return (
      !this.allFilteredLancamentosSelected() &&
      this.filteredLancamentos().some((item) => this.isLancamentoSelected(item.idLancamento))
    );
  }

  handleLancamentoSelectionChange(idLancamento: number, event: Event): void {
    const checked = this.getCheckboxState(event);

    if (checked !== null) {
      this.toggleLancamento(idLancamento, checked);
    }
  }

  handleAllLancamentosSelectionChange(event: Event): void {
    const checked = this.getCheckboxState(event);

    if (checked !== null) {
      this.toggleAllFilteredLancamentos(checked);
    }
  }

  toggleLancamento(idLancamento: number, checked: boolean): void {
    if (this.mode === 'visualizar') {
      return;
    }

    const selection = new Set(this.selectedLancamentoIds());

    if (checked) {
      selection.add(idLancamento);
    } else {
      selection.delete(idLancamento);
    }

    this.selectedLancamentoIds.set(selection);
  }

  toggleAllFilteredLancamentos(checked: boolean): void {
    if (this.mode === 'visualizar') {
      return;
    }

    const selection = new Set(this.selectedLancamentoIds());

    for (const item of this.filteredLancamentos()) {
      if (checked) {
        selection.add(item.idLancamento);
      } else {
        selection.delete(item.idLancamento);
      }
    }

    this.selectedLancamentoIds.set(selection);
  }

  saveLote(): void {
    if (this.mode === 'visualizar' || this.saving()) {
      return;
    }

    const numeroLoteCco = this.loteForm.controls.numeroLoteCco;
    const instituicao = this.loteForm.controls.instituicao;
    numeroLoteCco.markAsTouched();
    instituicao.markAsTouched();

    if (numeroLoteCco.invalid || instituicao.invalid) {
      return;
    }

    const normalizedValue = numeroLoteCco.value.trim();
    const normalizedInstituicao = instituicao.value.trim();
    numeroLoteCco.setValue(normalizedValue);
    instituicao.setValue(normalizedInstituicao);

    if (this.isCreateMode) {
      this.lotesService.create({
        numeroLoteCco: normalizedValue,
        instituicao: normalizedInstituicao,
        eventoAnexoPorLote: this.loteForm.controls.eventoAnexoPorLote.value,
        lancamentos: this.lancamentos(),
        usuarioRegistro: CURRENT_USER_ID,
      });
      this.finishSuccessfulSave('Lote criado com sucesso.');
      return;
    }

    if (!this.lote) {
      return;
    }

    this.lotesService.update(this.lote.idLote, {
      numeroLoteCco: normalizedValue,
      instituicao: normalizedInstituicao,
      eventoAnexoPorLote: this.loteForm.controls.eventoAnexoPorLote.value,
      lancamentos: this.lancamentos(),
    });
    this.finishSuccessfulSave('Alterações do lote gravadas com sucesso.');
  }

  onNumeroLoteCcoInput(): void {
    this.loteFeedback.set(null);
  }

  onInstituicaoInput(): void {
    this.loteFeedback.set(null);
  }

  onEventoAnexoPorLoteChange(): void {
    this.loteFeedback.set(null);
  }

  openCreateModal(): void {
    if (this.mode === 'visualizar' || this.saving()) {
      return;
    }

    this.closeAttachmentPreview();
    this.modalMode.set('incluir');
    this.editingLancamentoId.set(null);
    this.prepareEditableForm();
    this.lancamentoForm.reset({
      contaCorrente: '',
      valor: null,
      historico: 'Lançamento Manual',
      estorno: false,
      documento: '',
      descricao: '',
      situacao: 'Pendente',
      pa: 'Cooperativa',
      tipoDocumentoCsc: 'Documento interno',
      idEvento: '',
      complementoHistorico: '',
      idDocumentoCsc: '',
      situacaoDocumentoCsc: 'Aguardando Processamento CCO',
      manterDadosTela: false,
    });
    this.eventoSelecionado.set(null);
    this.titularConta.set(null);
    this.anexos.set([]);
    this.selectedAnexoId.set(null);
    this.clearAnexoError();
    this.modalAberto.set(true);
  }

  openSelectedLancamento(targetMode: 'alterar' | 'visualizar' | 'duplicar'): void {
    if (targetMode !== 'visualizar' && (this.mode === 'visualizar' || this.saving())) {
      return;
    }

    const selected = this.getSelectedLancamento();

    if (!selected) {
      return;
    }

    this.closeAttachmentPreview();
    this.modalMode.set(targetMode);
    this.editingLancamentoId.set(targetMode === 'alterar' ? selected.idLancamento : null);
    this.prepareEditableForm();
    this.lancamentoForm.reset({
      contaCorrente: selected.contaCorrente,
      valor: selected.valor,
      historico: selected.historico,
      estorno: selected.estorno,
      documento: targetMode === 'duplicar' ? `${selected.documento} - CÓPIA` : selected.documento,
      descricao: selected.descricao,
      situacao: targetMode === 'duplicar' ? 'Pendente' : selected.situacao,
      pa: selected.pa,
      tipoDocumentoCsc: selected.tipoDocumentoCsc,
      idEvento: String(selected.idEvento),
      complementoHistorico: selected.complementoHistorico,
      idDocumentoCsc: selected.idDocumentoCsc,
      situacaoDocumentoCsc: selected.situacaoDocumentoCsc,
      manterDadosTela: false,
    });
    this.eventoSelecionado.set(
      EVENTOS_CCO.find((evento) => evento.idEvento === selected.idEvento) ?? {
        idEvento: selected.idEvento,
        codigoEvento: selected.codigoEvento,
        descricao: selected.descricaoEvento,
        dataInicio: '',
        dataFim: '',
      },
    );
    this.titularConta.set(selected.titularConta);
    this.anexos.set([...selected.anexos]);
    this.selectedAnexoId.set(null);
    this.clearAnexoError();

    if (targetMode === 'visualizar') {
      this.lancamentoForm.disable({ emitEvent: false });
    }

    this.modalAberto.set(true);
  }

  closeModal(): void {
    this.closeAttachmentPreview();
    this.closeEventoModal();
    this.modalAberto.set(false);
  }

  openEventoModal(): void {
    if (this.isModalReadOnly()) {
      return;
    }

    this.cancelEventSearch();
    this.eventoBuscaCampo.setValue('idEvento');
    this.eventoBuscaValor.setValue('');
    this.eventoBuscaAplicada.set({ campo: 'idEvento', valor: '' });
    this.eventoModalSelection.set(this.eventoSelecionado()?.idEvento ?? null);
    this.eventoModalAberto.set(true);
  }

  closeEventoModal(): void {
    this.cancelEventSearch();
    this.eventoModalAberto.set(false);
  }

  listarEventos(): void {
    if (this.eventoBuscando()) {
      return;
    }

    const busca = {
      campo: this.eventoBuscaCampo.value,
      valor: this.eventoBuscaValor.value,
    };

    this.eventoBuscando.set(true);
    this.eventSearchTimeout = globalThis.setTimeout(() => {
      this.eventSearchTimeout = undefined;
      this.eventoBuscaAplicada.set(busca);
      this.eventoBuscando.set(false);
    }, EVENT_SEARCH_LATENCY_MS);
  }

  onEventoIdInput(): void {
    if (this.isModalReadOnly()) {
      return;
    }

    this.eventoSelecionado.set(null);
    this.setEventoLookupError(
      this.lancamentoForm.controls.idEvento.value.trim() ? 'eventoNaoConfirmado' : null,
    );
  }

  selectEvento(idEvento: number): void {
    this.eventoModalSelection.set(idEvento);
  }

  confirmEventoSelection(): void {
    const selectedId = this.eventoModalSelection();
    const selected = EVENTOS_CCO.find((evento) => evento.idEvento === selectedId);

    if (!selected) {
      return;
    }

    this.eventoSelecionado.set(selected);
    this.lancamentoForm.controls.idEvento.setValue(String(selected.idEvento));
    this.setEventoLookupError(null);
    this.closeEventoModal();
  }

  onAnexoFileSelected(event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.item(0);
    input.value = '';

    if (file) {
      this.addAnexo(file);
    }
  }

  addAnexo(file: File): void {
    this.clearAnexoError();

    const extension = this.getFileExtension(file.name);
    const typeConfig = ATTACHMENT_TYPES[extension];

    if (!typeConfig) {
      this.anexoError.set(
        `O formato do arquivo "${file.name}" não é permitido. Selecione PDF, PowerPoint ou imagem.`,
      );
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      this.anexoError.set(
        `O arquivo "${file.name}" excede o tamanho máximo permitido de ${this.maxAttachmentSizeLabel}.`,
      );
      return;
    }

    const normalizedMimeType = file.type.trim().toLocaleLowerCase('en-US');

    if (
      !GENERIC_MIME_TYPES.has(normalizedMimeType) &&
      !typeConfig.mimeTypes.includes(normalizedMimeType)
    ) {
      this.anexoError.set(
        `O tipo do arquivo "${file.name}" não corresponde à extensão .${extension}.`,
      );
      return;
    }

    const anexo: LancamentoAnexo = {
      id: this.nextAnexoId(),
      nomeReduzido: this.reduceFileName(file.name),
      descricao: file.name,
      extensao: extension,
      mimeType: normalizedMimeType || typeConfig.mimeTypes[0],
      tamanhoBytes: file.size,
      dataInclusao: this.formatDateTime(new Date()),
      idUsuario: CURRENT_USER_ID,
      arquivo: file,
    };

    this.anexos.update((items) => [...items, anexo]);
    this.selectedAnexoId.set(anexo.id);
  }

  selectAnexo(id: number): void {
    this.selectedAnexoId.set(id);
    this.clearAnexoError();
  }

  viewSelectedAnexo(): void {
    const anexo = this.getSelectedAnexo();

    if (!anexo?.arquivo) {
      this.anexoError.set('Não foi possível abrir o arquivo selecionado.');
      return;
    }

    try {
      const typeConfig = ATTACHMENT_TYPES[anexo.extensao];
      const objectUrl = this.getOrCreateAttachmentObjectUrl(anexo.arquivo);

      this.attachmentPreview.set({
        anexo,
        objectUrl,
        kind: typeConfig?.previewKind ?? 'unsupported',
        viewer: typeConfig?.viewer,
      });
    } catch {
      this.anexoError.set('Não foi possível preparar o arquivo selecionado para visualização.');
    }
  }

  closeAttachmentPreview(): void {
    this.attachmentPreview.set(null);
  }

  deleteSelectedAnexo(): void {
    const selectedId = this.selectedAnexoId();

    if (selectedId === null || this.isModalReadOnly()) {
      return;
    }

    const selectedAnexo = this.getSelectedAnexo();

    this.closeAttachmentPreview();
    this.anexos.update((items) => items.filter((item) => item.id !== selectedId));

    if (selectedAnexo?.arquivo) {
      this.revokeAttachmentObjectUrl(selectedAnexo.arquivo);
    }

    this.selectedAnexoId.set(null);
    this.clearAnexoError();
  }

  onContaInput(): void {
    if (this.isModalReadOnly()) {
      return;
    }

    this.titularConta.set(null);
    const control = this.lancamentoForm.controls.contaCorrente;
    this.setContaLookupError(control.value.trim() ? 'contaNaoConfirmada' : null);
  }

  searchContaCorrente(): void {
    if (this.isModalReadOnly()) {
      return;
    }

    const control = this.lancamentoForm.controls.contaCorrente;
    control.markAsTouched();
    const normalizedValue = this.normalizeConta(control.value);

    if (!normalizedValue) {
      this.titularConta.set(null);
      this.setContaLookupError(null);
      return;
    }

    const conta = CONTAS_CORRENTES_MOCK.find(
      (item) => this.normalizeConta(item.numero) === normalizedValue,
    );

    if (!conta) {
      this.titularConta.set(null);
      this.setContaLookupError('contaNaoLocalizada');
      return;
    }

    control.setValue(conta.numero, { emitEvent: false });
    this.titularConta.set(conta.titular);
    this.setContaLookupError(null);
  }

  submitLancamento(): void {
    if (this.isModalReadOnly()) {
      return;
    }

    const contaCorrente = this.lancamentoForm.controls.contaCorrente.value.trim();

    if (contaCorrente && !this.titularConta()) {
      this.setContaLookupError('contaNaoConfirmada');
    } else if (!contaCorrente) {
      this.setContaLookupError(null);
    }

    if (!this.eventoSelecionado()) {
      this.setEventoLookupError(
        this.lancamentoForm.controls.idEvento.value.trim() ? 'eventoNaoConfirmado' : null,
      );
    }

    if (
      this.lancamentoForm.invalid ||
      (contaCorrente && !this.titularConta()) ||
      !this.eventoSelecionado()
    ) {
      this.lancamentoForm.markAllAsTouched();
      this.scrollToFirstInvalidLancamentoControl();
      return;
    }

    const value = this.lancamentoForm.getRawValue();
    const editingId = this.editingLancamentoId();
    const idLancamento = editingId ?? this.nextLancamentoId();
    const evento = this.eventoSelecionado() as EventoCco;
    const lancamento: LancamentoLote = {
      idLancamento,
      idLote: this.idLote,
      contaCorrente: value.contaCorrente.trim(),
      titularConta: this.titularConta() ?? '',
      valor: value.valor as number,
      historico: value.historico,
      estorno: value.estorno,
      documento: value.documento.trim(),
      descricao: value.descricao.trim(),
      situacao: value.situacao,
      pa: value.pa,
      tipoDocumentoCsc: value.tipoDocumentoCsc,
      idEvento: evento.idEvento,
      codigoEvento: evento.codigoEvento,
      descricaoEvento: evento.descricao,
      complementoHistorico: value.complementoHistorico.trim(),
      idDocumentoCsc: value.idDocumentoCsc.trim(),
      situacaoDocumentoCsc: value.situacaoDocumentoCsc,
      anexos: [...this.anexos()],
    };

    if (editingId === null) {
      this.lancamentos.update((items) => [...items, lancamento]);
    } else {
      this.lancamentos.update((items) =>
        items.map((item) => (item.idLancamento === editingId ? lancamento : item)),
      );
    }

    this.syncLancamentosCount();
    this.selectedLancamentoIds.set(new Set([idLancamento]));

    if (editingId !== null || !value.manterDadosTela) {
      this.closeModal();
    }
  }

  deleteSelectedLancamento(): void {
    if (this.mode === 'visualizar' || this.saving()) {
      return;
    }

    const selected = this.getSelectedLancamento();

    if (!selected) {
      return;
    }

    this.lancamentos.update((items) =>
      items.filter((item) => item.idLancamento !== selected.idLancamento),
    );
    this.syncLancamentosCount();
    this.selectedLancamentoIds.set(new Set<number>());
  }

  private prepareEditableForm(): void {
    if (this.lancamentoForm.disabled) {
      this.lancamentoForm.enable({ emitEvent: false });
    }
  }

  private scrollToFirstInvalidLancamentoControl(): void {
    const controls = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>(
        '.lancamento-form [formControlName]',
      ),
    );
    const firstInvalidControl = controls.find((element) => {
      const controlName = element.getAttribute('formControlName');

      return controlName !== null && this.lancamentoForm.get(controlName)?.invalid;
    });

    if (!firstInvalidControl) {
      return;
    }

    firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    firstInvalidControl.focus({ preventScroll: true });
  }

  private finishSuccessfulSave(message: string): void {
    this.saving.set(true);
    this.loteForm.disable({ emitEvent: false });
    this.filtro.disable({ emitEvent: false });
    this.loteFeedback.set(message);
    this.saveNavigationTimeout = globalThis.setTimeout(() => {
      void this.router.navigate(['/']);
    }, SAVE_SUCCESS_TRANSITION_MS);
  }

  private syncLancamentosCount(): void {
    this.loteForm.controls.quantidadeLancamentos.setValue(this.lancamentos().length);
  }

  private getSelectedLancamento(): LancamentoLote | null {
    const selectedId = this.selectedLancamentoId();

    return this.lancamentos().find((item) => item.idLancamento === selectedId) ?? null;
  }

  private getCheckboxState(event: Event): boolean | null {
    return event.target instanceof HTMLInputElement ? event.target.checked : null;
  }

  private nextLancamentoId(): number {
    return Math.max(0, ...this.lancamentos().map((item) => item.idLancamento)) + 1;
  }

  private setContaLookupError(errorKey: string | null): void {
    const control = this.lancamentoForm.controls.contaCorrente;
    const errors = { ...(control.errors ?? {}) };
    delete errors['contaNaoConfirmada'];
    delete errors['contaNaoLocalizada'];

    if (errorKey) {
      errors[errorKey] = true;
    }

    control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  private setEventoLookupError(errorKey: string | null): void {
    const control = this.lancamentoForm.controls.idEvento;
    const errors = { ...(control.errors ?? {}) };
    delete errors['eventoNaoConfirmado'];

    if (errorKey) {
      errors[errorKey] = true;
    }

    control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  private cancelEventSearch(): void {
    if (this.eventSearchTimeout !== undefined) {
      globalThis.clearTimeout(this.eventSearchTimeout);
      this.eventSearchTimeout = undefined;
    }

    this.eventoBuscando.set(false);
  }

  private getSelectedAnexo(): LancamentoAnexo | null {
    const selectedId = this.selectedAnexoId();

    return this.anexos().find((item) => item.id === selectedId) ?? null;
  }

  getAttachmentTypeLabel(anexo: LancamentoAnexo): string {
    const typeConfig = ATTACHMENT_TYPES[anexo.extensao];

    return typeConfig
      ? `${anexo.extensao.toLocaleUpperCase('pt-BR')} · ${typeConfig.label}`
      : 'Formato desconhecido';
  }

  formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let size = sizeInBytes / 1024;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    const fractionDigits = size >= 10 ? 1 : 2;

    return `${size.toLocaleString('pt-BR', { maximumFractionDigits: fractionDigits })} ${units[unitIndex]}`;
  }

  private nextAnexoId(): number {
    return Math.max(0, ...this.anexos().map((item) => item.id)) + 1;
  }

  private clearAnexoError(): void {
    this.anexoError.set(null);
  }

  private getFileExtension(fileName: string): string {
    const extensionIndex = fileName.lastIndexOf('.');

    return extensionIndex > 0 ? fileName.slice(extensionIndex + 1).toLocaleLowerCase('en-US') : '';
  }

  private getOrCreateAttachmentObjectUrl(file: File): string {
    const existingUrl = this.attachmentObjectUrls.get(file);

    if (existingUrl) {
      return existingUrl;
    }

    const objectUrl = URL.createObjectURL(file);
    this.attachmentObjectUrls.set(file, objectUrl);

    return objectUrl;
  }

  private revokeAttachmentObjectUrl(file: File): void {
    const objectUrl = this.attachmentObjectUrls.get(file);

    if (!objectUrl) {
      return;
    }

    URL.revokeObjectURL(objectUrl);
    this.attachmentObjectUrls.delete(file);
  }

  private revokeAllAttachmentObjectUrls(): void {
    for (const objectUrl of this.attachmentObjectUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }

    this.attachmentObjectUrls.clear();
  }

  private reduceFileName(fileName: string): string {
    const maxLength = 42;

    if (fileName.length <= maxLength) {
      return fileName;
    }

    const extensionIndex = fileName.lastIndexOf('.');
    const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : '';
    const availableNameLength = Math.max(12, maxLength - extension.length - 1);

    return `${fileName.slice(0, availableNameLength)}…${extension}`;
  }

  private formatDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }

  private formatDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  private getDetailMode(): LoteDetailMode {
    const mode = this.route.snapshot.data['mode'];

    return mode === 'incluir' || mode === 'alterar' ? mode : 'visualizar';
  }

  private normalizeConta(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLocaleUpperCase('pt-BR');
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleUpperCase('pt-BR');
  }
}
