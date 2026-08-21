import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  selector: 'app-lote-actions',
  styleUrl: './lote-actions.scss',
  templateUrl: './lote-actions.html',
})
export class LoteActionsComponent {}
