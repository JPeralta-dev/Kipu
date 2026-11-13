import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileDropdownMenuComponent } from './profile-dropdown-menu.component';
import type { User } from '../../../../core/models/user.model';

@Component({
  standalone: true,
  template: `<app-profile-dropdown-menu
    [user]="user"
    [initials]="initials"
    [displayName]="displayName"
    [isLoggingOut]="isLoggingOut"
    (closed)="onClosed()"
    (logoutRequested)="onLogout()"
  />`,
  imports: [ProfileDropdownMenuComponent],
})
class TestHostComponent {
  user: User | null = null;
  initials = 'TU';
  displayName = 'Test User';
  isLoggingOut = false;
  closedCount = 0;
  logoutCount = 0;
  onClosed() { this.closedCount++; }
  onLogout() { this.logoutCount++; }
}

describe('ProfileDropdownMenuComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: '2024-01-15T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    hostComponent.user = mockUser;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('.profile-dropdown__menu')).toBeTruthy();
  });

  it('should render user initials in avatar', () => {
    const avatar = fixture.nativeElement.querySelector('.profile-dropdown__user-avatar');
    expect(avatar.textContent.trim()).toBe('TU');
  });

  it('should render user name', () => {
    const name = fixture.nativeElement.querySelector('.profile-dropdown__user-name');
    expect(name.textContent.trim()).toBe('Test User');
  });

  it('should render user email', () => {
    const email = fixture.nativeElement.querySelector('.profile-dropdown__user-email');
    expect(email.textContent.trim()).toBe('test@example.com');
  });

  it('should NOT render duplicate profile link since profile is centralized in settings', () => {
    const link = fixture.nativeElement.querySelector('a[routerlink="/profile"]');
    expect(link).toBeNull();
  });

  it('should emit closed event when settings link clicked', () => {
    const link = fixture.nativeElement.querySelector('a[routerlink="/settings"]');
    link.click();
    expect(hostComponent.closedCount).toBe(1);
  });

  it('should emit logoutRequested event when logout button clicked', () => {
    const btn = fixture.nativeElement.querySelector('.profile-dropdown__item--danger');
    btn.click();
    expect(hostComponent.logoutCount).toBe(1);
  });

  it('should disable logout button when isLoggingOut is true', () => {
    hostComponent.isLoggingOut = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.profile-dropdown__item--danger');
    expect(btn.disabled).toBeTrue();
  });
});
