import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PtBrCurrencyDirective } from '../../../../shared/directives/pt-br-currency.directive';
import {
  MAX_SAFE_CURRENCY_VALUE,
  nonNegativeSafeIntegerValidator,
} from '../../../../shared/validators/input-value.validators';
import { rangeOrderValidator } from '../../../../shared/validators/range-order.validator';
import {
  INSTITUICAO_RESPONSAVEL,
  INITIAL_LOTE_FILTERS,
  LOTE_SITUACOES,
  LoteFilters,
  LoteSituacaoFiltro,
} from '../../models/lote-filters.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PtBrCurrencyDirective,
    ReactiveFormsModule,
  ],
  selector: 'app-lote-filters',
  styleUrl: './lote-filters.scss',
  templateUrl: './lote-filters.html',
})
export class LoteFiltersComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly filtersSubmitted = output<LoteFilters>();
  readonly loading = input(false);
  readonly expanded = signal(true);
  readonly situacoes = LOTE_SITUACOES;

  readonly form = this.formBuilder.group(
    {
      instituicaoResponsavel: this.formBuilder.nonNullable.control({
        value: INSTITUICAO_RESPONSAVEL,
        disabled: true,
      }),
      instituicao: this.formBuilder.nonNullable.control(
        INITIAL_LOTE_FILTERS.instituicao,
        Validators.maxLength(100),
      ),
      situacao: this.formBuilder.nonNullable.control<LoteSituacaoFiltro>(
        INITIAL_LOTE_FILTERS.situacao,
        Validators.required,
      ),
      idLoteDe: this.formBuilder.control<number | null>(null, nonNegativeSafeIntegerValidator),
      idLoteAte: this.formBuilder.control<number | null>(null, nonNegativeSafeIntegerValidator),
      valorLoteDe: this.formBuilder.control<number | null>(null, [
        Validators.min(0),
        Validators.max(MAX_SAFE_CURRENCY_VALUE),
      ]),
      valorLoteAte: this.formBuilder.control<number | null>(null, [
        Validators.min(0),
        Validators.max(MAX_SAFE_CURRENCY_VALUE),
      ]),
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
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    this.filtersSubmitted.emit({
      instituicao: formValue.instituicao.trim(),
      situacao: formValue.situacao,
      idLoteDe: formValue.idLoteDe,
      idLoteAte: formValue.idLoteAte,
      valorLoteDe: formValue.valorLoteDe,
      valorLoteAte: formValue.valorLoteAte,
      dataEntradaDe: formValue.dataEntradaDe,
      dataEntradaAte: formValue.dataEntradaAte,
    });
  }
}
