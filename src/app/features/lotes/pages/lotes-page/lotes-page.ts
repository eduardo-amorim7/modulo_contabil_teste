import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of, Subject, switchMap, timer } from 'rxjs';

import { LoteActionsComponent } from '../../components/lote-actions/lote-actions';
import { LoteFiltersComponent } from '../../components/lote-filters/lote-filters';
import { LoteResultsComponent } from '../../components/lote-results/lote-results';
import { INITIAL_LOTE_FILTERS, LoteFilters } from '../../models/lote-filters.model';
import { Lote, LoteSearchResult } from '../../models/lote.model';
import {
  LOTE_SEARCH_ERROR_MESSAGE,
  LoteSearchError,
  LotesService,
} from '../../services/lotes.service';

interface SearchRequest {
  filters: LoteFilters;
  pageIndex: number;
  debounceMs: number;
}

interface SearchOutcome {
  result: LoteSearchResult | null;
  error: string | null;
}

const PAGE_SIZE = 5;
const SEARCH_DEBOUNCE_MS = 350;
const UNEXPECTED_SEARCH_ERROR_MESSAGE =
  'Ocorreu um erro inesperado durante a consulta. Tente novamente.';
const CURRENT_USER_ID = 'usuario.logado';
const SUCCESS_FEEDBACK_DURATION_MS = 3_500;
const ERROR_FEEDBACK_DURATION_MS = 4_000;
const FEEDBACK_FADE_DURATION_MS = 300;

type LoteDialog = 'justificativa' | 'exclusao' | null;

