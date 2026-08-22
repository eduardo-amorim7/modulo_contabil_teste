import { formatDate, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { Pipe, PipeTransform } from '@angular/core';

export type PtBrDateFormat = 'date' | 'dateTime';

registerLocaleData(localePt);

@Pipe({
  name: 'ptBrDate',
  standalone: true,
})
export class PtBrDatePipe implements PipeTransform {
  transform(value: Date | string | null | undefined, format: PtBrDateFormat = 'date'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const parsed =
      value instanceof Date
        ? { date: value, hasSeconds: format === 'dateTime' }
        : this.parse(value);

    if (!parsed || Number.isNaN(parsed.date.getTime())) {
      return typeof value === 'string' ? value : '';
    }

    const pattern =
      format === 'dateTime'
        ? parsed.hasSeconds
          ? 'dd/MM/yyyy HH:mm:ss'
          : 'dd/MM/yyyy HH:mm'
        : 'dd/MM/yyyy';

    return formatDate(parsed.date, pattern, 'pt-BR');
  }

  private parse(value: string): { readonly date: Date; readonly hasSeconds: boolean } | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      value.trim(),
    );

    if (!match) {
      return null;
    }

    const [, dayText, monthText, yearText, hourText, minuteText, secondText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText ?? 0);
    const minute = Number(minuteText ?? 0);
    const second = Number(secondText ?? 0);
    const date = new Date(0);

    date.setFullYear(year, month - 1, day);
    date.setHours(hour, minute, second, 0);

    const isExact =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      date.getHours() === hour &&
      date.getMinutes() === minute &&
      date.getSeconds() === second;

    return isExact ? { date, hasSeconds: secondText !== undefined } : null;
  }
}
