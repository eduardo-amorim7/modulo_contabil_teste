import { TestBed } from '@angular/core/testing';

import { providePtBrDateAdapter } from '../../../../shared/date/pt-br-date-adapter';
import { LoteFilters } from '../../models/lote-filters.model';
import { LoteFiltersComponent } from './lote-filters';

describe('LoteFiltersComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoteFiltersComponent],
      providers: [...providePtBrDateAdapter()],
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
    const selectArrow = (fixture.nativeElement as HTMLElement).querySelector(
      '.select-field__arrow',
    );
    const responsibleInstitutionInput = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>('#instituicaoResponsavel');

    expect(fixture.componentInstance.form.controls.instituicaoResponsavel.disabled).toBeTrue();
    expect(responsibleInstitutionInput?.disabled).toBeTrue();
    expect(selectArrow).not.toBeNull();
    expect(selectArrow?.textContent?.trim()).toBe('');
  });

  it('should reject an inverted lot id range', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);

    fixture.componentInstance.form.patchValue({ idLoteDe: 20, idLoteAte: 10 });

    expect(fixture.componentInstance.form.hasError('invalidIdRange')).toBeTrue();
  });

  it('should reject negative and fractional lot ids', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    const control = fixture.componentInstance.form.controls.idLoteDe;

    control.setValue(-1);
    expect(control.hasError('nonNegativeSafeInteger')).toBeTrue();

    control.setValue(1.5);
    expect(control.hasError('nonNegativeSafeInteger')).toBeTrue();
  });

  it('should parse and format lot values as Brazilian currency', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.detectChanges();
    const valueFromInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#valorLoteDe',
    );

    if (!valueFromInput) {
      fail('Campo Valor Lote De não encontrado');
      return;
    }

    valueFromInput.value = 'R$ 1.250,50';
    valueFromInput.dispatchEvent(new Event('input'));
    valueFromInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.valorLoteDe.value).toBe(1250.5);
    expect(valueFromInput.value.replace(/\s/g, ' ')).toBe('R$ 1.250,50');
  });

  it('should reject an inverted monetary value range', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);

    fixture.componentInstance.form.patchValue({
      valorLoteDe: 2000,
      valorLoteAte: 1000,
    });

    expect(fixture.componentInstance.form.hasError('invalidValueRange')).toBeTrue();
  });

  it('should reject negative and malformed monetary values', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const valueFromInput = compiled.querySelector<HTMLInputElement>('#valorLoteDe');

    if (!valueFromInput) {
      fail('Campo Valor Lote De não encontrado');
      return;
    }

    valueFromInput.value = '-100,00';
    valueFromInput.dispatchEvent(new Event('input'));
    valueFromInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.valorLoteDe.value).toBeNull();
    expect(
      fixture.componentInstance.form.controls.valorLoteDe.hasError('invalidCurrencyFormat'),
    ).toBeTrue();
    expect(compiled.querySelector('.range-error')?.textContent).toContain(
      'Informe valores monetários válidos e não negativos.',
    );

    valueFromInput.value = 'abc123';
    valueFromInput.dispatchEvent(new Event('input'));

    expect(
      fixture.componentInstance.form.controls.valorLoteDe.hasError('invalidCurrencyFormat'),
    ).toBeTrue();
  });

  it('should validate the institution content and maximum length', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    const control = fixture.componentInstance.form.controls.instituicao;

    control.setValue('   ');
    expect(control.hasError('required')).toBeTrue();

    control.setValue('A'.repeat(101));
    expect(control.hasError('maxlength')).toBeTrue();
  });

  it('should reject an inverted entry-date range', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);

    fixture.componentInstance.form.patchValue({
      dataEntradaDe: new Date(2026, 4, 20),
      dataEntradaAte: new Date(2026, 4, 10),
    });

    expect(fixture.componentInstance.form.hasError('invalidDateRange')).toBeTrue();
  });

  it('should parse manually typed Brazilian dates and accept an ordered range', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dateFromInput = compiled.querySelector<HTMLInputElement>('#dataEntradaDe');
    const dateToInput = compiled.querySelector<HTMLInputElement>('#dataEntradaAte');

    if (!dateFromInput || !dateToInput) {
      fail('Campos de Data de Entrada não encontrados');
      return;
    }

    dateFromInput.value = '21/05/2026';
    dateFromInput.dispatchEvent(new Event('input'));
    dateToInput.value = '21/08/2026';
    dateToInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const dateFrom = fixture.componentInstance.form.controls.dataEntradaDe.value;
    const dateTo = fixture.componentInstance.form.controls.dataEntradaAte.value;

    expect(dateFrom?.getFullYear()).toBe(2026);
    expect(dateFrom?.getMonth()).toBe(4);
    expect(dateFrom?.getDate()).toBe(21);
    expect(dateTo?.getFullYear()).toBe(2026);
    expect(dateTo?.getMonth()).toBe(7);
    expect(dateTo?.getDate()).toBe(21);
    expect(fixture.componentInstance.form.hasError('invalidDateRange')).toBeFalse();
    expect(fixture.componentInstance.form.valid).toBeTrue();
  });

  it('should show the date-format error for an invalid manually typed date', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dateFromInput = compiled.querySelector<HTMLInputElement>('#dataEntradaDe');

    if (!dateFromInput) {
      fail('Campo Data de Entrada De não encontrado');
      return;
    }

    dateFromInput.value = '31/02/2026';
    dateFromInput.dispatchEvent(new Event('input'));
    dateFromInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    const errorMessage = compiled.querySelector('.range-error')?.textContent ?? '';

    expect(fixture.componentInstance.form.controls.dataEntradaDe.hasError('matDatepickerParse')).toBeTrue();
    expect(errorMessage).toContain('Informe uma data válida no formato dd/mm/aaaa.');
    expect(errorMessage).not.toContain('data inicial não pode ser maior');
  });

  it('should keep the form mounted and hide it accessibly when collapsed', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const collapseButton = compiled.querySelector<HTMLButtonElement>('.collapse-button');

    collapseButton?.click();
    fixture.detectChanges();

    const content = compiled.querySelector('.filters-card__content');

    expect(fixture.componentInstance.expanded()).toBeFalse();
    expect(collapseButton?.getAttribute('aria-expanded')).toBe('false');
    expect(content?.classList).toContain('smooth-collapse--collapsed');
    expect(content?.getAttribute('aria-hidden')).toBe('true');
    expect(content?.hasAttribute('inert')).toBeTrue();
    expect(compiled.querySelector('.filters-form')).not.toBeNull();
  });

  it('should emit valid filters when submitted', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    const submitted = jasmine.createSpy<(filters: LoteFilters) => void>('submitted');
    fixture.componentInstance.filtersSubmitted.subscribe(submitted);
    fixture.componentInstance.form.controls.instituicao.setValue('  0002 - SICOOB CENTRAL  ');

    fixture.componentInstance.submit();

    expect(submitted).toHaveBeenCalledOnceWith(jasmine.objectContaining({ situacao: 'TODAS' }));
    const submittedFilters = submitted.calls.mostRecent().args[0];

    expect(submittedFilters.instituicao).toBe('0002 - SICOOB CENTRAL');
    expect('instituicaoResponsavel' in submittedFilters).toBeFalse();
  });

  it('should disable the search button and show a spinner while loading', () => {
    const fixture = TestBed.createComponent(LoteFiltersComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.search-button',
    );

    expect(button?.disabled).toBeTrue();
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.textContent).toContain('Pesquisando');
    expect(button?.querySelector('.search-button__spinner')).not.toBeNull();
  });
});
