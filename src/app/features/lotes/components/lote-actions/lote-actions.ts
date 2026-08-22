import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  selector: 'app-lote-actions',
  styleUrl: './lote-actions.scss',
  templateUrl: './lote-actions.html',
})
export class LoteActionsComponent {
  readonly selectedCount = input(0);
  readonly approveRequested = output<void>();
  readonly sendRequested = output<void>();
  readonly justificationRequested = output<void>();
  readonly includeRequested = output<void>();
  readonly alterRequested = output<void>();
  readonly deleteRequested = output<void>();
  readonly viewRequested = output<void>();
}
