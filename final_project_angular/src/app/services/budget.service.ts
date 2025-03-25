// src/app/services/budget.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';

/**
 * Represents a category within a budget with spending metrics
 */
interface BudgetCategory {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  transactions: number;
}

/**
 * Represents a complete budget for a specific user and month
 */
interface Budget {
  id?: string;
  userId: string;
  monthYear: string; // Format: 'YYYY-MM'
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
}

/**
 * Type for category budget distribution
 */
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
  
  /**
   * Observable for the current active budget
   */
  readonly currentBudget$ = this.currentBudgetSubject.asObservable();

  /**
   * Default budget distribution across categories (percentages)
   * Actual defaults may be defined in backend
   */
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

  /**
   * Loads or initializes a user's budget for a specific month
   * @param userId The user's ID
   * @param monthYear Optional: Month in YYYY-MM format (defaults to current month)
   * @returns Observable with the loaded budget
   */
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

  /**
   * Gets the current budget for the user
   * @returns Observable with the current budget or null
   */
  getCurrentBudget(): Observable<Budget | null> {
    return this.currentBudget$;
  }

  /**
   * Adds a new expense to the current budget
   * @param receipt Receipt data containing category and amount
   * @returns Observable with the updated budget
   * @throws Error if budget is not initialized
   */
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

  /**
   * Sets a new total budget amount
   * @param amount The new total budget amount
   * @returns Observable with the updated budget
   * @throws Error if budget is not initialized
   */
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

  /**
   * Updates a specific category's budget amount
   * @param category The category name
   * @param amount The new budget amount for this category
   * @returns Observable with the updated budget
   * @throws Error if budget is not initialized
   */
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

  /**
   * Saves the entire budget object
   * @param budget The budget to save
   * @returns Observable with the saved budget
   */
  saveBudget(budget: Budget): Observable<Budget> {
    return this.http.post<Budget>(`${this.apiUrl}`, budget).pipe(
      tap(savedBudget => this.currentBudgetSubject.next(savedBudget)),
      catchError(error => {
        console.error('Error saving budget:', error);
        return of(budget);
      })
    );
  }

  /**
   * Creates an empty budget and saves it to the backend
   * @param userId The user's ID
   * @param monthYear The month in YYYY-MM format
   * @returns Observable with the created budget
   */
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

  /**
   * Creates a default budget locally when API fails
   * @param userId The user's ID
   * @param monthYear The month in YYYY-MM format
   * @returns The created budget
   */
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

  /**
   * Updates the budget locally when API calls fail
   * @param categoryName The category to update
   * @param amount The expense amount to add
   */
  private updateBudgetLocally(categoryName: string, amount: number): void {
    const budget = this.currentBudgetSubject.value;
    if (!budget) return;

    // Find the category (case-insensitive)
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

    // Update the subject with a new object to trigger change detection
    this.currentBudgetSubject.next({...budget});
  }

  /**
   * Gets the current budget or throws an error if not initialized
   * @returns The current budget
   * @throws Error if budget is not initialized
   */
  private getCurrentBudgetOrThrow(): Budget {
    const currentBudget = this.currentBudgetSubject.value;
    if (!currentBudget) {
      throw new Error('Budget not initialized. Call loadUserBudget first.');
    }
    return currentBudget;
  }

  /**
   * Gets the current month in YYYY-MM format
   * @returns Current month string
   */
  private getCurrentMonthYear(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}