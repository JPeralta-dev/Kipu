import { TranslationService } from '../services/translation.service';

/**
 * APP_INITIALIZER factory that loads translations before app bootstrap.
 * Ensures no raw keys are visible on first render and the correct
 * language is loaded before any component mounts.
 */
export function initializeTranslations(translationService: TranslationService) {
  return async () => {
    try {
      await translationService.init();
    } catch (error) {
      console.error('Failed to preload translations', error);
    }
  };
}

