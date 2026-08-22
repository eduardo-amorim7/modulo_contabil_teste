import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { providePtBrDateAdapter } from '../../../../shared/date/pt-br-date-adapter';
import { INITIAL_LOTE_FILTERS } from '../../models/lote-filters.model';
import { LoteSearchResult } from '../../models/lote.model';
import {
  LOTE_SEARCH_ERROR_MESSAGE,
  LoteSearchError,
  LotesService,
} from '../../services/lotes.service';
import { LotesPage } from './lotes-page';

const EMPTY_RESULT: LoteSearchResult = {
  items: [],
  pageIndex: 0,
  pageSize: 5,
  totalItems: 0,
  totalPages: 1,
};

describe('LotesPage', () => {
  const service = jasmine.createSpyObj<LotesService>('LotesService', ['search']);

  beforeEach(async () => {
    service.search.calls.reset();
    service.search.and.returnValue(of(EMPTY_RESULT));

    await TestBed.configureTestingModule({
      imports: [LotesPage],
      providers: [
        ...providePtBrDateAdapter(),
        { provide: LotesService, useValue: service },
      ],
    }).compileComponents();
  });

  const wait = (milliseconds: number) =>
    new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));

  it('should load the first page on initialization', async () => {
    const fixture = TestBed.createComponent(LotesPage);
    fixture.detectChanges();
    await wait(10);

    expect(service.search).toHaveBeenCalledOnceWith(INITIAL_LOTE_FILTERS, 0, 5);
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('should debounce rapid searches and use only the latest filters', async () => {
    const fixture = TestBed.createComponent(LotesPage);
    fixture.detectChanges();
    await wait(10);

    fixture.componentInstance.search({ ...INITIAL_LOTE_FILTERS, idLoteDe: 3 });
    await wait(100);
    fixture.componentInstance.search({ ...INITIAL_LOTE_FILTERS, idLoteDe: 8 });
    await wait(340);

    expect(service.search).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.componentInstance.searching()).toBeTrue();

    await wait(100);

    expect(service.search).toHaveBeenCalledTimes(2);
    expect(service.search.calls.mostRecent().args[0].idLoteDe).toBe(8);
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.componentInstance.searching()).toBeFalse();
  });

  it('should not activate the search-button spinner when changing pages', async () => {
    const fixture = TestBed.createComponent(LotesPage);
    fixture.detectChanges();
    await wait(10);

    fixture.componentInstance.changePage(1);

    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.componentInstance.searching()).toBeFalse();

    await wait(10);

    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('should expose only the controlled message for a known search error', async () => {
    service.search.and.returnValue(throwError(() => new LoteSearchError()));
    const fixture = TestBed.createComponent(LotesPage);
    fixture.detectChanges();
    await wait(10);

    expect(fixture.componentInstance.error()).toBe(LOTE_SEARCH_ERROR_MESSAGE);
  });

  it('should not expose details from an unexpected internal error', async () => {
    service.search.and.returnValue(
      throwError(() => new Error('SQLSTATE 42P01 em servidor-interno:5432')),
    );
    const fixture = TestBed.createComponent(LotesPage);
    fixture.detectChanges();
    await wait(10);

    expect(fixture.componentInstance.error()).toBe(
      'Ocorreu um erro inesperado durante a consulta. Tente novamente.',
    );
    expect(fixture.componentInstance.error()).not.toContain('SQLSTATE');
    expect(fixture.componentInstance.error()).not.toContain('servidor-interno');
  });
});
