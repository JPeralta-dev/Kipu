import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, tap, catchError, of } from "rxjs";

import { environment } from "../../../environments/environment";
import { Summary } from "../models/summary.model";
import { Transaction, TransactionFilters } from "../models/transaction.model";
import { Category } from "../models/category.model";
import { ChartData } from "../models/chart.model";
import { Insight } from "../models/insight.model";
import type { BankBreakdownItem } from './bank.service';

export interface SummaryParams {
  startDate?: string;
  endDate?: string;
  bankId?: string;
}

@Injectable({ providedIn: "root" })
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  // ── Summary ──────────────────────────────────────────────────────────────

  getSummary(params?: SummaryParams): Observable<Summary> {
    let queryParams = '';
    if (params) {
      const qs = new URLSearchParams();
      if (params.startDate) qs.set('startDate', params.startDate);
      if (params.endDate) qs.set('endDate', params.endDate);
      if (params.bankId) qs.set('bankId', params.bankId);
      const qsStr = qs.toString();
      if (qsStr) queryParams = '?' + qsStr;
    }
    return this.http.get<Summary>(`${this.base}/summary${queryParams}`);
  }

  // ── Transactions ─────────────────────────────────────────────────────────

  getTransactions(filters?: TransactionFilters): Observable<Transaction[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params = params.set(k, String(v));
      });
    }
    return this.http.get<Transaction[]>(`${this.base}/transactions`, {
      params,
    });
  }

  getTransactionById(id: string): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.base}/transactions/${id}`);
  }

  createTransaction(
    payload: Omit<Transaction, "id" | "createdAt">,
  ): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.base}/transactions`, payload);
  }

  updateTransaction(
    id: string,
    payload: Partial<Transaction>,
  ): Observable<Transaction> {
    return this.http.put<Transaction>(
      `${this.base}/transactions/${id}`,
      payload,
    );
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/transactions/${id}`);
  }

  // ── Categories ───────────────────────────────────────────────────────────

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  createCategory(
    payload: Omit<Category, 'id' | 'total' | 'isDefault'>,
  ): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, payload);
  }

  updateCategory(
    id: string,
    payload: Partial<Omit<Category, 'id' | 'total' | 'isDefault'>>,
  ): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, payload);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  // ── Chart ─────────────────────────────────────────────────────────────────

  getMonthlyChart(months?: number): Observable<ChartData[]> {
    let params = new HttpParams();
    if (months) params = params.set('months', months);
    return this.http.get<ChartData[]>(`${this.base}/chart/monthly`, { params });
  }

  // ── Insights ──────────────────────────────────────────────────────────────

  getInsights(): Observable<Insight[]> {
    return this.http.get<Insight[]>(`${this.base}/insights`);
  }

  // ── Bank Breakdown ────────────────────────────────────────────────────────

  getBankBreakdown(): Observable<BankBreakdownItem[]> {
    return this.http.get<BankBreakdownItem[]>(`${this.base}/analytics/bank-breakdown`);
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  private readonly DEFAULT_CAT_KEY = 'flowr_default_category';
  readonly defaultCategoryId = signal<string | null>(this.readStoredDefaultCategory());

  getDefaultCategory(): Observable<{ defaultCategoryId: string | null }> {
    return this.http.get<{ defaultCategoryId: string | null }>(`${this.base}/users/me/preferences`).pipe(
      tap((res) => {
        const id = res?.defaultCategoryId ?? null;
        this.defaultCategoryId.set(id);
        this.writeStoredDefaultCategory(id);
      }),
      catchError(() => {
        const fallback = this.readStoredDefaultCategory();
        this.defaultCategoryId.set(fallback);
        return of({ defaultCategoryId: fallback });
      }),
    );
  }

  setDefaultCategory(categoryId: string | null): Observable<{ defaultCategoryId: string | null }> {
    this.defaultCategoryId.set(categoryId);
    this.writeStoredDefaultCategory(categoryId);
    return this.http.patch<{ defaultCategoryId: string | null }>(`${this.base}/users/me/preferences`, {
      defaultCategoryId: categoryId,
    }).pipe(
      tap((res) => {
        const resolved = res?.defaultCategoryId !== undefined ? res.defaultCategoryId : categoryId;
        this.defaultCategoryId.set(resolved ?? null);
        this.writeStoredDefaultCategory(resolved ?? null);
      }),
      catchError(() => of({ defaultCategoryId: categoryId })),
    );
  }

  private readStoredDefaultCategory(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = window.localStorage.getItem(this.DEFAULT_CAT_KEY);
      return val && val.trim().length > 0 ? val : null;
    } catch {
      return null;
    }
  }

  private writeStoredDefaultCategory(id: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (id) {
        window.localStorage.setItem(this.DEFAULT_CAT_KEY, id);
      } else {
        window.localStorage.removeItem(this.DEFAULT_CAT_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }
}
