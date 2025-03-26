// Cleaned and organized ExpenseTrackerComponent without removing any logic.

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment.prod';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-expense-tracker',
  standalone: false,
  templateUrl: './expense-tracker.component.html',
  styleUrls: ['./expense-tracker.component.css']
})
export class ExpenseTrackerComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  userName = '';
  currentMonth = '';
  isLoading = true;

  totalSpent = 0;
  monthlyBudget = 0;
  remainingBudget = 0;
  percentageUsed = 0;

  expenseCategories: any[] = [];
  monthlyHistory: { month: string; amount: number }[] = [];
  recentTransactions: any[] = [];
  savingsTrend: { month: string; saved: number; percentage: number }[] = [];

  constructor(
    private router: Router,
    private budgetService: BudgetService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser?.name) this.userName = currentUser.name;

    const now = new Date();
    this.currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (currentUser?.id) {
      this.loadUserData(currentUser.id);
    } else {
      console.log('No user logged in, redirecting to login page');
      this.router.navigate(['/login']);
    }
  }

  loadUserData(userId: string): void {
    this.isLoading = true;
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = this.getPreviousMonths(3);

    const budgetObservables = months.map(month =>
      this.budgetService.loadUserBudget(userId, month).pipe(
        catchError(error => {
          console.error(`Error loading budget for ${month}:`, error);
          return of({ userId, monthYear: month, totalBudget: 0, totalSpent: 0, categories: [] });
        })
      )
    );

    forkJoin(budgetObservables).subscribe({
      next: budgets => {
        const currentBudget = budgets.find(b => b.monthYear === currentMonthYear);
        if (currentBudget) this.processCurrentBudget(currentBudget);
        this.processBudgetHistory(budgets);
        this.loadRecentTransactions(userId);
        this.isLoading = false;
      },
      error: error => {
        console.error('Error loading user data:', error);
        this.isLoading = false;
      }
    });
  }

  processCurrentBudget(budget: any): void {
    this.totalSpent = budget.totalSpent;
    this.monthlyBudget = budget.totalBudget;
    this.remainingBudget = budget.totalBudget - budget.totalSpent;
    this.percentageUsed = this.monthlyBudget > 0
      ? Math.min(Math.round((this.totalSpent / this.monthlyBudget) * 100), 100)
      : 0;

    this.expenseCategories = budget.categories.map((category: any) => {
      // First get category budget if available
      const categoryBudget = category.budgetAmount || 0;
      
      return {
        name: category.category,
        amount: category.spentAmount,
        budget: categoryBudget,
        // Calculate percentage of category budget used (if budget exists)
        percentage: categoryBudget > 0
          ? Math.round((category.spentAmount / categoryBudget) * 100)
          : (this.totalSpent > 0 ? Math.round((category.spentAmount / this.totalSpent) * 100) : 0),
        color: this.getCategoryColor(category.category),
        icon: this.getCategoryIcon(category.category),
        transactions: category.transactions
      };
    }).sort((a: { amount: number; }, b: { amount: number; }) => b.amount - a.amount);
  }

  processBudgetHistory(budgets: any[]): void {
    budgets.sort((a, b) => a.monthYear.localeCompare(b.monthYear));

    this.monthlyHistory = budgets.map(budget => {
      const [year, month] = budget.monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return { month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), amount: budget.totalSpent };
    });

    this.savingsTrend = budgets.map(budget => {
      const [year, month] = budget.monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const saved = budget.totalBudget - budget.totalSpent;
      const percentage = budget.totalBudget > 0 ? Math.round((saved / budget.totalBudget) * 100) : 0;
      return { month: date.toLocaleDateString('en-US', { month: 'short' }), saved, percentage };
    });
  }

  loadRecentTransactions(userId: string): void {
    this.http.get<any[]>(`${this.apiUrl}/receipts/user/${userId}/recent`).pipe(
      catchError(error => {
        console.error('Error loading recent transactions:', error);
        return of([]);
      })
    ).subscribe({
      next: transactions => {
        this.recentTransactions = transactions.map(t => ({
          merchant: t.merchantName,
          category: t.category,
          amount: t.totalExpense,
          date: t.dateOfPurchase,
          icon: this.getCategoryIcon(t.category)
        }));
      },
      error: error => {
        console.error('Error processing transactions:', error);
        this.recentTransactions = [];
      }
    });
  }

  getChartBarHeight(amount: number): number {
    const maxAmount = Math.max(...this.monthlyHistory.map(m => m.amount));
    return maxAmount === 0 ? 10 : (amount / maxAmount) * 180;
  }

  getPreviousMonths(count: number): string[] {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }

  getCategoryIcon(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('grocery')) return '🛒';
    if (cat.includes('dining')) return '🍔';
    if (cat.includes('fast food')) return '🍟';
    if (cat.includes('cafe')) return '☕';
    if (cat.includes('retail')) return '👕';
    if (cat.includes('health') || cat.includes('pharmacy')) return '💊';
    return '💰';
  }

  getCategoryColor(category: string): string {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('grocery')) return '#4CAF50';
    if (cat.includes('dining')) return '#FF9800';
    if (cat.includes('fast food')) return '#F44336';
    if (cat.includes('cafe')) return '#795548';
    if (cat.includes('retail')) return '#3F51B5';
    if (cat.includes('health') || cat.includes('pharmacy')) return '#00BCD4';
    return '#607D8B';
  }

  getFormattedDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isBudgetAtRisk(): boolean {
    return this.percentageUsed > 80;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}