# Módulo Contábil — Outros Créditos e Débitos

Base de uma SPA criada com Angular 22, usando componentes standalone. A aplicação está
intencionalmente em branco nesta primeira etapa e pronta para receber as funcionalidades do
módulo.

## Requisitos

- Node.js 24.19 (definido em `.nvmrc`) ou outra versão aceita pelo Angular 22;
- npm 8 ou superior.

## Comandos

```bash
npm install       # instala as dependências
npm start         # inicia em http://localhost:4200
npm run build     # gera o build de produção
npm test          # executa Jasmine/Karma em modo interativo
npm run test:ci   # executa os testes uma vez, em Chrome Headless
```

## Estrutura inicial

- `src/app`: shell standalone, configuração e rotas da aplicação;
- `src/styles/_tokens.scss`: cores, tipografia, espaçamentos, forma e tokens de layout;
- `src/styles/_reset.scss`: normalização global mínima;
- `src/styles/_base.scss`: estilos globais e fundação responsiva;
- `src/app/app.spec.ts`: teste unitário inicial do shell e do ponto de roteamento.

O TypeScript e os templates estão em modo estrito. A separação futura por funcionalidades deve
manter componentes focados em apresentação e regras de acesso a dados em serviços dedicados.
