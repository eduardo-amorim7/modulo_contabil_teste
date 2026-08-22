import { Injectable, Provider } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MAT_NATIVE_DATE_FORMATS,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';

@Injectable()
export class PtBrDatepickerIntl extends MatDatepickerIntl {
  override calendarLabel = 'Calendário';
  override openCalendarLabel = 'Abrir calendário';
  override closeCalendarLabel = 'Fechar calendário';
  override prevMonthLabel = 'Mês anterior';
  override nextMonthLabel = 'Próximo mês';
  override prevYearLabel = 'Ano anterior';
  override nextYearLabel = 'Próximo ano';
  override prevMultiYearLabel = '24 anos anteriores';
  override nextMultiYearLabel = 'Próximos 24 anos';
  override switchToMonthViewLabel = 'Escolher data';
  override switchToMultiYearViewLabel = 'Escolher mês e ano';
  override startDateLabel = 'Data inicial';
  override endDateLabel = 'Data final';
  override comparisonDateLabel = 'Intervalo de comparação';

  override formatYearRangeLabel(start: string, end: string): string {
    return `${start} a ${end}`;
  }
}

@Injectable()
export class PtBrDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value !== 'string') {
      return super.parse(value);
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return null;
    }

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalizedValue);

    if (!match) {
      return this.invalid();
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsedDate = new Date(0);

    parsedDate.setFullYear(year, month - 1, day);
    parsedDate.setHours(0, 0, 0, 0);

    const isExactDate =
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day;

    return isExactDate ? parsedDate : this.invalid();
  }
}

export function providePtBrDateAdapter(): Provider[] {
  return [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: DateAdapter, useClass: PtBrDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
    { provide: MatDatepickerIntl, useClass: PtBrDatepickerIntl },
  ];
}
