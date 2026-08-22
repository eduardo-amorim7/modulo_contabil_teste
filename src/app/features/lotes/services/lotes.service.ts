import { Injectable, signal } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';

import { LANCAMENTOS_MOCK } from '../data/lancamentos.mock';
import { LOTES_MOCK } from '../data/lotes.mock';
import { LoteFilters } from '../models/lote-filters.model';
import { LancamentoLote, Lote, LoteSearchResult } from '../models/lote.model';

const MOCK_LATENCY_MS = 650;
export const LOTE_SEARCH_ERROR_MESSAGE = 'Não foi possível consultar os lotes. Tente novamente.';

export class LoteSearchError extends Error {
  constructor() {
    super(LOTE_SEARCH_ERROR_MESSAGE);
    this.name = 'LoteSearchError';
  }
}

export interface LoteBatchActionResult {
  readonly updatedCount: number;
  readonly invalidIds: readonly number[];
}

export interface CreateLoteInput {
  readonly numeroLoteCco: string;
  readonly instituicao: string;
  readonly eventoAnexoPorLote: boolean;
  readonly lancamentos: readonly LancamentoLote[];
  readonly usuarioRegistro: string;
}

export interface UpdateLoteInput {
  readonly numeroLoteCco: string;
  readonly instituicao: string;
  readonly eventoAnexoPorLote: boolean;
  readonly lancamentos: readonly LancamentoLote[];
}

@Injectable({ providedIn: 'root' })
export class LotesService {
  private baseLotes: Lote[] = LOTES_MOCK.map((lote) => ({ ...lote }));
  private baseLancamentos: LancamentoLote[] = LANCAMENTOS_MOCK.map((lancamento) => ({
    ...lancamento,
    anexos: [...lancamento.anexos],
  }));
  private readonly temporaryLotes = signal<readonly Lote[]>([]);
  private readonly temporaryLancamentos = signal<readonly LancamentoLote[]>([]);

  findById(idLote: number): Lote | null {
    return this.allLotes().find((lote) => lote.idLote === idLote) ?? null;
  }

  findLancamentosByLoteId(idLote: number): readonly LancamentoLote[] {
    return this.allLancamentos().filter((lancamento) => lancamento.idLote === idLote);
  }

  create(input: CreateLoteInput, now = new Date()): Lote {
    const idLote = Math.max(0, ...this.allLotes().map((lote) => lote.idLote)) + 1;
    let nextLancamentoId =
      Math.max(0, ...this.allLancamentos().map((lancamento) => lancamento.idLancamento)) + 1;
    const lancamentos = input.lancamentos.map((lancamento) => ({
      ...lancamento,
      idLancamento: nextLancamentoId++,
      idLote,
      anexos: [...lancamento.anexos],
    }));
    const lote: Lote = {
      idLote,
      numeroLoteCco: input.numeroLoteCco.trim(),
      instituicao: input.instituicao.trim(),
      eventoAnexoPorLote: input.eventoAnexoPorLote,
      dataEntrada: this.formatDate(now),
      valor: this.calculateTotal(lancamentos),
      quantidadeLancamentos: lancamentos.length,
      usuarioRegistro: input.usuarioRegistro,
      usuarioAprovacao: null,
      situacaoLote: 'Aberto',
      dataHoraSituacaoLote: this.formatDateTime(now),
      justificativa: '',
    };

    this.temporaryLancamentos.update((items) => [...items, ...lancamentos]);
    this.temporaryLotes.update((items) => [lote, ...items]);

    return lote;
  }

