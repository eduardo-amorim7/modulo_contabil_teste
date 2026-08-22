export interface Lote {
  idLote: number;
  dataEntrada: string;
  valor: number;
  quantidadeLancamentos: number;
  usuarioRegistro: string;
  usuarioAprovacao: string | null;
  situacaoLote: string;
  dataHoraSituacaoLote: string;
}

export interface LoteSearchResult {
  items: readonly Lote[];
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
