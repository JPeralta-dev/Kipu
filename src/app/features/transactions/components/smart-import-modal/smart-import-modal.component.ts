import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { FtModalComponent } from '../../../../shared/ui/modal/ft-modal.component';
import { SmartImportService } from '../../../../core/services/smart-import.service';
import type {
  SmartAnalysisResult,
  SmartCommitResult,
  SmartImportStep,
} from '../../../../core/models/smart-import.model';

const LOADING_STEPS = [
  'Entendiendo la estructura de tu archivo...',
  'Identificando columnas y formatos de fecha...',
  'Deduciendo montos, ingresos y gastos...',
  'Calculando compatibilidad con tus finanzas...',
];

@Component({
  selector: 'ft-smart-import-modal',
  standalone: true,
  imports: [CommonModule, NgIcon, FtModalComponent],
  templateUrl: './smart-import-modal.component.html',
  styleUrls: ['./smart-import-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartImportModalComponent implements OnDestroy {
  private readonly smartImportService = inject(SmartImportService);

  // Inputs & Outputs (Signal-based)
  readonly open = input.required<boolean>();
  readonly closed = output<void>();
  readonly imported = output<SmartCommitResult>();

  // State signals
  readonly step = signal<SmartImportStep>('idle');
  readonly currentLoadingMessageIndex = signal<number>(0);
  readonly selectedFile = signal<File | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly analysisResult = signal<SmartAnalysisResult | null>(null);
  readonly commitResult = signal<SmartCommitResult | null>(null);
  readonly errorMessage = signal<string>('');

  // Toggles
  readonly autoCategorize = signal<boolean>(true);
  readonly skipDuplicates = signal<boolean>(true);
  readonly showPreviewTable = signal<boolean>(true);

  // Computed
  readonly currentLoadingMessage = computed(
    () => LOADING_STEPS[this.currentLoadingMessageIndex()],
  );

  private loadingTimer: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    this.stopLoadingTimer();
  }

  onClose(): void {
    this.stopLoadingTimer();
    this.resetState();
    this.closed.emit();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.handleFile(inputEl.files[0]);
    }
  }

  handleFile(file: File): void {
    const validExtensions = ['.csv', '.xlsx', '.xls', '.tsv'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );

    if (!hasValidExt) {
      this.errorMessage.set(
        'Formato no soportado. Por favor sube un archivo CSV o Excel (.xlsx, .xls, .tsv).',
      );
      this.step.set('error');
      return;
    }

    this.selectedFile.set(file);
    this.startAnalysis(file);
  }

  startAnalysis(file: File): void {
    this.step.set('analyzing');
    this.startLoadingTimer();

    this.smartImportService.analyze(file).subscribe({
      next: (result) => {
        this.stopLoadingTimer();
        this.analysisResult.set(result);
        this.step.set('matched');
      },
      error: (err) => {
        this.stopLoadingTimer();
        const msg =
          err?.error?.message ||
          'No pudimos interpretar la estructura de este archivo. Verifica que contenga transacciones.';
        this.errorMessage.set(msg);
        this.step.set('error');
      },
    });
  }

  commitImport(): void {
    const file = this.selectedFile();
    const analysis = this.analysisResult();

    if (!file || !analysis) return;

    this.step.set('committing');

    this.smartImportService
      .commit(
        file,
        analysis.schemaConfig,
        this.autoCategorize(),
        this.skipDuplicates(),
      )
      .subscribe({
        next: (result) => {
          this.commitResult.set(result);
          this.step.set('success');
          this.imported.emit(result);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            'Ocurrió un error al importar los movimientos. Inténtalo de nuevo.';
          this.errorMessage.set(msg);
          this.step.set('error');
        },
      });
  }

  togglePreview(): void {
    this.showPreviewTable.update((prev) => !prev);
  }

  toggleAutoCategorize(): void {
    this.autoCategorize.update((prev) => !prev);
  }

  toggleSkipDuplicates(): void {
    this.skipDuplicates.update((prev) => !prev);
  }

  resetState(): void {
    this.step.set('idle');
    this.selectedFile.set(null);
    this.analysisResult.set(null);
    this.commitResult.set(null);
    this.errorMessage.set('');
    this.currentLoadingMessageIndex.set(0);
  }

  private startLoadingTimer(): void {
    this.stopLoadingTimer();
    this.currentLoadingMessageIndex.set(0);
    this.loadingTimer = setInterval(() => {
      this.currentLoadingMessageIndex.update(
        (i) => (i + 1) % LOADING_STEPS.length,
      );
    }, 1800);
  }

  private stopLoadingTimer(): void {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
  }
}
