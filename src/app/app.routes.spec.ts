import { routes } from './app.routes';

describe('application routes', () => {
  it('should redirect unknown URLs to the lot consultation', () => {
    const shellRoute = routes.find((route) => route.path === '');
    const fallbackRoute = shellRoute?.children?.find((route) => route.path === '**');

    expect(fallbackRoute).toEqual(
      jasmine.objectContaining({
        path: '**',
        redirectTo: '',
      }),
    );
  });
});
