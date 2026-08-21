import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';

import { LoteFiltersComponent } from './lote-filters';

describe('LoteFiltersComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoteFiltersComponent],
      providers: [provideNativeDateAdapter()],
    }).compileComponents();
  });

  it('should start with the reference institutions and all situations', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.getRawValue()).toEqual(
      jasmine.objectContaining({
        instituicaoResponsavel: '0001 - SICOOB',
        instituicao: '0002 - SICOOB CENTRAL',
        situacao: 'TODAS',
      }),
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.select-field__arrow')?.textContent?.trim(),
    ).toBe('keyboard_arrow_down');
  });

  it('should reject an inverted lot id range', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);

    fixture.componentInstance.form.patchValue({ idLoteDe: 20, idLoteAte: 10 });

    expect(fixture.componentInstance.form.hasError('invalidIdRange')).toBeTrue();
  });

  it('should emit valid filters when submitted', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    const submitted = jasmine.createSpy('submitted');
    fixture.componentInstance.filtersSubmitted.subscribe(submitted);

    fixture.componentInstance.submit();

    expect(submitted).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ situacao: 'TODAS' }),
    );
  });
});
