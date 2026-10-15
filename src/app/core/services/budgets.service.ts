import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Budget, CreateBudgetDto, UpdateBudgetDto, BudgetAlert } from '../models/budget.model';

import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  getBudgets(): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.base}/budgets`);
  }

  getBudgetById(id: string): Observable<Budget> {
    return this.http.get<Budget>(`${this.base}/budgets/${id}`);
  }

  createBudget(dto: CreateBudgetDto): Observable<Budget> {
    return this.http.post<Budget>(`${this.base}/budgets`, dto);
  }

  updateBudget(id: string, dto: UpdateBudgetDto): Observable<Budget> {
    return this.http.put<Budget>(`${this.base}/budgets/${id}`, dto);
  }

  deleteBudget(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/budgets/${id}`);
  }

  getBudgetAlerts(): Observable<BudgetAlert[]> {
    return this.http.get<{ alerts: BudgetAlert[] } | BudgetAlert[]>(`${this.base}/budgets/alerts`).pipe(
      map((res) => (Array.isArray(res) ? res : res?.alerts || [])),
    );
  }
}