interface ActionFeedback {
  readonly message: string;
  readonly tone: 'success' | 'error';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    A11yModule,
    MatButtonModule,
    LoteActionsComponent,
    LoteFiltersComponent,
    LoteResultsComponent,
  ],
  selector: 'app-lotes-page',
  styleUrl: './lotes-page.scss',
  templateUrl: './lotes-page.html',
})
export class LotesPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly lotesService = inject(LotesService);
  private readonly router = inject(Router);
  private readonly searchRequests = new Subject<SearchRequest>();
  private readonly loteIdsFormatter = new Intl.ListFormat('pt-BR', {
    style: 'long',
    type: 'conjunction',
  });
  private feedbackFadeTimeout?: ReturnType<typeof globalThis.setTimeout>;
  private feedbackDismissalTimeout?: ReturnType<typeof globalThis.setTimeout>;
  private currentFilters: LoteFilters = INITIAL_LOTE_FILTERS;

  readonly items = signal<readonly Lote[]>([]);
  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly selectedIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly activeDialog = signal<LoteDialog>(null);
  readonly dialogLotes = signal<readonly Lote[]>([]);
  readonly actionFeedback = signal<ActionFeedback | null>(null);
  readonly actionFeedbackLeaving = signal(false);
  readonly selectedLoteId = computed(() => {
    const selection = this.selectedIds();

    return selection.size === 1 ? (selection.values().next().value ?? null) : null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelFeedbackTimers());

    this.searchRequests
      .pipe(
        switchMap((request) =>
          timer(request.debounceMs).pipe(
            switchMap(() =>
              this.lotesService.search(request.filters, request.pageIndex, PAGE_SIZE),
            ),
            map((result): SearchOutcome => ({
              result,
              error: null,
            })),
            catchError((error: unknown) =>
              of<SearchOutcome>({
                result: null,
                error: this.getErrorMessage(error),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => {
        this.loading.set(false);
        this.searching.set(false);

        if (outcome.result) {
          this.items.set(outcome.result.items);
          this.pageIndex.set(outcome.result.pageIndex);
          this.totalItems.set(outcome.result.totalItems);
          this.totalPages.set(outcome.result.totalPages);
          this.error.set(null);
          return;
        }

        this.error.set(outcome.error);
      });
  }

  ngOnInit(): void {
    this.queueSearch(INITIAL_LOTE_FILTERS, 0, 0, false);
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeDialog();
  }

  search(filters: LoteFilters): void {
    this.currentFilters = filters;
    this.selectedIds.set(new Set<number>());
    this.queueSearch(filters, 0, SEARCH_DEBOUNCE_MS, true);
  }

  changePage(pageIndex: number): void {
    this.queueSearch(this.currentFilters, pageIndex, 0, false);
  }

  retry(): void {
    this.queueSearch(this.currentFilters, this.pageIndex(), 0, false);
  }

  updateSelection(selection: ReadonlySet<number>): void {
    this.selectedIds.set(selection);
  }

  openSelectedLote(mode: 'alterar' | 'visualizar'): void {
    const idLote = this.selectedLoteId();

    if (idLote !== null) {
      void this.router.navigate(['/lotes', idLote, mode]);
    }
  }

  createLote(): void {
    void this.router.navigate(['/lotes/incluir']);
  }

  approveSelected(): void {
    const result = this.lotesService.approve(this.selectedIds(), CURRENT_USER_ID);

    if (result.invalidIds.length > 0) {
      this.showRepeatedActionError('confirmar', 'confirmado', result.invalidIds);
      return;
    }

    if (result.updatedCount > 0) {
      this.finishAction(
        result.updatedCount === 1
          ? 'Lote confirmado com sucesso.'
          : `${result.updatedCount} lotes confirmados com sucesso.`,
      );
    }
  }

  sendSelected(): void {
    const result = this.lotesService.send(this.selectedIds());

    if (result.invalidIds.length > 0) {
      this.showRepeatedActionError('enviar', 'enviado', result.invalidIds);
      return;
    }

    if (result.updatedCount > 0) {
      this.finishAction(
        result.updatedCount === 1
          ? 'Lote enviado com sucesso.'
          : `${result.updatedCount} lotes enviados com sucesso.`,
      );
    }
  }

  openJustificationDialog(): void {
    const selectedLotes = this.getSelectedLotes();

    if (selectedLotes.length > 0) {
      this.dialogLotes.set(selectedLotes);
      this.activeDialog.set('justificativa');
    }
  }

  requestDeletion(): void {
    const selectedLotes = this.getSelectedLotes();

    if (selectedLotes.length > 0) {
      this.dialogLotes.set(selectedLotes);
      this.activeDialog.set('exclusao');
    }
  }

  confirmDeletion(): void {
    const ids = new Set(this.dialogLotes().map((lote) => lote.idLote));
    const deletedCount = this.lotesService.delete(ids);

    this.closeDialog();

    if (deletedCount > 0) {
      this.finishAction(
        deletedCount === 1
          ? 'Lote excluído do mock com sucesso.'
          : `${deletedCount} lotes excluídos do mock com sucesso.`,
      );
    }
  }

  closeDialog(): void {
    this.activeDialog.set(null);
    this.dialogLotes.set([]);
  }

  dismissFeedback(): void {
    this.cancelFeedbackTimers();
    this.actionFeedbackLeaving.set(false);
    this.actionFeedback.set(null);
  }

  private queueSearch(
    filters: LoteFilters,
    pageIndex: number,
    debounceMs: number,
    showSearchSpinner: boolean,
  ): void {
    this.loading.set(true);
    this.searching.set(showSearchSpinner);
    this.error.set(null);
    this.searchRequests.next({ filters, pageIndex, debounceMs });
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof LoteSearchError
      ? LOTE_SEARCH_ERROR_MESSAGE
      : UNEXPECTED_SEARCH_ERROR_MESSAGE;
  }

  private getSelectedLotes(): readonly Lote[] {
    return [...this.selectedIds()]
      .map((idLote) => this.lotesService.findById(idLote))
      .filter((lote): lote is Lote => lote !== null);
  }

  private finishAction(message: string): void {
    this.selectedIds.set(new Set<number>());
    this.queueSearch(this.currentFilters, this.pageIndex(), 0, false);
    this.showFeedback(message, 'success');
  }

  private showRepeatedActionError(
    action: 'confirmar' | 'enviar',
    situation: 'confirmado' | 'enviado',
    invalidIds: readonly number[],
  ): void {
    const multiple = invalidIds.length > 1;
    const subject = multiple ? 'os lotes' : 'o lote';
    const verb = multiple ? 'estão' : 'está';
    const situationLabel = multiple ? `${situation}s` : situation;
    const idsLabel = this.loteIdsFormatter.format(invalidIds.map(String));

    this.showFeedback(
      `Não foi possível ${action}: ${subject} ${idsLabel} já ${verb} ${situationLabel}.`,
      'error',
    );
  }

  private showFeedback(message: string, tone: ActionFeedback['tone']): void {
    this.cancelFeedbackTimers();
    this.actionFeedbackLeaving.set(false);
    this.actionFeedback.set({ message, tone });

    const duration = tone === 'success' ? SUCCESS_FEEDBACK_DURATION_MS : ERROR_FEEDBACK_DURATION_MS;

    this.feedbackFadeTimeout = globalThis.setTimeout(
      () => this.actionFeedbackLeaving.set(true),
      duration - FEEDBACK_FADE_DURATION_MS,
    );
    this.feedbackDismissalTimeout = globalThis.setTimeout(() => {
      this.actionFeedback.set(null);
      this.actionFeedbackLeaving.set(false);
    }, duration);
  }

  private cancelFeedbackTimers(): void {
    if (this.feedbackFadeTimeout !== undefined) {
      globalThis.clearTimeout(this.feedbackFadeTimeout);
    }

    if (this.feedbackDismissalTimeout !== undefined) {
      globalThis.clearTimeout(this.feedbackDismissalTimeout);
    }

    this.feedbackFadeTimeout = undefined;
    this.feedbackDismissalTimeout = undefined;
  }
}
