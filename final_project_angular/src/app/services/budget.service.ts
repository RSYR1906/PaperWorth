import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';

interface BudgetCategory {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  transactions: number;
}

interface Budget {
  id?: string;
  userId: string;
  monthYear: string; // Format: 'YYYY-MM'
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
}

type CategoryBudgets = Record<string, number>;

/**
 * Service responsible for managing user budget data
 */
@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private readonly apiUrl = `${environment.apiUrl}/budgets`;
  private readonly currentBudgetSubject = new BehaviorSubject<Budget | null>(null);
  private readonly defaultBudgetAmount = 1500; // Default monthly budget
  

  readonly currentBudget$ = this.currentBudgetSubject.asObservable();

  private readonly defaultCategoryBudgets: CategoryBudgets = {
    'Groceries': 30,  // 30% of total budget
    'Dining': 20,     // 20% of total budget
    'Fast Food': 10,  // 10% of total budget
    'Cafes': 5,       // 5% of total budget
    'Retail': 15,     // 15% of total budget
    'Shopping': 10,   // 10% of total budget
    'Healthcare': 5,  // 5% of total budget
    'Others': 5       // 5% of total budget
  };

  constructor(private http: HttpClient) {}

  loadUserBudget(userId: string, monthYear?: string): Observable<Budget> {
    const actualMonthYear = monthYear || this.getCurrentMonthYear();

    return this.http.get<Budget>(`${this.apiUrl}/user/${userId}/month/${actualMonthYear}`)
      .pipe(
        tap(budget => this.currentBudgetSubject.next(budget)),
        catchError(error => {
          console.error('Error loading budget:', error);
          return this.createEmptyBudget(userId, actualMonthYear);
        })
      );
  }

  getCurrentBudget(): Observable<Budget | null> {
    return this.currentBudget$;
  }

  addExpenseToBudget(receipt: any): Observable<Budget> {
    const currentBudget = this.currentBudgetSubject.value;
    if (!currentBudget) {
      throw new Error('Budget not initialized. Call loadUserBudget first.');
    }

    const category = receipt.category || 'Others';
    const amount = receipt.totalAmount || receipt.totalExpense || 0;
    
    return this.http.post<Budget>(
      `${this.apiUrl}/user/${currentBudget.userId}/month/${currentBudget.monthYear}/expense`, 
      { category, amount }
    ).pipe(
      tap(updatedBudget => this.currentBudgetSubject.next(updatedBudget)),
      catchError(error => {
        console.error('Error adding expense to budget:', error);
        // Fallback to updating budget locally
        this.updateBudgetLocally(category, amount);
        return of(this.currentBudgetSubject.value as Budget);
      })
    );
  }

  setTotalBudget(amount: number): Observable<Budget> {
    const currentBudget = this.getCurrentBudgetOrThrow();

    return this.http.put<Budget>(
      `${this.apiUrl}/user/${currentBudget.userId}/month/${currentBudget.monthYear}/total`,
      { amount }
    ).pipe(
      tap(updatedBudget => this.currentBudgetSubject.next(updatedBudget)),
      catchError(error => {
        console.error('Error updating total budget:', error);
        return of(currentBudget);
      })
    );
  }

  setCategoryBudget(category: string, amount: number): Observable<Budget> {
    const currentBudget = this.getCurrentBudgetOrThrow();

    return this.http.put<Budget>(
      `${this.apiUrl}/user/${currentBudget.userId}/month/${currentBudget.monthYear}/category/${category}`,
      { amount }
    ).pipe(
      tap(updatedBudget => this.currentBudgetSubject.next(updatedBudget)),
      catchError(error => {
        console.error('Error updating category budget:', error);
        return of(currentBudget);
      })
    );
  }

  saveBudget(budget: Budget): Observable<Budget> {
    return this.http.post<Budget>(`${this.apiUrl}`, budget).pipe(
      tap(savedBudget => this.currentBudgetSubject.next(savedBudget)),
      catchError(error => {
        console.error('Error saving budget:', error);
        return of(budget);
      })
    );
  }

  private createEmptyBudget(userId: string, monthYear: string): Observable<Budget> {
    const budget: Budget = {
      userId,
      monthYear,
      totalBudget: 0,
      totalSpent: 0,
      categories: []
    };

    return this.http.post<Budget>(`${this.apiUrl}`, budget).pipe(
      tap(createdBudget => this.currentBudgetSubject.next(createdBudget)),
      catchError(error => {
        console.error('Error creating budget:', error);
        return of(this.createLocalBudget(userId, monthYear));
      })
    );
  }

  private createLocalBudget(userId: string, monthYear: string): Budget {
    const categories: BudgetCategory[] = Object.entries(this.defaultCategoryBudgets).map(
      ([category, percentage]) => ({
        category,
        budgetAmount: this.defaultBudgetAmount * (percentage / 100),
        spentAmount: 0,
        transactions: 0
      })
    );

    const budget: Budget = {
      userId,
      monthYear,
      totalBudget: this.defaultBudgetAmount,
      totalSpent: 0,
      categories
    };

    this.currentBudgetSubject.next(budget);
    return budget;
  }

  private updateBudgetLocally(categoryName: string, amount: number): void {
    const budget = this.currentBudgetSubject.value;
    if (!budget) return;

    const category = budget.categories.find(c => 
      c.category.toLowerCase() === categoryName.toLowerCase()
    );

    if (category) {
      category.spentAmount += amount;
      category.transactions += 1;
    } else {
      budget.categories.push({
        category: categoryName,
        budgetAmount: budget.totalBudget * 0.05,
        spentAmount: amount,
        transactions: 1
      });
    }

    // Update total spent
    budget.totalSpent += amount;

    this.currentBudgetSubject.next({...budget});
  }

  private getCurrentBudgetOrThrow(): Budget {
    const currentBudget = this.currentBudgetSubject.value;
    if (!currentBudget) {
      throw new Error('Budget not initialized. Call loadUserBudget first.');
    }
    return currentBudget;
  }

  private getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}