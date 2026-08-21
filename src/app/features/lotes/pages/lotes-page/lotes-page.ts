import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LoteActionsComponent } from '../../components/lote-actions/lote-actions';
import { LoteFiltersComponent } from '../../components/lote-filters/lote-filters';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoteActionsComponent, LoteFiltersComponent],
  selector: 'app-lotes-page',
  styleUrl: './lotes-page.scss',
  templateUrl: './lotes-page.html',
})
export class LotesPage {}
