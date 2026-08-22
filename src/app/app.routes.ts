import { Routes } from '@angular/router';

import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'lotes/incluir',
        data: { mode: 'incluir' },
        loadComponent: () =>
          import('./features/lotes/pages/lote-detail-page/lote-detail-page').then(
            ({ LoteDetailPage }) => LoteDetailPage,
          ),
      },
      {
        path: 'lotes/:idLote/alterar',
        data: { mode: 'alterar' },
        loadComponent: () =>
          import('./features/lotes/pages/lote-detail-page/lote-detail-page').then(
            ({ LoteDetailPage }) => LoteDetailPage,
          ),
      },
      {
        path: 'lotes/:idLote/visualizar',
        data: { mode: 'visualizar' },
        loadComponent: () =>
          import('./features/lotes/pages/lote-detail-page/lote-detail-page').then(
            ({ LoteDetailPage }) => LoteDetailPage,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/lotes/pages/lotes-page/lotes-page').then(({ LotesPage }) => LotesPage),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
