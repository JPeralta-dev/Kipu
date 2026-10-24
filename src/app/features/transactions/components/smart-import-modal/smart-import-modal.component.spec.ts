import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideIcons } from '@ng-icons/core';
import { ICONS } from '../../../../shared/icons/icon-registry';
import { SmartImportModalComponent } from './smart-import-modal.component';
import { SmartImportService } from '../../../../core/services/smart-import.service';
import type {
  SmartAnalysisResult,
  SmartCommitResult,
} from '../../../../core/models/smart-import.model';

describe('SmartImportModalComponent', () => {
  let component: SmartImportModalComponent;
  let fixture: ComponentFixture<SmartImportModalComponent>;
  let mockSmartImportService: jasmine.SpyObj<SmartImportService>;

  const mockAnalysis: SmartAnalysisResult = {
    matchConfidence: 98,
    summary: {
      estimatedRows: 50,
      detectedCurrency: 'COP',
      dateRangeSample: '01/01/2024 - 15/01/2024',
      patternDescription: 'Una columna con montos positivos y negativos',
    },
    explanation: ['Cabecera en fila 1', 'Columna de fecha identificada'],
    detectedColumns: {
      date: 'Fecha',
      description: 'Concepto',
      amount: 'Valor',
    },
    schemaConfig: {
      headerRowIndex: 0,
      dateColumn: { name: 'Fecha', index: 0 },
      descriptionColumn: { name: 'Concepto', index: 1 },
      amountStrategy: 'single_column_signed',
      amountColumn: { name: 'Valor', index: 2 },
    },
    previewRows: [
      { date: '2024-01-15', description: 'Café', amount: 5000, type: 'expense' },
    ],
  };

  const mockCommit: SmartCommitResult = {
    importedCount: 48,
    skippedCount: 2,
    duplicateCount: 2,
    totalIncome: 2000000,
    totalExpense: 150000,
    duplicates: [{ description: 'Café repetido', amount: 5000, reason: 'Duplicado' }],
    transactions: [],
  };

  beforeEach(async () => {
    mockSmartImportService = jasmine.createSpyObj('SmartImportService', [
      'analyze',
      'commit',
    ]);

    await TestBed.configureTestingModule({
      imports: [SmartImportModalComponent],
      providers: [
        provideIcons(ICONS),
        { provide: SmartImportService, useValue: mockSmartImportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SmartImportModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.step()).toBe('idle');
  });

  it('should reject unsupported file formats', () => {
    const invalidFile = new File(['content'], 'virus.exe', { type: 'application/x-msdownload' });
    component.handleFile(invalidFile);

    expect(component.step()).toBe('error');
    expect(component.errorMessage()).toContain('Formato no soportado');
  });

  it('should analyze valid file and transition to matched step', () => {
    mockSmartImportService.analyze.and.returnValue(of(mockAnalysis));

    const validFile = new File(['col1,col2'], 'gastos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    component.handleFile(validFile);

    expect(mockSmartImportService.analyze).toHaveBeenCalledWith(validFile);
    expect(component.step()).toBe('matched');
    expect(component.analysisResult()).toEqual(mockAnalysis);
  });

  it('should commit import and emit imported event on success', () => {
    mockSmartImportService.commit.and.returnValue(of(mockCommit));
    spyOn(component.imported, 'emit');

    component.analysisResult.set(mockAnalysis);
    component.selectedFile.set(new File([''], 'gastos.xlsx'));

    component.commitImport();

    expect(mockSmartImportService.commit).toHaveBeenCalled();
    expect(component.step()).toBe('success');
    expect(component.commitResult()).toEqual(mockCommit);
    expect(component.imported.emit).toHaveBeenCalledWith(mockCommit);
  });
});
