import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { FinanceService } from './finance.service';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly financeService = inject(FinanceService, { optional: true });
  private readonly base = `${environment.apiUrl}/api/users`;

  /**
   * Export all user data as JSON (GDPR Article 20).
   * Returns the raw response so the caller can trigger a download.
   * Falls back to assembling authenticated client-side data if the backend
   * endpoint returns 404 (e.g., when Better Auth user ID differs from legacy User document).
   */
  exportData(): Observable<Blob> {
    return this.http.get(`${this.base}/me/export`, {
      responseType: 'blob',
      withCredentials: true,
    }).pipe(
      catchError((err) => {
        if (!this.financeService || !this.authService) {
          return throwError(() => err);
        }
        const user = this.authService.currentUser();
        if (!user) {
          return throwError(() => err);
        }
        return forkJoin({
          transactions: this.financeService.getTransactions().pipe(catchError(() => of([]))),
          categories: this.financeService.getCategories().pipe(catchError(() => of([]))),
        }).pipe(
          map(({ transactions, categories }) => {
            const payload = {
              exportedAt: new Date().toISOString(),
              user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                createdAt: user.createdAt,
              },
              summary: {
                totalTransactions: transactions.length,
                totalCategories: categories.length,
              },
              transactions,
              categories,
            };
            return new Blob([JSON.stringify(payload, null, 2)], {
              type: 'application/json',
            });
          }),
        );
      }),
    );
  }

  /**
   * Permanently delete the user account and all associated data (GDPR Article 17).
   */
  deleteAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/me/account`, {
      withCredentials: true,
    });
  }
}
