import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePtBrDateAdapter } from './shared/date/pt-br-date-adapter';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    ...providePtBrDateAdapter(),
    provideRouter(routes),
  ],
};
