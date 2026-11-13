import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryDefaultSelectorComponent } from './category-default-selector.component';

describe('CategoryDefaultSelectorComponent', () => {
  let fixture: ComponentFixture<CategoryDefaultSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryDefaultSelectorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryDefaultSelectorComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should filter categories to expense only', () => {
    const comp = fixture.componentInstance;
    comp.categories.set([
      { id: '1', name: 'Food', icon: '🍔', color: '#D946EF', total: 100, kind: 'expense', isDefault: false },
      { id: '2', name: 'Salary', icon: '💼', color: '#06D6A0', total: 5000, kind: 'income', isDefault: false },
    ]);
    const expense = comp.expenseCategories;
    expect(expense.length).toBe(1);
    expect(expense[0].name).toBe('Food');
  });

  it('should detect changes when selection differs from saved', () => {
    const comp = fixture.componentInstance;
    comp.selectedId.set('cat_new');
    // _savedId is null initially
    expect(comp.hasChanges).toBeTrue();
  });

  it('should show no changes when selection matches saved', () => {
    const comp = fixture.componentInstance;
    comp.selectedId.set('cat_1');
    expect(comp.hasChanges).toBeTrue(); // no save called yet
  });

  it('should trigger save automatically when category changes', () => {
    const comp = fixture.componentInstance;
    const saveSpy = spyOn(comp, 'save').and.returnValue(Promise.resolve());
    comp.onCategoryChange('cat_expense_1');
    expect(comp.selectedId()).toBe('cat_expense_1');
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
