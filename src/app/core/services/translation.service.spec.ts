import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    TestBed.configureTestingModule({
      providers: [TranslationService],
    });
    service = TestBed.inject(TranslationService);
    expect(service).toBeTruthy();
  });

  describe('constructor — synchronous localStorage load', () => {
    it('should load translations from localStorage synchronously when cached', () => {
      // Arrange
      const cachedTranslations = { 'greeting': 'Hola', 'farewell': 'Adiós' };
      localStorage.setItem('flowr_translations', JSON.stringify(cachedTranslations));

      // Act
      TestBed.configureTestingModule({
        providers: [TranslationService],
      });
      service = TestBed.inject(TranslationService);

      // Assert — translations available immediately (synchronously)
      expect(service.isLoaded()).toBe(true);
      expect(service.translate('greeting')).toBe('Hola');
      expect(service.translate('farewell')).toBe('Adiós');
    });

    it('should mark as not loaded when no cached translations exist', () => {
      // Act
      TestBed.configureTestingModule({
        providers: [TranslationService],
      });
      service = TestBed.inject(TranslationService);

      // Assert — not loaded yet (will fetch async in background)
      expect(service.isLoaded()).toBe(false);
    });

    it('should return raw key when translations are not loaded yet', () => {
      // Act
      TestBed.configureTestingModule({
        providers: [TranslationService],
      });
      service = TestBed.inject(TranslationService);

      // Assert
      expect(service.translate('greeting')).toBe('greeting');
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      // Arrange
      localStorage.setItem('flowr_translations', 'not-valid-json');

      // Act
      TestBed.configureTestingModule({
        providers: [TranslationService],
      });
      service = TestBed.inject(TranslationService);

      // Assert — should not crash, should not be loaded
      expect(service.isLoaded()).toBe(false);
    });

    it('should safely handle localStorage throwing QuotaExceeded or SecurityError in Safari', () => {
      spyOn(localStorage, 'getItem').and.throwError(new Error('QuotaExceededError'));
      spyOn(localStorage, 'setItem').and.throwError(new Error('QuotaExceededError'));

      TestBed.configureTestingModule({
        providers: [TranslationService],
      });
      expect(() => {
        service = TestBed.inject(TranslationService);
      }).not.toThrow();
      expect(service.isLoaded()).toBe(false);
    });
  });
});
