import { PtBrDatePipe } from './pt-br-date.pipe';

describe('PtBrDatePipe', () => {
  const pipe = new PtBrDatePipe();

  it('should format Brazilian dates and preserve the time precision', () => {
    expect(pipe.transform('28/04/2026')).toBe('28/04/2026');
    expect(pipe.transform('28/04/2026 09:14', 'dateTime')).toBe('28/04/2026 09:14');
    expect(pipe.transform('28/04/2026 09:14:22', 'dateTime')).toBe('28/04/2026 09:14:22');
  });

  it('should format Date instances without mixing parsed value shapes', () => {
    const value = new Date(2026, 3, 28, 9, 14, 22);

    expect(pipe.transform(value)).toBe('28/04/2026');
    expect(pipe.transform(value, 'dateTime')).toBe('28/04/2026 09:14:22');
  });

  it('should keep unsupported legacy values unchanged', () => {
    expect(pipe.transform('data não informada')).toBe('data não informada');
    expect(pipe.transform('31/02/2026')).toBe('31/02/2026');
    expect(pipe.transform('')).toBe('');
  });
});
