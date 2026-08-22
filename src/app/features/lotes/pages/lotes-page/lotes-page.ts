import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoteActionsComponent, LoteFiltersComponent, LoteResultsComponent],
  selector: 'app-lotes-page',
  styleUrl: './lotes-page.scss',
  templateUrl: './lotes-page.html',
})
export class LotesPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly lotesService = inject(LotesService);
  private readonly searchRequests = new Subject<SearchRequest>();
  private currentFilters: LoteFilters = INITIAL_LOTE_FILTERS;

  readonly items = signal<readonly Lote[]>([]);
  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);
  readonly selectedIds = signal<ReadonlySet<number>>(new Set<number>());

  constructor() {
    this.searchRequests
      .pipe(
        switchMap((request) =>
          timer(request.debounceMs).pipe(
            switchMap(() => this.lotesService.search(request.filters, request.pageIndex, PAGE_SIZE)),
            map(
              (result): SearchOutcome => ({
                result,
                error: null,
              }),
            ),
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
}
