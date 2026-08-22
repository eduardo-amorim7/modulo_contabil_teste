import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { INITIAL_LOTE_FILTERS } from '../models/lote-filters.model';
import { LoteSearchResult } from '../models/lote.model';
import { LotesService } from './lotes.service';

describe('LotesService', () => {
  let service: LotesService;

  beforeEach(() => {
    service = TestBed.inject(LotesService);
  });

  it('should filter and paginate the mock results', async () => {
    const result: LoteSearchResult = await firstValueFrom(
      service.search(
        {
          ...INITIAL_LOTE_FILTERS,
          idLoteDe: 5,
          idLoteAte: 13,
          valorLoteDe: 1000,
        },
        0,
        3,
        0,
      ),
    );

    expect(result?.items.map((lote) => lote.idLote)).toEqual([5, 6, 8]);
    expect(result?.totalItems).toBe(7);
    expect(result?.totalPages).toBe(3);
  });

  it('should include only lot ids greater than or equal to the initial id', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, idLoteDe: 18 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([18, 19, 20, 21, 22]);
    expect(result.totalItems).toBe(5);
  });

  it('should include only lot ids less than or equal to the final id', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, idLoteAte: 7 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([3, 4, 5, 6, 7]);
    expect(result.totalItems).toBe(5);
  });

  it('should apply both inclusive lot id limits', async () => {
    const result = await firstValueFrom(
      service.search(
        { ...INITIAL_LOTE_FILTERS, idLoteDe: 10, idLoteAte: 14 },
        0,
        10,
        0,
      ),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([10, 11, 12, 13, 14]);
    expect(result.totalItems).toBe(5);
  });

  it('should include only lot values greater than or equal to the initial amount', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, valorLoteDe: 3200.75 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([8, 11, 16, 20, 22]);
    expect(result.totalItems).toBe(5);
  });

  it('should include only lot values less than or equal to the final amount', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, valorLoteAte: 830.9 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([9, 14, 17]);
    expect(result.totalItems).toBe(3);
  });

  it('should apply both inclusive monetary value limits', async () => {
    const result = await firstValueFrom(
      service.search(
        { ...INITIAL_LOTE_FILTERS, valorLoteDe: 1000, valorLoteAte: 1500 },
        0,
        10,
        0,
      ),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([3, 12, 15, 19]);
    expect(result.totalItems).toBe(4);
  });

  const situationScenarios = [
    ['TODAS', [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]],
    ['ABERTO', [3, 6, 7, 9, 11, 12, 14, 17, 18, 20, 21]],
    ['ENVIADO', [4, 10, 15, 19]],
    ['CONFIRMADO', [5, 8, 13, 16, 22]],
  ] as const;

  for (const [situation, expectedIds] of situationScenarios) {
    it(`should apply the ${situation} lot situation filter`, async () => {
      const result = await firstValueFrom(
        service.search({ ...INITIAL_LOTE_FILTERS, situacao: situation }, 0, 25, 0),
      );

      expect(result.items.map((lote) => lote.idLote)).toEqual([...expectedIds]);
      expect(result.totalItems).toBe(expectedIds.length);
    });
  }

  it('should include entry dates greater than or equal to the initial date', async () => {
    const result = await firstValueFrom(
      service.search(
        { ...INITIAL_LOTE_FILTERS, dataEntradaDe: new Date(2026, 4, 18) },
        0,
        10,
        0,
      ),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([17, 18, 19, 20, 21, 22]);
    expect(result.totalItems).toBe(6);
  });

  it('should include entry dates less than or equal to the final date', async () => {
    const result = await firstValueFrom(
      service.search(
        { ...INITIAL_LOTE_FILTERS, dataEntradaAte: new Date(2026, 4, 4) },
        0,
        10,
        0,
      ),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([3, 4, 5, 6, 7]);
    expect(result.totalItems).toBe(5);
  });

  it('should apply both inclusive entry-date limits', async () => {
    const result = await firstValueFrom(
      service.search(
        {
          ...INITIAL_LOTE_FILTERS,
          dataEntradaDe: new Date(2026, 4, 6, 23, 59, 59),
          dataEntradaAte: new Date(2026, 4, 13, 1, 30),
        },
        0,
        10,
        0,
      ),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([9, 10, 11, 12, 13, 14]);
    expect(result.totalItems).toBe(6);
  });


  it('should apply situation and entry-date filters', async () => {
    const result: LoteSearchResult = await firstValueFrom(
      service.search(
        {
          ...INITIAL_LOTE_FILTERS,
          situacao: 'CONFIRMADO',
          dataEntradaDe: new Date(2026, 4, 1),
          dataEntradaAte: new Date(2026, 4, 15),
        },
        0,
        10,
        0,
      ),
    );

    expect(result?.items.map((lote) => lote.idLote)).toEqual([8, 13, 16]);
  });

  it('should expose the deterministic simulated error', async () => {
    await expectAsync(
      firstValueFrom(
        service.search(
          { ...INITIAL_LOTE_FILTERS, instituicao: 'SIMULAR ERRO' },
          0,
          5,
          0,
        ),
      ),
    ).toBeRejectedWithError(/Não foi possível consultar os lotes/);
  });
});
