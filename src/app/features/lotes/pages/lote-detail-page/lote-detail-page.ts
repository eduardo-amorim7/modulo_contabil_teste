import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { nonBlankValidator } from '../../../../shared/validators/input-value.validators';
import {
  LancamentoModalComponent,
  LancamentoModalMode,
  LancamentoModalSubmission,
} from '../../components/lancamento-modal/lancamento-modal';
import { LancamentoLote } from '../../models/lote.model';
import {
  LOTE_TOTAL_LIMIT_ERROR_MESSAGE,
  LoteTotalLimitError,
  LotesService,
} from '../../services/lotes.service';

type LoteDetailMode = 'incluir' | 'alterar' | 'visualizar';
const CURRENT_USER_ID = 'usuario.logado';
const SAVE_SUCCESS_TRANSITION_MS = 500;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    LancamentoModalComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  private readonly currencyPipe = new CurrencyPipe('pt-BR');
  private saveNavigationTimeout?: ReturnType<typeof globalThis.setTimeout>;

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

  readonly modalAberto = signal(false);
  readonly modalMode = signal<LancamentoModalMode>('incluir');
  readonly modalLancamento = signal<LancamentoLote | null>(null);
  readonly selectedLancamentoIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly selectedLancamentoId = computed(() => {
    const selection = this.selectedLancamentoIds();

    return selection.size === 1 ? (selection.values().next().value ?? null) : null;
  });
  readonly nextLancamentoId = computed(
    () => Math.max(0, ...this.lancamentos().map((item) => item.idLancamento)) + 1,
  );
  readonly loteFeedback = signal<string | null>(null);
  readonly loteFeedbackTone = signal<'success' | 'error'>('success');
  readonly saving = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.saveNavigationTimeout !== undefined) {
        globalThis.clearTimeout(this.saveNavigationTimeout);
      }
    });
  }

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
        this.currencyPipe.transform(lancamento.valor, 'BRL', 'symbol', '1.2-2', 'pt-BR') ?? '',
        lancamento.historico,
        lancamento.documento,
        lancamento.situacaoDocumentoCsc,
      ].some((value) => this.normalize(String(value)).includes(normalizedFilter)),
    );
  });
  readonly visibleSelectedLancamentoId = computed(() => {
    const selectedId = this.selectedLancamentoId();

    return selectedId !== null &&
      this.filteredLancamentos().some((item) => item.idLancamento === selectedId)
      ? selectedId
      : null;
  });

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

    try {
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
    } catch (error: unknown) {
      if (error instanceof LoteTotalLimitError) {
        this.loteFeedbackTone.set('error');
        this.loteFeedback.set(LOTE_TOTAL_LIMIT_ERROR_MESSAGE);
        return;
      }

      throw error;
    }
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

    this.modalMode.set('incluir');
    this.modalLancamento.set(null);
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

    this.modalMode.set(targetMode);
    this.modalLancamento.set(selected);
    this.modalAberto.set(true);
  }

  closeModal(): void {
    this.modalAberto.set(false);
    this.modalLancamento.set(null);
  }

  handleLancamentoSaved(submission: LancamentoModalSubmission): void {
    const { lancamento, manterDadosTela } = submission;
    const editing = this.modalMode() === 'alterar';

    if (editing) {
      this.lancamentos.update((items) =>
        items.map((item) => (item.idLancamento === lancamento.idLancamento ? lancamento : item)),
      );
    } else {
      this.lancamentos.update((items) => [...items, lancamento]);
    }

    this.syncLancamentosCount();
    this.selectedLancamentoIds.set(new Set([lancamento.idLancamento]));
    this.loteFeedback.set(null);

    if (editing || !manterDadosTela) {
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
    this.loteFeedback.set(null);
  }

  private finishSuccessfulSave(message: string): void {
    this.saving.set(true);
    this.loteForm.disable({ emitEvent: false });
    this.filtro.disable({ emitEvent: false });
    this.loteFeedbackTone.set('success');
    this.loteFeedback.set(message);
    this.saveNavigationTimeout = globalThis.setTimeout(() => {
      void this.router.navigate(['/']);
    }, SAVE_SUCCESS_TRANSITION_MS);
  }

  private syncLancamentosCount(): void {
    this.loteForm.controls.quantidadeLancamentos.setValue(this.lancamentos().length);
  }

  private getSelectedLancamento(): LancamentoLote | null {
    const selectedId = this.visibleSelectedLancamentoId();

    return this.filteredLancamentos().find((item) => item.idLancamento === selectedId) ?? null;
  }

  private getCheckboxState(event: Event): boolean | null {
    return event.target instanceof HTMLInputElement ? event.target.checked : null;
  }

  private formatDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  private getDetailMode(): LoteDetailMode {
    const mode = this.route.snapshot.data['mode'];

    return mode === 'incluir' || mode === 'alterar' ? mode : 'visualizar';
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
