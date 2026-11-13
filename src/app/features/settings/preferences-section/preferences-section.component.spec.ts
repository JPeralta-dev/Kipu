import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PreferencesSectionComponent } from './preferences-section.component';

describe('PreferencesSectionComponent', () => {
  let component: PreferencesSectionComponent;
  let fixture: ComponentFixture<PreferencesSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferencesSectionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PreferencesSectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept delay input', () => {
    expect(component.delay()).toBe(0);
  });
});
