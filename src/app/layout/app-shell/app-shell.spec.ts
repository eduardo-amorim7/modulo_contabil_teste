import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppShell } from './app-shell';

describe('AppShell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the navigation shell and an empty main content surface', () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const sidebarIcon = compiled.querySelector('.sidebar-entry__icon');

    expect(compiled.querySelector('.sidebar')).not.toBeNull();
    expect(sidebarIcon).not.toBeNull();
    expect(sidebarIcon?.textContent?.trim()).toBe('');
    expect(compiled.querySelector('.topbar')).not.toBeNull();
    expect(compiled.querySelector('.breadcrumb')?.textContent).toContain('Outros Créditos/Débitos');
    expect(compiled.querySelector('.content-surface')).not.toBeNull();
  });
});
