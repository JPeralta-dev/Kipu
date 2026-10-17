// src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors, HttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideIcons } from "@ng-icons/core";

import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { ICONS } from "./shared/icons/icon-registry";
import { TranslationService } from "./core/services/translation.service";
import { initializeTranslations } from "./core/i18n/translation.initializer";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideIcons(ICONS),

    // Preload translations before app bootstrap — no raw keys on first render
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      deps: [TranslationService],
      multi: true,
    },
  ],
};
