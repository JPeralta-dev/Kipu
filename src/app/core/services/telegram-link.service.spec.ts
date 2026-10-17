import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TelegramLinkService } from './telegram-link.service';
import { environment } from '../../../environments/environment';

describe('TelegramLinkService', () => {
  let service: TelegramLinkService;
  let httpMock: HttpTestingController;
  const apiBase = `${environment.apiUrl}/api`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TelegramLinkService],
    });
    service = TestBed.inject(TelegramLinkService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.ngOnDestroy();
  });

  it('should be created', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.flush({ linked: false, telegramId: null });
    expect(service).toBeTruthy();
  });

  it('should check link status on construction', () => {
    expect(service.state()).toBe('loading');
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    expect(req.request.method).toBe('GET');
    req.flush({ linked: false, telegramId: null });
  });

  it('should transition to idle when not linked', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.flush({ linked: false, telegramId: null });
    expect(service.state()).toBe('idle');
  });

  it('should transition to linked when backend returns linked:true', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.flush({ linked: true, telegramId: 'tg-123' });
    expect(service.state()).toBe('linked');
    expect(service.telegramId()).toBe('tg-123');
  });

  it('should show error on link status failure', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.error(new ProgressEvent('error'));
    expect(service.error()).toBe('settings.telegram.error_link');
    expect(service.state()).toBe('idle');
  });

  it('should generate code and transition to polling', () => {
    const statusReq = httpMock.expectOne(`${apiBase}/auth/link-status`);
    statusReq.flush({ linked: false, telegramId: null });

    service.generateCode(false);
    expect(service.state()).toBe('generating');

    const codeReq = httpMock.expectOne(`${apiBase}/auth/link-code`);
    expect(codeReq.request.method).toBe('POST');
    codeReq.flush({ code: 'ABC123', expiresAt: new Date(Date.now() + 60000).toISOString() });

    expect(service.linkCode()).toBe('ABC123');
    expect(service.state()).toBe('polling');
  });

  it('should block generateCode if already linked', () => {
    const statusReq = httpMock.expectOne(`${apiBase}/auth/link-status`);
    statusReq.flush({ linked: true, telegramId: 'tg-123' });

    service.generateCode();
    expect(service.state()).toBe('linked');
  });

  it('should poll and detect linked state', fakeAsync(() => {
    const statusReq = httpMock.expectOne(`${apiBase}/auth/link-status`);
    statusReq.flush({ linked: false, telegramId: null });

    service.generateCode(false);
    const codeReq = httpMock.expectOne(`${apiBase}/auth/link-code`);
    codeReq.flush({ code: 'ABC123', expiresAt: new Date(Date.now() + 60000).toISOString() });

    // Advance 3s for the polling interval
    tick(3000);

    const pollReq = httpMock.expectOne(`${apiBase}/auth/link-status`);
    pollReq.flush({ linked: true, telegramId: 'tg-456' });

    expect(service.state()).toBe('linked');
    expect(service.justLinked()).toBe(true);
    expect(service.linkCode()).toBeNull();
  }));

  it('should show error on code generation failure', () => {
    const statusReq = httpMock.expectOne(`${apiBase}/auth/link-status`);
    statusReq.flush({ linked: false, telegramId: null });

    service.generateCode(false);
    const codeReq = httpMock.expectOne(`${apiBase}/auth/link-code`);
    codeReq.error(new ProgressEvent('error'));

    expect(service.error()).toBe('settings.telegram.error_generate');
    expect(service.state()).toBe('idle');
  });

  it('should use environment.telegramBotUrl for openTelegram', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.flush({ linked: false, telegramId: null });

    const openUrlSpy = spyOn(service, 'openUrl');
    service.openTelegram();
    expect(openUrlSpy).toHaveBeenCalledWith(environment.telegramBotUrl, false);
  });

  it('should use deep link on mobile devices', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.flush({ linked: false, telegramId: null });

    const openUrlSpy = spyOn(service, 'openUrl');
    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
    });

    service.openTelegramWithCode('ABC123');
    expect(openUrlSpy).toHaveBeenCalledWith(
      jasmine.stringContaining('tg://resolve?domain=hormigaTrackerBot'),
      true,
    );

    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
  });

  it('should use web URL for desktop devices', () => {
    const req = httpMock.expectOne(`${apiBase}/auth/link-status`);
    req.flush({ linked: false, telegramId: null });

    const openUrlSpy = spyOn(service, 'openUrl');
    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });

    service.openTelegramWithCode('ABC123');
    expect(openUrlSpy).toHaveBeenCalledWith(
      jasmine.stringContaining(environment.telegramBotUrl),
      false,
    );

    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
  });

  it('should clear timers on destroy', () => {
    const statusReq = httpMock.expectOne(`${apiBase}/auth/link-status`);
    statusReq.flush({ linked: false, telegramId: null });

    service.generateCode(false);
    const codeReq = httpMock.expectOne(`${apiBase}/auth/link-code`);
    codeReq.flush({ code: 'ABC123', expiresAt: new Date(Date.now() + 60000).toISOString() });

    service.ngOnDestroy();
    expect(service.state()).toBe('polling');
  });
});
