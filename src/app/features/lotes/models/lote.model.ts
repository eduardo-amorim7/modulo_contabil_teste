export interface Lote {
  idLote: number;
  numeroLoteCco: string;
  instituicao: string;
  eventoAnexoPorLote: boolean;
  dataEntrada: string;
  valor: number;
  quantidadeLancamentos: number;
  usuarioRegistro: string;
  usuarioAprovacao: string | null;
  situacaoLote: string;
  dataHoraSituacaoLote: string;
  justificativa: string;
}

export interface LoteSearchResult {
  items: readonly Lote[];
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface LancamentoAnexo {
  id: number;
  nomeReduzido: string;
  descricao: string;
  extensao: string;
  mimeType: string;
  tamanhoBytes: number;
  dataInclusao: string;
  idUsuario: string;
  arquivo?: File;
}

export interface LancamentoLote {
  idLancamento: number;
  idLote: number;
  contaCorrente: string;
  titularConta: string;
  valor: number;
  historico: string;
  estorno: boolean;
  documento: string;
  descricao: string;
  situacao: string;
  pa: string;
  tipoDocumentoCsc: string;
  idEvento: number;
  codigoEvento: number;
  descricaoEvento: string;
  complementoHistorico: string;
  idDocumentoCsc: string;
  situacaoDocumentoCsc: string;
  anexos: readonly LancamentoAnexo[];
}
