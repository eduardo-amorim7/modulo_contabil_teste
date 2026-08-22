import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Lote } from '../../models/lote.model';
import { PtBrDatePipe } from '../../../../shared/pipes/pt-br-date.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    PtBrDatePipe,
  ],
  selector: 'app-lote-results',
  styleUrl: './lote-results.scss',
  templateUrl: './lote-results.html',
})
export class LoteResultsComponent {
  readonly items = input<readonly Lote[]>([]);
  readonly loading = input(false);
  readonly searching = input(false);
  readonly error = input<string | null>(null);
  readonly pageIndex = input(0);
  readonly totalItems = input(0);
  readonly totalPages = input(1);
  readonly selectedIds = input<ReadonlySet<number>>(new Set<number>());

  readonly pageChanged = output<number>();
  readonly retryRequested = output<void>();
  readonly selectionChanged = output<ReadonlySet<number>>();

  isSelected(idLote: number): boolean {
    return this.selectedIds().has(idLote);
  }

  allVisibleSelected(): boolean {
    const visibleItems = this.items();
    return visibleItems.length > 0 && visibleItems.every((lote) => this.isSelected(lote.idLote));
  }

  someVisibleSelected(): boolean {
    return !this.allVisibleSelected() && this.items().some((lote) => this.isSelected(lote.idLote));
  }

  handleLoteSelectionChange(idLote: number, event: Event): void {
    const checked = this.getCheckboxState(event);

    if (checked !== null) {
      this.toggleLote(idLote, checked);
    }
  }

  handleAllVisibleSelectionChange(event: Event): void {
    const checked = this.getCheckboxState(event);

    if (checked !== null) {
      this.toggleAllVisible(checked);
    }
  }

  toggleLote(idLote: number, checked: boolean): void {
    const selection = new Set(this.selectedIds());

    if (checked) {
      selection.add(idLote);
    } else {
      selection.delete(idLote);
    }

    this.selectionChanged.emit(selection);
  }

  toggleAllVisible(checked: boolean): void {
    const selection = new Set(this.selectedIds());

    for (const lote of this.items()) {
      if (checked) {
        selection.add(lote.idLote);
      } else {
        selection.delete(lote.idLote);
      }
    }

    this.selectionChanged.emit(selection);
  }

  goToPage(pageIndex: number): void {
    if (
      this.loading() ||
      pageIndex < 0 ||
      pageIndex >= this.totalPages() ||
      pageIndex === this.pageIndex()
    ) {
      return;
    }

    this.pageChanged.emit(pageIndex);
  }

  private getCheckboxState(event: Event): boolean | null {
    return event.target instanceof HTMLInputElement ? event.target.checked : null;
  }
}
