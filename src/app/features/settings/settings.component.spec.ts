import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { TelegramLinkService } from '../../core/services/telegram-link.service';
import { GmailLinkService } from '../../core/services/gmail-link.service';
import { User } from '../../core/models/user.model';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj(
      'AuthService',
      ['logout', 'isAuthenticated', 'getProfile', 'updateProfile', 'clearSession'],
    );
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.getProfile.and.returnValue(
      of({
        id: 'test-id',
        displayName: 'Test User',
        email: 'test@example.com',
        createdAt: '2024-01-01',
      } as User),
    );

    const telegramLinkSpy = jasmine.createSpyObj(
      'TelegramLinkService',
      ['generateCode', 'openTelegram', 'openTelegramWithCode', 'unlink', 'markDisconnected'],
      {
        state: signal('idle'),
        linkCode: signal<string | null>(null),
        telegramId: signal<string | null>(null),
        countdown: signal(0),
        error: signal<string | null>(null),
        justLinked: signal(false),
      },
    );
    const gmailLinkSpy = jasmine.createSpyObj(
      'GmailLinkService',
      ['syncNow', 'markDisconnected', 'refreshStatus'],
      {
        state: signal('idle'),
        email: signal<string | null>(null),
        lastSyncAt: signal<string | null>(null),
        lastTransactions: signal([]),
        syncing: signal(false),
        error: signal<string | null>(null),
        isFirstConnect: signal(false),
      },
    );

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: TelegramLinkService, useValue: telegramLinkSpy },
        { provide: GmailLinkService, useValue: gmailLinkSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have logoutLoading signal initialized to false', () => {
    expect(component.logoutLoading()).toBe(false);
  });

  describe('component structure', () => {
    it('should render app-profile-section inline', () => {
      const el = fixture.debugElement.query(By.css('app-profile-section'));
      expect(el).toBeTruthy();
    });

    it('should render app-preferences-section inline on the page', () => {
      const el = fixture.debugElement.query(By.css('app-preferences-section'));
      expect(el).toBeTruthy();
    });

    it('should render app-linked-accounts-section inline', () => {
      const el = fixture.debugElement.query(By.css('app-linked-accounts-section'));
      expect(el).toBeTruthy();
    });

    it('should NOT render app-security-section stub', () => {
      const el = fixture.debugElement.query(By.css('app-security-section'));
      expect(el).toBeNull();
    });

    it('should NOT render app-notifications-section stub', () => {
      const el = fixture.debugElement.query(By.css('app-notifications-section'));
      expect(el).toBeNull();
    });
  });

  describe('Data management (Export & Delete Account)', () => {
    it('should export user data and mark exportSuccess true', () => {
      const userDataService = TestBed.inject(
        (component as any).userDataService.constructor,
      ) as any;
      const mockBlob = new Blob([JSON.stringify({ ok: true })], { type: 'application/json' });
      spyOn(userDataService, 'exportData').and.returnValue(of(mockBlob));
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock');
      spyOn(window.URL, 'revokeObjectURL');

      component.onExportData();

      expect(userDataService.exportData).toHaveBeenCalled();
      expect(component.exportSuccess()).toBeTrue();
      expect(component.exportError()).toBe('');
    });

    it('should require DELETE confirmation text before deleting account', () => {
      const userDataService = TestBed.inject(
        (component as any).userDataService.constructor,
      ) as any;
      spyOn(userDataService, 'deleteAccount');

      component.onRequestDelete();
      component.deleteConfirmText.set('wrong');
      component.onConfirmDelete();

      expect(component.deleteError()).toBe('settings.data.delete_confirm_mismatch');
      expect(userDataService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should delete account, clear session, and navigate to /login when DELETE is confirmed', () => {
      const userDataService = TestBed.inject(
        (component as any).userDataService.constructor,
      ) as any;
      spyOn(userDataService, 'deleteAccount').and.returnValue(of({ message: 'Deleted' }));
      const router = (component as any).router;
      spyOn(router, 'navigate');

      component.onRequestDelete();
      component.deleteConfirmText.set('DELETE');
      component.onConfirmDelete();

      expect(userDataService.deleteAccount).toHaveBeenCalled();
      expect(authServiceSpy.clearSession).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('i18n profile keys (TranslationService)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      localStorage.clear();
      localStorage.setItem(
        'flowr_translations',
        JSON.stringify({
          settings: {
            title: 'Settings',
            subtitle: 'Manage your account and integrations',
            profile: {
              title: 'Profile',
              display_name: 'Display name',
              email: 'Email',
            },
          },
        }),
      );
      localStorage.setItem('flowr_language', 'en');
      TestBed.configureTestingModule({});
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should resolve settings.profile.title as "Profile" in English', () => {
      const service = TestBed.inject(TranslationService);
      expect(service.translate('settings.profile.title')).toBe('Profile');
    });

    it('should resolve settings.profile.display_name as "Display name" in English', () => {
      const service = TestBed.inject(TranslationService);
      expect(service.translate('settings.profile.display_name')).toBe('Display name');
    });

    it('should resolve settings.profile.email as "Email" in English', () => {
      const service = TestBed.inject(TranslationService);
      expect(service.translate('settings.profile.email')).toBe('Email');
    });
  });
});
