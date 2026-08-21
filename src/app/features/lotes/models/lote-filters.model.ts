export const LOTE_SITUACOES = ['TODAS', 'ABERTO', 'ENVIADO', 'CONFIRMADO'] as const;

export type LoteSituacaoFiltro = (typeof LOTE_SITUACOES)[number];

export interface LoteFilters {
  instituicaoResponsavel: string;
  instituicao: string;
  situacao: LoteSituacaoFiltro;
  idLoteDe: number | null;
  idLoteAte: number | null;
  valorLoteDe: number | null;
  valorLoteAte: number | null;
  dataEntradaDe: Date | null;
  dataEntradaAte: Date | null;
}
