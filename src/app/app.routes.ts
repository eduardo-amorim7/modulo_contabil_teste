import { Routes } from '@angular/router';

import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/lotes/pages/lotes-page/lotes-page').then(
            ({ LotesPage }) => LotesPage,
          ),
      },
    ],
  },
];
