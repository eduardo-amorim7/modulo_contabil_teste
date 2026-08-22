import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';

import { LOTES_MOCK } from '../data/lotes.mock';
import { LoteFilters } from '../models/lote-filters.model';
import { Lote, LoteSearchResult } from '../models/lote.model';

const MOCK_LATENCY_MS = 650;
export const LOTE_SEARCH_ERROR_MESSAGE = 'Não foi possível consultar os lotes. Tente novamente.';

export class LoteSearchError extends Error {
  constructor() {
    super(LOTE_SEARCH_ERROR_MESSAGE);
    this.name = 'LoteSearchError';
  }
}

@Injectable({ providedIn: 'root' })
export class LotesService {
  search(
    filters: LoteFilters,
    pageIndex: number,
    pageSize: number,
    latencyMs = MOCK_LATENCY_MS,
  ): Observable<LoteSearchResult> {
    return timer(latencyMs).pipe(
      map(() => {
        if (this.shouldSimulateError(filters)) {
          throw new LoteSearchError();
        }

        const filteredItems = LOTES_MOCK.filter((lote) => this.matchesFilters(lote, filters));
        const totalItems = filteredItems.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePageIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);
        const startIndex = safePageIndex * pageSize;

        return {
          items: filteredItems.slice(startIndex, startIndex + pageSize),
          pageIndex: safePageIndex,
          pageSize,
          totalItems,
          totalPages,
        };
      }),
    );
  }

  private matchesFilters(lote: Lote, filters: LoteFilters): boolean {
    const entryDate = this.parseBrazilianDate(lote.dataEntrada);
    const fromDate = this.toCalendarDay(filters.dataEntradaDe);
    const toDate = this.toCalendarDay(filters.dataEntradaAte);
    const situationMatches =
      filters.situacao === 'TODAS' ||
      this.normalizeSituation(lote.situacaoLote) === this.normalizeSituation(filters.situacao);

    return (
      situationMatches &&
      (filters.idLoteDe === null || lote.idLote >= filters.idLoteDe) &&
      (filters.idLoteAte === null || lote.idLote <= filters.idLoteAte) &&
      (filters.valorLoteDe === null || lote.valor >= filters.valorLoteDe) &&
      (filters.valorLoteAte === null || lote.valor <= filters.valorLoteAte) &&
      (fromDate === null || entryDate >= fromDate) &&
      (toDate === null || entryDate <= toDate)
    );
  }

  private shouldSimulateError(filters: LoteFilters): boolean {
    return filters.instituicao.trim().toLocaleUpperCase('pt-BR').includes('ERRO');
  }

  private normalizeSituation(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleUpperCase('pt-BR');
  }

  private parseBrazilianDate(value: string): number {
    const [day, month, year] = value.split('/').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  private toCalendarDay(value: Date | null): number | null {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }

    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }
}
