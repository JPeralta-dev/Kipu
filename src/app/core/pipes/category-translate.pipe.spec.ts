import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CategoryTranslatePipe } from './category-translate.pipe';
import { TranslationService } from '../services/translation.service';

@Component({
  standalone: true,
  imports: [CategoryTranslatePipe],
  template: `<span>{{ category | categoryTranslate }}</span>`,
})
class TestHostComponent {
  category = 'Food';
}

describe('CategoryTranslatePipe', () => {
  let pipe: CategoryTranslatePipe;
  let translationService: TranslationService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('flowr_translations', JSON.stringify({}));
    localStorage.setItem('flowr_language', 'es');

    TestBed.configureTestingModule({
      providers: [TranslationService, CategoryTranslatePipe],
    });
    translationService = TestBed.inject(TranslationService);
    pipe = TestBed.inject(CategoryTranslatePipe);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should translate a known category to the current language', () => {
    expect(pipe.transform('Food')).toBe('Comida');
  });

  it('should translate Transport to Spanish', () => {
    expect(pipe.transform('Transport')).toBe('Transporte');
  });

  it('should return the original name for unknown categories', () => {
    expect(pipe.transform('UnknownCategory')).toBe('UnknownCategory');
  });

  it('should return empty string for null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('should re-render when language changes via effect + markForCheck', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TestHostComponent, CategoryTranslatePipe],
      providers: [TranslationService],
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    // Initial translation in Spanish
    expect(fixture.nativeElement.querySelector('span').textContent).toBe('Comida');

    // Change language signal
    const svc = TestBed.inject(TranslationService);
    (svc as any)._currentLang.set('en');

    tick();
    fixture.detectChanges();

    // After language change, pipe should re-evaluate
    expect(fixture.nativeElement.querySelector('span').textContent).toBe('Food');
  }));
});
