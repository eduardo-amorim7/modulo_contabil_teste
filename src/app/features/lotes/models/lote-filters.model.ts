export const LOTE_SITUACOES = ['TODAS', 'ABERTO', 'ENVIADO', 'CONFIRMADO'] as const;
export const INSTITUICAO_RESPONSAVEL = '0001 - SICOOB';

export type LoteSituacaoFiltro = (typeof LOTE_SITUACOES)[number];

export interface LoteFilters {
  instituicao: string;
  situacao: LoteSituacaoFiltro;
  idLoteDe: number | null;
  idLoteAte: number | null;
  valorLoteDe: number | null;
  valorLoteAte: number | null;
  dataEntradaDe: Date | null;
  dataEntradaAte: Date | null;
}

export const INITIAL_LOTE_FILTERS: LoteFilters = {
  instituicao: '',
  situacao: 'TODAS',
  idLoteDe: null,
  idLoteAte: null,
  valorLoteDe: null,
  valorLoteAte: null,
  dataEntradaDe: null,
  dataEntradaAte: null,
};
