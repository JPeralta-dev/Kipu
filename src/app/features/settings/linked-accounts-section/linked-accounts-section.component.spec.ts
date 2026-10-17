import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LinkedAccountsSectionComponent } from './linked-accounts-section.component';
import { TelegramLinkService } from '../../../core/services/telegram-link.service';
import { AuthService } from '../../../core/services/auth.service';
import { GmailLinkService } from '../../../core/services/gmail-link.service';
import { TranslationService } from '../../../core/services/translation.service';

describe('LinkedAccountsSectionComponent', () => {
  let component: LinkedAccountsSectionComponent;
  let fixture: ComponentFixture<LinkedAccountsSectionComponent>;
  let svcSpy: jasmine.SpyObj<TelegramLinkService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let gmailSpy: jasmine.SpyObj<GmailLinkService>;
  let translateSpy: jasmine.SpyObj<TranslationService>;

  beforeEach(async () => {
    svcSpy = jasmine.createSpyObj(
      'TelegramLinkService',
      ['generateCode', 'openTelegram', 'openTelegramWithCode'],
      {
        state: signal('idle'),
        linkCode: signal<string | null>(null),
        telegramId: signal<string | null>(null),
        countdown: signal(0),
        error: signal<string | null>(null),
        justLinked: signal(false),
      },
    );

    authSpy = jasmine.createSpyObj('AuthService', ['signInWithGoogle']);
    gmailSpy = jasmine.createSpyObj(
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
    translateSpy = jasmine.createSpyObj('TranslationService', ['translate']);
    translateSpy.translate.and.callFake((k: string) => k);

    await TestBed.configureTestingModule({
      imports: [LinkedAccountsSectionComponent],
      providers: [
        { provide: TelegramLinkService, useValue: svcSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: GmailLinkService, useValue: gmailSpy },
        { provide: TranslationService, useValue: translateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinkedAccountsSectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject TelegramLinkService', () => {
    expect(component.svc).toBeTruthy();
  });

  it('should compute countdownMinutes', () => {
    (svcSpy.countdown as any).set(125);
    expect(component.countdownMinutes).toBe(2);
  });

  it('should compute countdownSeconds', () => {
    (svcSpy.countdown as any).set(125);
    expect(component.countdownSeconds).toBe(5);
  });

  it('telegramState should reflect the service state', () => {
    expect(component.telegramState()).toBe('disconnected');
    (svcSpy.state as any).set('linked');
    expect(component.telegramState()).toBe('connected');
    (svcSpy.state as any).set('loading');
    expect(component.telegramState()).toBe('connecting');
  });

  it('gmailState should be disconnected when no OAuth flow has started', () => {
    expect(component.gmailState()).toBe('disconnected');
  });

  it('gmailState should be connecting when the local OAuth flag is on', () => {
    component.gmailConnecting.set(true);
    expect(component.gmailState()).toBe('connecting');
  });

  it('gmailState should be connected when the gmail service is connected', () => {
    (gmailSpy.state as any).set('connected');
    component.gmailConnecting.set(false);
    expect(component.gmailState()).toBe('connected');
  });

  it('connectGmail should start the OAuth flow and mark connecting', () => {
    component.connectGmail();
    expect(authSpy.signInWithGoogle).toHaveBeenCalledTimes(1);
    const scopes = authSpy.signInWithGoogle.calls.mostRecent().args[0];
    expect(scopes).toEqual(jasmine.arrayContaining([
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ]));
    expect(component.gmailConnecting()).toBeTrue();
  });

  it('connectGmail should be a no-op when already connecting', () => {
    component.gmailConnecting.set(true);
    component.connectGmail();
    expect(authSpy.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('onGmailSync should delegate to the GmailLinkService', () => {
    component.onGmailSync();
    expect(gmailSpy.syncNow).toHaveBeenCalledTimes(1);
  });

  it('onGmailDisconnect should delegate to the GmailLinkService on confirmation', () => {
    component.onGmailDisconnect();
    expect(component.gmailDisconnectConfirm()).toBe(true);
    component.confirmGmailDisconnect();
    expect(gmailSpy.markDisconnected).toHaveBeenCalledTimes(1);
    expect(component.gmailDisconnectConfirm()).toBe(false);
  });

  it('onTelegramConnect should delegate to the TelegramLinkService', () => {
    component.onTelegramConnect();
    expect(svcSpy.generateCode).toHaveBeenCalledTimes(1);
  });

  it('onTelegramConnect should be a no-op while generating', () => {
    (svcSpy.state as any).set('generating');
    component.onTelegramConnect();
    expect(svcSpy.generateCode).not.toHaveBeenCalled();
  });

  it('gmailRecent should map bank transactions to the card format', () => {
    (gmailSpy.lastTransactions as any).set([
      { id: '1', bankName: 'Bancolombia', amount: 85250, currency: 'COP', receivedAt: new Date(Date.now() - 60_000).toISOString() },
    ]);
    const recent = component.gmailRecent();
    expect(recent.length).toBe(1);
    expect(recent[0].primary).toBe('Bancolombia');
    expect(recent[0].iconKey).toBe('bank');
    expect(recent[0].amount).toContain('85,250');
  });

  it('gmailRecent should cap to 3 items', () => {
    (gmailSpy.lastTransactions as any).set(
      Array.from({ length: 6 }, (_, i) => ({
        id: String(i), bankName: `Bank ${i}`, amount: 100, currency: 'USD', receivedAt: new Date().toISOString(),
      })),
    );
    expect(component.gmailRecent().length).toBe(3);
  });

  it('copyCode should copy code to clipboard and toggle codeCopied', async () => {
    const clipboardSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.copyCode('123456');
    expect(clipboardSpy).toHaveBeenCalledWith('123456');
  });

  it('copyCommand should copy /link command to clipboard', async () => {
    const clipboardSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.copyCommand('123456');
    expect(clipboardSpy).toHaveBeenCalledWith('/link 123456');
  });

  it('openTelegramFlow should copy command and delegate to service', () => {
    spyOn(component, 'copyCommand');
    component.openTelegramFlow('123456');
    expect(component.copyCommand).toHaveBeenCalledWith('123456');
    expect(svcSpy.openTelegramWithCode).toHaveBeenCalledWith('123456');
  });
});
