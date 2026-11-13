import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ProfileSectionComponent } from './profile-section.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ProfileSectionComponent', () => {
  let component: ProfileSectionComponent;
  let fixture: ComponentFixture<ProfileSectionComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getProfile',
      'updateProfile',
      'clearTokens',
    ]);
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getProfile.and.returnValue(
      of({ id: '1', email: 'test@example.com', displayName: 'Test User', createdAt: '2024-01-01T00:00:00Z' }),
    );
    authServiceSpy.updateProfile.and.callFake((name: string) =>
      of({ id: '1', email: 'test@example.com', displayName: name, createdAt: '2024-01-01T00:00:00Z' }),
    );

    await TestBed.configureTestingModule({
      imports: [ProfileSectionComponent, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileSectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile on init', () => {
    component.ngOnInit();
    expect(authServiceSpy.getProfile).toHaveBeenCalled();
    expect(component.displayName()).toBe('Test User');
  });

  it('should allow inline editing and saving display name', () => {
    component.ngOnInit();
    component.startEditing();
    expect(component.isEditing()).toBeTrue();
    component.editName.set('Updated Name');
    component.saveProfile();
    expect(authServiceSpy.updateProfile).toHaveBeenCalledWith('Updated Name');
    expect(component.displayName()).toBe('Updated Name');
    expect(component.isEditing()).toBeFalse();
    expect(component.saveSuccess()).toBeTrue();
  });

  it('should not clear tokens when profile load fails', () => {
    authServiceSpy.getProfile.and.returnValue(throwError(() => new Error('Network error')));
    component.ngOnInit();
    expect(component.profileError()).toBe('settings.profile.load_error');
    expect(authServiceSpy.clearTokens).not.toHaveBeenCalled();
  });
});
