import { LancamentoLote } from '../models/lote.model';
import { LOTES_MOCK } from './lotes.mock';

const LANCAMENTOS_RESUMO_MOCK: ReadonlyArray<
  Pick<
    LancamentoLote,
    'idLancamento' | 'idLote' | 'contaCorrente' | 'historico' | 'situacaoDocumentoCsc'
  >
> = [
  {
    idLancamento: 3001,
    idLote: 3,
    contaCorrente: '1.1.1.02.001',
    historico: 'Crédito de ajuste contábil',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 4001,
    idLote: 4,
    contaCorrente: '1.1.2.01.004',
    historico: 'Débito de regularização',
    situacaoDocumentoCsc: 'Em processamento',
  },
  {
    idLancamento: 5001,
    idLote: 5,
    contaCorrente: '2.1.1.03.002',
    historico: 'Crédito de conciliação financeira',
    situacaoDocumentoCsc: 'Processado',
  },
  {
    idLancamento: 6001,
    idLote: 6,
    contaCorrente: '1.1.1.02.006',
    historico: 'Ajuste de saldo da conta-corrente',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 7001,
    idLote: 7,
    contaCorrente: '1.1.2.02.003',
    historico: 'Crédito de compensação',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 8001,
    idLote: 8,
    contaCorrente: '2.1.1.01.008',
    historico: 'Débito de encerramento mensal',
    situacaoDocumentoCsc: 'Processado',
  },
  {
    idLancamento: 9001,
    idLote: 9,
    contaCorrente: '1.1.1.04.002',
    historico: 'Ajuste de diferença contábil',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 10001,
    idLote: 10,
    contaCorrente: '2.1.2.01.005',
    historico: 'Crédito de reclassificação',
    situacaoDocumentoCsc: 'Em processamento',
  },
  {
    idLancamento: 11001,
    idLote: 11,
    contaCorrente: '1.1.3.02.001',
    historico: 'Débito de ajuste operacional',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 12001,
    idLote: 12,
    contaCorrente: '1.1.1.03.012',
    historico: 'Crédito de acerto financeiro',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 13001,
    idLote: 13,
    contaCorrente: '2.1.3.01.003',
    historico: 'Ajuste de conciliação bancária',
    situacaoDocumentoCsc: 'Processado',
  },
  {
    idLancamento: 14001,
    idLote: 14,
    contaCorrente: '1.1.1.05.004',
    historico: 'Débito de correção de saldo',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 15001,
    idLote: 15,
    contaCorrente: '2.1.2.03.009',
    historico: 'Crédito de ajuste de competência',
    situacaoDocumentoCsc: 'Em processamento',
  },
  {
    idLancamento: 16001,
    idLote: 16,
    contaCorrente: '1.1.4.01.006',
    historico: 'Débito de fechamento contábil',
    situacaoDocumentoCsc: 'Processado',
  },
  {
    idLancamento: 17001,
    idLote: 17,
    contaCorrente: '1.1.2.04.011',
    historico: 'Crédito de regularização de conta',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 18001,
    idLote: 18,
    contaCorrente: '2.1.1.04.007',
    historico: 'Ajuste de lançamento financeiro',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 19001,
    idLote: 19,
    contaCorrente: '1.1.3.03.010',
    historico: 'Débito de reclassificação contábil',
    situacaoDocumentoCsc: 'Em processamento',
  },
  {
    idLancamento: 20001,
    idLote: 20,
    contaCorrente: '2.1.4.01.002',
    historico: 'Crédito de correção operacional',
    situacaoDocumentoCsc: 'Pendente',
  },
  {
    idLancamento: 21001,
    idLote: 21,
    contaCorrente: '1.1.1.06.003',
    historico: 'Ajuste de saldo pendente',
    situacaoDocumentoCsc: 'Pendente',
  },
];

function getValorLote(idLote: number): number {
  const lote = LOTES_MOCK.find((item) => item.idLote === idLote);

  if (!lote) {
    throw new Error(`Lote ${idLote} não encontrado para o lançamento mock.`);
  }

  return lote.valor;
}

export const LANCAMENTOS_MOCK: readonly LancamentoLote[] = LANCAMENTOS_RESUMO_MOCK.map(
  (lancamento) => ({
    ...lancamento,
    titularConta:
      lancamento.idLancamento === 3001
        ? 'Cooperativa Central'
        : `Titular da conta ${lancamento.contaCorrente}`,
    valor: getValorLote(lancamento.idLote),
    estorno: false,
    documento: `DOC-${lancamento.idLancamento}`,
    descricao: lancamento.historico,
    situacao: lancamento.situacaoDocumentoCsc,
    pa: 'Cooperativa',
    tipoDocumentoCsc: 'Documento interno',
    idEvento: 102,
    codigoEvento: 300,
    descricaoEvento: 'Centralização Título CSC Crédito',
    complementoHistorico: lancamento.historico,
    idDocumentoCsc: '',
    anexos: [],
  }),
);
