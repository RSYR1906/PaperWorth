// src/app/services/budget.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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

// Define a type for the category budgets
type CategoryBudgets = {
  [key: string]: number;
};

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private apiUrl = `${environment.apiUrl}/budgets`;
  private currentBudgetSubject = new BehaviorSubject<Budget | null>(null);
  currentBudget$ = this.currentBudgetSubject.asObservable();

  // Default category budget distribution (for reference only - actual defaults are in the backend)
  private defaultCategoryBudgets: CategoryBudgets = {
    'Groceries': 30,   // 30% of total budget
    'Dining': 20,      // 20% of total budget
    'Fast Food': 10,   // 10% of total budget
    'Cafes': 5,        // 5% of total budget
    'Retail': 15,      // 15% of total budget
    'Shopping': 10,    // 10% of total budget
    'Healthcare': 5,   // 5% of total budget
    'Others': 5        // 5% of total budget
  };

  constructor(private http: HttpClient) { }

  // Initialize or load user budget
  loadUserBudget(userId: string, monthYear?: string): Observable<Budget> {
    // If monthYear is not provided, generate current month in YYYY-MM format
    const actualMonthYear = monthYear || 
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    return this.http.get<Budget>(`${this.apiUrl}/user/${userId}/month/${actualMonthYear}`)
      .pipe(
        tap(budget => this.currentBudgetSubject.next(budget)),
        catchError(error => {
          console.error('Error loading budget:', error);
          return this.createEmptyBudget(userId, actualMonthYear);
        })
      );
  }

  // Get the current month's budget
  getCurrentBudget(): Observable<Budget | null> {
    return this.currentBudget$;
  }

  // Update budget when a new receipt is added
  addExpenseToBudget(receipt: any): Observable<Budget> {
    const currentBudget = this.currentBudgetSubject.value;
    if (!currentBudget) {
      throw new Error('Budget not initialized. Call loadUserBudget first.');
    }

    const category = receipt.category || 'Others';
    const amount = receipt.totalAmount || receipt.totalExpense || 0;
    
    // Use the actual API endpoint to add an expense
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

  // Set a new total budget amount
  setTotalBudget(amount: number): Observable<Budget> {
    const currentBudget = this.currentBudgetSubject.value;
    if (!currentBudget) {
      throw new Error('Budget not initialized. Call loadUserBudget first.');
    }

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

  // Update a specific category's budget
  setCategoryBudget(category: string, amount: number): Observable<Budget> {
    const currentBudget = this.currentBudgetSubject.value;
    if (!currentBudget) {
      throw new Error('Budget not initialized. Call loadUserBudget first.');
    }

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

  // Save the entire budget object
  saveBudget(budget: Budget): Observable<Budget> {
    return this.http.post<Budget>(`${this.apiUrl}`, budget).pipe(
      tap(savedBudget => this.currentBudgetSubject.next(savedBudget)),
      catchError(error => {
        console.error('Error saving budget:', error);
        return of(budget);
      })
    );
  }

  // Private methods
  private createEmptyBudget(userId: string, monthYear: string): Observable<Budget> {
    // Create an empty budget object that will be populated by the backend
    const budget: Budget = {
      userId: userId,
      monthYear: monthYear,
      totalBudget: 0,
      totalSpent: 0,
      categories: []
    };

    // Save the empty budget to get default values from backend
    return this.http.post<Budget>(`${this.apiUrl}`, budget).pipe(
      tap(createdBudget => this.currentBudgetSubject.next(createdBudget)),
      catchError(error => {
        console.error('Error creating budget:', error);
        return of(this.createLocalBudget(userId, monthYear));
      })
    );
  }

  // Fallback method to create a budget locally if API fails
  private createLocalBudget(userId: string, monthYear: string): Budget {
    const defaultTotalBudget = 1500; // Default monthly budget
    
    const categories: BudgetCategory[] = Object.entries(this.defaultCategoryBudgets).map(([category, percentage]) => ({
      category: category,
      budgetAmount: defaultTotalBudget * (percentage / 100),
      spentAmount: 0,
      transactions: 0
    }));

    const budget: Budget = {
      userId: userId,
      monthYear: monthYear,
      totalBudget: defaultTotalBudget,
      totalSpent: 0,
      categories: categories
    };

    this.currentBudgetSubject.next(budget);
    return budget;
  }

  // Update budget locally when API fails
  private updateBudgetLocally(categoryName: string, amount: number): void {
    const budget = this.currentBudgetSubject.value;
    if (!budget) return;

    // Find the category
    const category = budget.categories.find(c => 
      c.category.toLowerCase() === categoryName.toLowerCase()
    );

    if (category) {
      // Update existing category
      category.spentAmount += amount;
      category.transactions += 1;
    } else {
      // Add new category
      budget.categories.push({
        category: categoryName,
        budgetAmount: budget.totalBudget * 0.05, // Default 5% of total
        spentAmount: amount,
        transactions: 1
      });
    }

    // Update total spent
    budget.totalSpent += amount;

    // Update the subject
    this.currentBudgetSubject.next({...budget});
  }
}