import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { providePtBrDateAdapter } from '../../../../shared/date/pt-br-date-adapter';
import { INITIAL_LOTE_FILTERS } from '../../models/lote-filters.model';
import { LOTES_MOCK } from '../../data/lotes.mock';
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
  const service = jasmine.createSpyObj<LotesService>('LotesService', [
    'search',
    'findById',
    'approve',
    'send',
    'delete',
  ]);

  beforeEach(async () => {
    service.search.calls.reset();
    service.findById.calls.reset();
    service.approve.calls.reset();
    service.send.calls.reset();
    service.delete.calls.reset();
    service.search.and.returnValue(of(EMPTY_RESULT));
    service.findById.and.callFake(
      (idLote) => LOTES_MOCK.find((lote) => lote.idLote === idLote) ?? null,
    );
    service.approve.and.returnValue({ updatedCount: 0, invalidIds: [] });
    service.send.and.returnValue({ updatedCount: 0, invalidIds: [] });
    service.delete.and.returnValue(0);

    await TestBed.configureTestingModule({
      imports: [LotesPage],
      providers: [
        ...providePtBrDateAdapter(),
        provideRouter([]),
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

  it('should navigate to the selected lot in the requested mode', () => {
    const fixture = TestBed.createComponent(LotesPage);
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.componentInstance.updateSelection(new Set([8]));

    fixture.componentInstance.openSelectedLote('alterar');

    expect(navigate).toHaveBeenCalledOnceWith(['/lotes', 8, 'alterar']);
  });

  it('should navigate to the new lot form from the include action', () => {
    const fixture = TestBed.createComponent(LotesPage);
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.createLote();

    expect(navigate).toHaveBeenCalledOnceWith(['/lotes/incluir']);
  });

  it('should approve multiple selected lots and dismiss the success feedback after 3.5 seconds', async () => {
    const fixture = TestBed.createComponent(LotesPage);
    service.approve.and.returnValue({ updatedCount: 2, invalidIds: [] });
    const component = fixture.componentInstance;
    component.updateSelection(new Set([3, 6]));

    component.approveSelected();

    expect(service.approve).toHaveBeenCalledOnceWith(new Set([3, 6]), 'usuario.logado');
    expect(component.selectedIds().size).toBe(0);
    expect(component.actionFeedback()?.message).toBe('2 lotes confirmados com sucesso.');
    expect(component.actionFeedback()?.tone).toBe('success');

    await wait(3_250);
    expect(component.actionFeedbackLeaving()).toBeTrue();
    expect(component.actionFeedback()).not.toBeNull();

    await wait(300);
    expect(component.actionFeedback()).toBeNull();
    expect(component.actionFeedbackLeaving()).toBeFalse();
  });

  it('should show a clear error and preserve selection for lots already confirmed', () => {
    jasmine.clock().install();
    const fixture = TestBed.createComponent(LotesPage);

    try {
      service.approve.and.returnValue({ updatedCount: 0, invalidIds: [5, 8] });
      const component = fixture.componentInstance;
      component.updateSelection(new Set([3, 5, 8]));

      component.approveSelected();

      expect(component.actionFeedback()).toEqual({
        message: 'Não foi possível confirmar: os lotes 5 e 8 já estão confirmados.',
        tone: 'error',
      });
      expect(component.selectedIds()).toEqual(new Set([3, 5, 8]));

      jasmine.clock().tick(3_700);
      expect(component.actionFeedbackLeaving()).toBeTrue();
      jasmine.clock().tick(300);
      expect(component.actionFeedback()).toBeNull();
    } finally {
      fixture.destroy();
      jasmine.clock().uninstall();
    }
  });

  it('should show a clear error when a lot is already sent', () => {
    jasmine.clock().install();
    const fixture = TestBed.createComponent(LotesPage);

    try {
      service.send.and.returnValue({ updatedCount: 0, invalidIds: [4] });
      const component = fixture.componentInstance;
      component.updateSelection(new Set([4]));

      component.sendSelected();

      expect(component.actionFeedback()).toEqual({
        message: 'Não foi possível enviar: o lote 4 já está enviado.',
        tone: 'error',
      });

      jasmine.clock().tick(4_000);
      expect(component.actionFeedback()).toBeNull();
    } finally {
      fixture.destroy();
      jasmine.clock().uninstall();
    }
  });

  it('should open the justification dialog with every selected lot', () => {
    const fixture = TestBed.createComponent(LotesPage);
    const component = fixture.componentInstance;
    component.updateSelection(new Set([3, 6]));

    component.openJustificationDialog();

    expect(component.activeDialog()).toBe('justificativa');
    expect(component.dialogLotes().map((lote) => lote.idLote)).toEqual([3, 6]);
  });

  it('should require confirmation before deleting multiple selected lots', () => {
    service.delete.and.returnValue(2);
    const fixture = TestBed.createComponent(LotesPage);
    const component = fixture.componentInstance;
    component.updateSelection(new Set([3, 6]));

    component.requestDeletion();
    expect(service.delete).not.toHaveBeenCalled();
    expect(component.activeDialog()).toBe('exclusao');

    component.confirmDeletion();

    expect(service.delete).toHaveBeenCalledOnceWith(new Set([3, 6]));
    expect(component.activeDialog()).toBeNull();
    expect(component.selectedIds().size).toBe(0);
  });
});