  update(idLote: number, input: UpdateLoteInput): Lote | null {
    const lote = this.findById(idLote);

    if (!lote) {
      return null;
    }

    const currentLancamentos = this.findLancamentosByLoteId(idLote);
    const existingIds = new Set(currentLancamentos.map((lancamento) => lancamento.idLancamento));
    const retainedIds = new Set<number>();
    let nextLancamentoId =
      Math.max(0, ...this.allLancamentos().map((lancamento) => lancamento.idLancamento)) + 1;
    const lancamentos = input.lancamentos.map((lancamento) => {
      const retainsExistingId =
        existingIds.has(lancamento.idLancamento) && !retainedIds.has(lancamento.idLancamento);
      const idLancamento = retainsExistingId ? lancamento.idLancamento : nextLancamentoId++;

      retainedIds.add(idLancamento);

      return {
        ...lancamento,
        idLancamento,
        idLote,
        anexos: [...lancamento.anexos],
      };
    });

    Object.assign(lote, {
      numeroLoteCco: input.numeroLoteCco.trim(),
      instituicao: input.instituicao.trim(),
      eventoAnexoPorLote: input.eventoAnexoPorLote,
      valor: this.calculateTotal(lancamentos),
      quantidadeLancamentos: lancamentos.length,
    });
    if (this.isTemporaryLote(idLote)) {
      this.temporaryLotes.update((items) => [...items]);
      this.temporaryLancamentos.update((items) => [
        ...items.filter((lancamento) => lancamento.idLote !== idLote),
        ...lancamentos,
      ]);
    } else {
      this.baseLancamentos = [
        ...this.baseLancamentos.filter((lancamento) => lancamento.idLote !== idLote),
        ...lancamentos,
      ];
    }

    return lote;
  }

  approve(ids: ReadonlySet<number>, approvalUser: string, now = new Date()): LoteBatchActionResult {
    return this.updateLots(ids, 'Confirmado', (lote) => ({
      ...lote,
      usuarioAprovacao: approvalUser,
      situacaoLote: 'Confirmado',
      dataHoraSituacaoLote: this.formatDateTime(now),
    }));
  }

  send(ids: ReadonlySet<number>, now = new Date()): LoteBatchActionResult {
    return this.updateLots(ids, 'Enviado', (lote) => ({
      ...lote,
      situacaoLote: 'Enviado',
      dataHoraSituacaoLote: this.formatDateTime(now),
    }));
  }

  delete(ids: ReadonlySet<number>): number {
    const previousCount = this.allLotes().length;
    this.baseLotes = this.baseLotes.filter((lote) => !ids.has(lote.idLote));
    this.baseLancamentos = this.baseLancamentos.filter((lancamento) => !ids.has(lancamento.idLote));
    this.temporaryLotes.update((items) => items.filter((lote) => !ids.has(lote.idLote)));
    this.temporaryLancamentos.update((items) =>
      items.filter((lancamento) => !ids.has(lancamento.idLote)),
    );

    return previousCount - this.allLotes().length;
  }

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

        const filteredItems = this.allLotes().filter((lote) => this.matchesFilters(lote, filters));
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
      this.normalizeText(lote.situacaoLote) === this.normalizeText(filters.situacao);
    const institutionFilter = this.normalizeText(filters.instituicao);
    const institutionMatches =
      institutionFilter === '' || this.normalizeText(lote.instituicao).includes(institutionFilter);

    return (
      institutionMatches &&
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

  private normalizeText(value: string): string {
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

  private updateLots(
    ids: ReadonlySet<number>,
    invalidSituation: string,
    update: (lote: Lote) => Lote,
  ): LoteBatchActionResult {
    const normalizedInvalidSituation = this.normalizeText(invalidSituation);
    const invalidIds = this.allLotes()
      .filter(
        (lote) =>
          ids.has(lote.idLote) &&
          this.normalizeText(lote.situacaoLote) === normalizedInvalidSituation,
      )
      .map((lote) => lote.idLote);

    if (invalidIds.length > 0) {
      return { updatedCount: 0, invalidIds };
    }

    let updatedCount = 0;

    const updateMatchingLote = (lote: Lote): Lote => {
      if (!ids.has(lote.idLote)) {
        return lote;
      }

      updatedCount += 1;
      return update(lote);
    };

    this.baseLotes = this.baseLotes.map(updateMatchingLote);
    this.temporaryLotes.update((items) => items.map(updateMatchingLote));

    return { updatedCount, invalidIds: [] };
  }

  private allLotes(): readonly Lote[] {
    return [...this.temporaryLotes(), ...this.baseLotes];
  }

  private allLancamentos(): readonly LancamentoLote[] {
    return [...this.temporaryLancamentos(), ...this.baseLancamentos];
  }

  private isTemporaryLote(idLote: number): boolean {
    return this.temporaryLotes().some((lote) => lote.idLote === idLote);
  }

  private calculateTotal(lancamentos: readonly LancamentoLote[]): number {
    const total = lancamentos.reduce((sum, lancamento) => sum + lancamento.valor, 0);

    return Math.round((total + Number.EPSILON) * 100) / 100;
  }

  private formatDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private formatDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
}
