# Módulo Contábil — Outros Créditos e Débitos

SPA para consulta e gestão de lotes de outros créditos e débitos. A versão atual entrega o shell
da aplicação, filtros de consulta, tabela paginada, seleção de lotes e os estados de carregamento,
resultado vazio e erro. Os dados ainda são fornecidos por um serviço mock local; não há integração
com backend nesta etapa.

## Stack e versões

- Angular 22.1.3;
- Angular CLI 22.1.5;
- Angular Material e CDK 22.1.3;
- RxJS 7.8.2;
- TypeScript 6.0.3;
- Node.js 24.19.0, versão de referência definida em `.nvmrc`;
- npm 10.7.0, versão de referência definida em `package.json`.

O intervalo de versões do Node.js aceito pelo projeto está declarado em `package.json`:
`^22.22.3 || ^24.15.0 || >=26.0.0`.

## Instalação

Se você utiliza um gerenciador de versões do Node.js compatível com `.nvmrc`, selecione a versão
recomendada:

```bash
nvm use
```

Em seguida, na raiz do projeto, instale as dependências:

```bash
npm install
```

## Execução local

Inicie o servidor de desenvolvimento:

```bash
ng serve
```

A aplicação ficará disponível em `http://localhost:4200/`. O servidor recompila e atualiza a
página quando os arquivos-fonte são alterados.

O Angular CLI também está instalado como dependência do projeto. Caso o comando `ng` não esteja
disponível globalmente, use uma destas alternativas equivalentes:

```bash
npx ng serve
# ou
npm start
```

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm start` | Inicia o servidor de desenvolvimento. |
| `npm run build` | Gera o build de produção em `dist/`. |
| `npm run watch` | Mantém o build de desenvolvimento em modo de observação. |
| `npm test` | Executa os testes Jasmine/Karma em modo interativo. |
| `npm run test:ci` | Executa os testes uma vez no Chrome Headless. |

## Decisões técnicas adotadas

- **Arquitetura standalone:** componentes e configuração usam as APIs standalone do Angular, sem
  `NgModule`. O shell concentra a estrutura global e a página de lotes é carregada sob demanda
  pela rota principal.
- **Organização por funcionalidade:** a implementação de lotes está separada em página,
  componentes de apresentação, modelos, dados mock e serviço. Recursos reutilizáveis, como
  validadores, formatação monetária e adaptação de datas, ficam em `shared`.
- **Detecção de mudanças e estado:** os componentes usam `ChangeDetectionStrategy.OnPush`, Signals
  e as APIs funcionais `input()` e `output()`. A página atua como componente coordenador do estado
  da consulta e da seleção.
- **Formulários reativos e validação:** os filtros usam Reactive Forms tipados, validações de
  campos obrigatórios, limites numéricos e consistência dos intervalos de lote, valor e data.
- **Experiência brasileira:** valores monetários são tratados em BRL por um `ControlValueAccessor`
  próprio, e datas digitadas seguem estritamente `dd/MM/yyyy` com locale `pt-BR`.
- **Fluxo assíncrono com RxJS:** as pesquisas têm debounce de 350 ms, cancelamento da solicitação
  anterior com `switchMap` e encerramento automático das inscrições com `takeUntilDestroyed`.
- **Camada de dados substituível:** `LotesService` encapsula filtragem, latência simulada, paginação
  e erros sobre uma massa local. Isso mantém os componentes desacoplados da futura API. Para
  exercitar o estado de erro, pesquise uma instituição cujo texto contenha `ERRO`.
- **Estados explícitos de interface:** carregamento inicial, busca em andamento, resultado vazio,
  falha com nova tentativa, paginação e seleção individual/em massa são tratados separadamente.
- **Angular Material com importação seletiva:** apenas os módulos usados por cada componente são
  importados, reduzindo acoplamento e favorecendo tree shaking.
- **Estilos com tokens:** cores, tipografia, espaçamentos, dimensões e breakpoints são centralizados
  em variáveis SCSS/CSS, com layout responsivo e estilos encapsulados por componente.
- **Qualidade e segurança de tipos:** TypeScript, injeção e templates estão em modo estrito. Os
  testes unitários usam Jasmine/Karma, incluindo execução headless para integração contínua.

## Estrutura principal

```text
src/app/
├── features/lotes/       # página, componentes, modelos, mock e serviço de lotes
├── layout/app-shell/     # navegação e estrutura global
├── shared/               # datas, diretivas e validadores reutilizáveis
├── app.config.ts         # providers globais
└── app.routes.ts         # rotas e carregamento sob demanda

src/styles/
├── _tokens.scss          # tokens visuais e breakpoint
├── _reset.scss           # normalização global
└── _base.scss            # estilos-base e fundação responsiva
```
