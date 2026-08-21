import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { rangeOrderValidator } from '../../../../shared/validators/range-order.validator';
import {
  LOTE_SITUACOES,
  LoteFilters,
  LoteSituacaoFiltro,
} from '../../models/lote-filters.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  selector: 'app-lote-filters',
  styleUrl: './lote-filters.scss',
  templateUrl: './lote-filters.html',
})
export class LoteFiltersComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly filtersSubmitted = output<LoteFilters>();
  readonly expanded = signal(true);
  readonly situacoes = LOTE_SITUACOES;

  readonly form = this.formBuilder.group(
    {
      instituicaoResponsavel: this.formBuilder.nonNullable.control('0001 - SICOOB'),
      instituicao: this.formBuilder.nonNullable.control('0002 - SICOOB CENTRAL'),
      situacao: this.formBuilder.nonNullable.control<LoteSituacaoFiltro>('TODAS'),
      idLoteDe: this.formBuilder.control<number | null>(null),
      idLoteAte: this.formBuilder.control<number | null>(null),
      valorLoteDe: this.formBuilder.control<number | null>(null),
      valorLoteAte: this.formBuilder.control<number | null>(null),
      dataEntradaDe: this.formBuilder.control<Date | null>(null),
      dataEntradaAte: this.formBuilder.control<Date | null>(null),
    },
    {
      validators: [
        rangeOrderValidator('idLoteDe', 'idLoteAte', 'invalidIdRange'),
        rangeOrderValidator('valorLoteDe', 'valorLoteAte', 'invalidValueRange'),
        rangeOrderValidator('dataEntradaDe', 'dataEntradaAte', 'invalidDateRange'),
      ],
    },
  );

  toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.filtersSubmitted.emit(this.form.getRawValue());
  }
}
