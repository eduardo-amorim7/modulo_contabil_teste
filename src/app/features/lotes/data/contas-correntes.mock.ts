export interface ContaCorrenteMock {
  numero: string;
  titular: string;
}

export const CONTAS_CORRENTES_MOCK: readonly ContaCorrenteMock[] = [
  { numero: '44444', titular: 'Cooperativa Central' },
  { numero: '23789-0', titular: 'Maria Oliveira Santos' },
  { numero: '88312-4', titular: 'Comercial Vale Verde Ltda.' },
  { numero: '1.1.1.02.001', titular: 'Cooperativa Central' },
  { numero: '2.1.1.03.002', titular: 'Fundo Administrativo CSC' },
  { numero: '1.1.2.01.004', titular: 'Anderson Silva' },
];
