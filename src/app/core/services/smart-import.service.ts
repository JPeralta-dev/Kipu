import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  DetectedStructure,
  SmartAnalysisResult,
  SmartCommitResult,
} from '../models/smart-import.model';

@Injectable({ providedIn: 'root' })
export class SmartImportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/smart-import`;

  /**
   * Analyzes an uploaded CSV or Excel file.
   * Sends the sample to the backend and returns the LLM-powered schema match.
   */
  analyze(file: File): Observable<SmartAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<SmartAnalysisResult>(`${this.baseUrl}/analyze`, formData);
  }

  /**
   * Commits the import of the entire spreadsheet using the confirmed schema.
   */
  commit(
    file: File,
    schemaConfig: DetectedStructure,
    autoCategorize = true,
    skipDuplicates = true,
  ): Observable<SmartCommitResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('schemaConfig', JSON.stringify(schemaConfig));
    formData.append('autoCategorize', String(autoCategorize));
    formData.append('skipDuplicates', String(skipDuplicates));

    return this.http.post<SmartCommitResult>(`${this.baseUrl}/commit`, formData);
  }
}
