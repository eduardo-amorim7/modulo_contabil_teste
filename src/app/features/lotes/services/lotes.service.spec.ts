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

  it('should expose a lot and its entries by lot id', () => {
    expect(service.findById(3)?.idLote).toBe(3);
    expect(service.findLancamentosByLoteId(3).map(({ idLancamento }) => idLancamento)).toEqual([
      3001,
    ]);
  });

  it('should keep every mock lot total and entry count consistent with its entries', async () => {
    const result = await firstValueFrom(service.search(INITIAL_LOTE_FILTERS, 0, 100, 0));

    for (const lote of result.items) {
      const lancamentos = service.findLancamentosByLoteId(lote.idLote);
      const total = lancamentos.reduce((sum, lancamento) => sum + lancamento.valor, 0);

      expect(lancamentos.length)
        .withContext(`Quantidade de lançamentos do lote ${lote.idLote}`)
        .toBe(lote.quantidadeLancamentos);
      expect(total).withContext(`Valor total do lote ${lote.idLote}`).toBeCloseTo(lote.valor, 2);
    }
  });

  it('should return an empty detail for an unknown lot id', () => {
    expect(service.findById(999)).toBeNull();
    expect(service.findLancamentosByLoteId(999)).toEqual([]);
  });

  it('should create an open lot without requiring entries', async () => {
    const created = service.create(
      {
        numeroLoteCco: ' CCO-NOVO-00023 ',
        instituicao: ' 0002 - SICOOB CENTRAL ',
        eventoAnexoPorLote: true,
        lancamentos: [],
        usuarioRegistro: 'usuario.logado',
      },
      new Date(2026, 7, 22, 11, 5, 9),
    );

    expect(created).toEqual(
      jasmine.objectContaining({
        idLote: 23,
        numeroLoteCco: 'CCO-NOVO-00023',
        instituicao: '0002 - SICOOB CENTRAL',
        eventoAnexoPorLote: true,
        dataEntrada: '22/08/2026',
        valor: 0,
        quantidadeLancamentos: 0,
        situacaoLote: 'Aberto',
        dataHoraSituacaoLote: '22/08/2026 11:05:09',
      }),
    );
    expect(service.findLancamentosByLoteId(created.idLote)).toEqual([]);

    const result = await firstValueFrom(service.search(INITIAL_LOTE_FILTERS, 0, 5, 0));
    expect(result.items[0].idLote).toBe(created.idLote);
    expect(result.totalItems).toBe(21);
  });

  it('should keep created lots only for the lifetime of the service instance', async () => {
    const created = service.create({
      numeroLoteCco: 'CCO-SOMENTE-MEMORIA',
      instituicao: '0002 - SICOOB CENTRAL',
      eventoAnexoPorLote: false,
      lancamentos: [],
      usuarioRegistro: 'usuario.logado',
    });
    const currentResult = await firstValueFrom(service.search(INITIAL_LOTE_FILTERS, 0, 100, 0));
    const freshService = new LotesService();
    const reloadedResult = await firstValueFrom(
      freshService.search(INITIAL_LOTE_FILTERS, 0, 100, 0),
    );

    expect(currentResult.items.map((lote) => lote.idLote)).toContain(created.idLote);
    expect(freshService.findById(created.idLote)).toBeNull();
    expect(reloadedResult.totalItems).toBe(20);
  });

  it('should persist the entries supplied while creating a lot', () => {
    const sourceEntry = service.findLancamentosByLoteId(3)[0];
    const created = service.create({
      numeroLoteCco: 'CCO-COM-LANCAMENTO',
      instituicao: '0004 - SICOOB COPERATIVA',
      eventoAnexoPorLote: false,
      lancamentos: [{ ...sourceEntry, idLote: 0, idLancamento: 1 }],
      usuarioRegistro: 'usuario.logado',
    });
    const persistedEntries = service.findLancamentosByLoteId(created.idLote);

    expect(created.quantidadeLancamentos).toBe(1);
    expect(created.valor).toBe(sourceEntry.valor);
    expect(persistedEntries.length).toBe(1);
    expect(persistedEntries[0].idLote).toBe(created.idLote);
    expect(persistedEntries[0].idLancamento).not.toBe(1);
  });

  it('should persist entry changes and recalculate an existing lot summary', () => {
    const lote = service.findById(3)!;
    const existingEntry = service.findLancamentosByLoteId(3)[0];
    const updated = service.update(3, {
      numeroLoteCco: lote.numeroLoteCco,
      instituicao: lote.instituicao,
      eventoAnexoPorLote: lote.eventoAnexoPorLote,
      lancamentos: [
        { ...existingEntry, valor: 1000 },
        {
          ...existingEntry,
          idLancamento: 0,
          valor: 250,
          documento: 'DOC-NOVO',
        },
      ],
    });
    const persistedEntries = service.findLancamentosByLoteId(3);

    expect(updated).toBe(lote);
    expect(updated).toEqual(
      jasmine.objectContaining({
        valor: 1250,
        quantidadeLancamentos: 2,
      }),
    );
    expect(persistedEntries.map((entry) => entry.valor)).toEqual([1000, 250]);
    expect(persistedEntries.map((entry) => entry.documento)).toEqual([
      existingEntry.documento,
      'DOC-NOVO',
    ]);
    expect(new Set(persistedEntries.map((entry) => entry.idLancamento)).size).toBe(2);
  });

  it('should reset the total when every entry is removed from an existing lot', () => {
    const lote = service.findById(3)!;

    service.update(3, {
      numeroLoteCco: lote.numeroLoteCco,
      instituicao: lote.instituicao,
      eventoAnexoPorLote: lote.eventoAnexoPorLote,
      lancamentos: [],
    });

    expect(service.findById(3)).toEqual(
      jasmine.objectContaining({ valor: 0, quantidadeLancamentos: 0 }),
    );
    expect(service.findLancamentosByLoteId(3)).toEqual([]);
  });

  it('should approve multiple lots and record the approval user and timestamp', () => {
    const result = service.approve(
      new Set([3, 6]),
      'usuario.logado',
      new Date(2026, 7, 22, 11, 5, 9),
    );

    expect(result).toEqual({ updatedCount: 2, invalidIds: [] });
    expect(service.findById(3)).toEqual(
      jasmine.objectContaining({
        usuarioAprovacao: 'usuario.logado',
        situacaoLote: 'Confirmado',
        dataHoraSituacaoLote: '22/08/2026 11:05:09',
      }),
    );
    expect(service.findById(6)?.situacaoLote).toBe('Confirmado');
    expect(service.findById(7)?.situacaoLote).toBe('Aberto');
  });

  it('should send multiple lots without removing an existing approval user', () => {
    const existingApprovalUser = service.findById(5)?.usuarioAprovacao;
    const result = service.send(new Set([3, 5]), new Date(2026, 7, 22, 12, 30, 45));

    expect(result).toEqual({ updatedCount: 2, invalidIds: [] });
    expect(service.findById(3)?.situacaoLote).toBe('Enviado');
    expect(service.findById(5)).toEqual(
      jasmine.objectContaining({
        usuarioAprovacao: existingApprovalUser,
        situacaoLote: 'Enviado',
        dataHoraSituacaoLote: '22/08/2026 12:30:45',
      }),
    );
  });

  it('should reject the entire approval batch when a selected lot is already confirmed', () => {
    const result = service.approve(new Set([3, 5, 8]), 'usuario.logado');

    expect(result).toEqual({ updatedCount: 0, invalidIds: [5, 8] });
    expect(service.findById(3)?.situacaoLote).toBe('Aberto');
    expect(service.findById(3)?.usuarioAprovacao).toBeNull();
  });

  it('should reject the entire sending batch when a selected lot is already sent', () => {
    const result = service.send(new Set([3, 4]));

    expect(result).toEqual({ updatedCount: 0, invalidIds: [4] });
    expect(service.findById(3)?.situacaoLote).toBe('Aberto');
  });

  it('should delete multiple lots only from the current in-memory mock', async () => {
    expect(service.delete(new Set([3, 4]))).toBe(2);
    expect(service.findById(3)).toBeNull();

    const currentResult = await firstValueFrom(service.search(INITIAL_LOTE_FILTERS, 0, 25, 0));
    const reloadedService = new LotesService();

    expect(currentResult.totalItems).toBe(18);
    expect(reloadedService.findById(3)?.idLote).toBe(3);
  });

  it('should find every institution containing the partial SICOOB term', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, instituicao: 'sicoob' }, 0, 25, 0),
    );

    expect(result.totalItems).toBe(20);
    expect(new Set(result.items.map((lote) => lote.instituicao))).toEqual(
      new Set(['0002 - SICOOB CENTRAL', '0004 - SICOOB COPERATIVA']),
    );
  });

  it('should filter institutions by a partial code or name', async () => {
    const centralResult = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, instituicao: '0002' }, 0, 25, 0),
    );
    const coperativaResult = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, instituicao: 'coperativa' }, 0, 25, 0),
    );

    expect(centralResult.totalItems).toBe(10);
    expect(
      centralResult.items.every((lote) => lote.instituicao === '0002 - SICOOB CENTRAL'),
    ).toBeTrue();
    expect(coperativaResult.totalItems).toBe(10);
    expect(
      coperativaResult.items.every((lote) => lote.instituicao === '0004 - SICOOB COPERATIVA'),
    ).toBeTrue();
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
      service.search({ ...INITIAL_LOTE_FILTERS, idLoteDe: 10, idLoteAte: 14 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([10, 11, 12, 13, 14]);
    expect(result.totalItems).toBe(5);
  });

  it('should include only lot values greater than or equal to the initial amount', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, valorLoteDe: 3200.75 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([8, 11, 16, 20]);
    expect(result.totalItems).toBe(4);
  });

  it('should include only lot values less than or equal to the final amount', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, valorLoteAte: 830.9 }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([9, 14, 17, 22]);
    expect(result.totalItems).toBe(4);
  });

  it('should apply both inclusive monetary value limits', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, valorLoteDe: 1000, valorLoteAte: 1500 }, 0, 10, 0),
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
      service.search({ ...INITIAL_LOTE_FILTERS, dataEntradaDe: new Date(2026, 4, 18) }, 0, 10, 0),
    );

    expect(result.items.map((lote) => lote.idLote)).toEqual([17, 18, 19, 20, 21, 22]);
    expect(result.totalItems).toBe(6);
  });

  it('should include entry dates less than or equal to the final date', async () => {
    const result = await firstValueFrom(
      service.search({ ...INITIAL_LOTE_FILTERS, dataEntradaAte: new Date(2026, 4, 4) }, 0, 10, 0),
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
        service.search({ ...INITIAL_LOTE_FILTERS, instituicao: 'SIMULAR ERRO' }, 0, 5, 0),
      ),
    ).toBeRejectedWithError(/Não foi possível consultar os lotes/);
  });
});
