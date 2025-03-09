import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-expense-tracker',
  standalone: false,
  templateUrl: './expense-tracker.component.html',
  styleUrls: ['./expense-tracker.component.css']
})
export class ExpenseTrackerComponent implements OnInit {
  userName: string = 'Demo User';
  currentMonth: string = '';
  isLoading: boolean = true;
  
  // Budget overview
  totalSpent: number = 0;
  monthlyBudget: number = 0;
  remainingBudget: number = 0;
  percentageUsed: number = 0;
  
  // Expense categories
  expenseCategories: any[] = [];
  
  // Monthly spending history
  monthlyHistory: {month: string, amount: number}[] = [];
  
  // Recent transactions
  recentTransactions: any[] = [];
  
  // Monthly savings trends
  savingsTrend: {month: string, saved: number, percentage: number}[] = [];

  constructor(
    private router: Router,
    private budgetService: BudgetService
  ) { }

  ngOnInit(): void {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.name) {
      this.userName = currentUser.name;
    }
    
    // Set current month
    const now = new Date();
    this.currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Load budget data if user is logged in
    if (currentUser.id) {
      this.loadUserData(currentUser.id);
    } else {
      // If no user logged in, redirect to login
      console.log('No user logged in, redirecting to login page');
      this.router.navigate(['/login']);
    }
  }
  
  // Load all user data including budget history
  loadUserData(userId: string): void {
    this.isLoading = true;
    
    // Get the current month in YYYY-MM format
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Generate the past 6 months in YYYY-MM format
    const months = this.getPreviousMonths(6);
    
    // Create an array of budget loading observables for each month
    const budgetObservables = months.map(month => 
      this.budgetService.loadUserBudget(userId, month).pipe(
        catchError(error => {
          console.error(`Error loading budget for ${month}:`, error);
          // Return a placeholder empty budget on error
          return of({
            userId,
            monthYear: month,
            totalBudget: 0,
            totalSpent: 0,
            categories: []
          });
        })
      )
    );
    
    // Load all budgets in parallel
    forkJoin(budgetObservables).subscribe({
      next: (budgets) => {
        // Process the current month's budget
        const currentBudget = budgets.find(b => b.monthYear === currentMonthYear);
        if (currentBudget) {
          this.processCurrentBudget(currentBudget);
        }
        
        // Process all budgets for history
        this.processBudgetHistory(budgets);
        
        // Get sample transactions (in a real app, these would come from a receipts API)
        this.loadRecentTransactions(userId);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.isLoading = false;
      }
    });
  }
  
  // Process the current month's budget
  processCurrentBudget(budget: any): void {
    // Update budget overview
    this.totalSpent = budget.totalSpent;
    this.monthlyBudget = budget.totalBudget;
    this.remainingBudget = budget.totalBudget - budget.totalSpent;
    this.percentageUsed = this.monthlyBudget > 0 
      ? Math.min(Math.round((this.totalSpent / this.monthlyBudget) * 100), 100)
      : 0;
    
    // Update expense categories
    this.expenseCategories = budget.categories.map((category: any) => {
      // Determine icon based on category name
      const icon = this.getCategoryIcon(category.category);
      
      // Determine color based on category name
      const color = this.getCategoryColor(category.category);
      
      return {
        name: category.category,
        amount: category.spentAmount,
        percentage: category.spentAmount > 0 && this.totalSpent > 0
          ? Math.round((category.spentAmount / this.totalSpent) * 100)
          : 0,
        color: color,
        icon: icon,
        transactions: category.transactions
      };
    });
    
    // Sort categories by amount spent (descending)
    this.expenseCategories.sort((a, b) => b.amount - a.amount);
  }
  
  // Process budget history for charts
  processBudgetHistory(budgets: any[]): void {
    // Sort budgets by month (oldest first)
    budgets.sort((a, b) => a.monthYear.localeCompare(b.monthYear));
    
    // Prepare monthly history data
    this.monthlyHistory = budgets.map(budget => {
      // Convert YYYY-MM to Month Year format
      const [year, month] = budget.monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      return {
        month: monthName,
        amount: budget.totalSpent
      };
    });
    
    // Prepare savings trend data
    this.savingsTrend = budgets.map(budget => {
      // Convert YYYY-MM to short month format
      const [year, month] = budget.monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' });
      
      const saved = budget.totalBudget - budget.totalSpent;
      const percentage = budget.totalBudget > 0 
        ? Math.round((saved / budget.totalBudget) * 100) 
        : 0;
      
      return {
        month: monthAbbr,
        saved: saved,
        percentage: percentage
      };
    });
  }
  
  // Load recent transactions
  loadRecentTransactions(userId: string): void {
    // In a real app, you would call a receipts API to get recent transactions
    // For now, we'll use sample data
    this.recentTransactions = [
      { 
        merchant: 'Cold Storage', 
        category: 'Groceries', 
        amount: 87.50, 
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        icon: this.getCategoryIcon('Groceries')
      },
      { 
        merchant: 'Starbucks', 
        category: 'Cafes', 
        amount: 15.80, 
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        icon: this.getCategoryIcon('Cafes')
      },
      { 
        merchant: 'McDonalds', 
        category: 'Fast Food', 
        amount: 22.40, 
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        icon: this.getCategoryIcon('Fast Food')
      },
      { 
        merchant: 'Uniqlo', 
        category: 'Shopping', 
        amount: 159.90, 
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        icon: this.getCategoryIcon('Shopping')
      },
      { 
        merchant: 'Guardian Pharmacy', 
        category: 'Healthcare', 
        amount: 42.25, 
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        icon: this.getCategoryIcon('Healthcare')
      }
    ];
  }
  
  // Helper function to get previous N months in YYYY-MM format
  getPreviousMonths(count: number): string[] {
    const months: string[] = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
    }
    
    return months;
  }
  
  // Helper function to get category icons
  getCategoryIcon(category: string): string {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('grocery') || lowerCategory.includes('groceries')) return '🛒';
    if (lowerCategory.includes('dining')) return '🍔';
    if (lowerCategory.includes('fast food')) return '🍟';
    if (lowerCategory.includes('cafe')) return '☕';
    if (lowerCategory.includes('shopping')) return '🛍️';
    if (lowerCategory.includes('retail')) return '👕';
    if (lowerCategory.includes('health') || lowerCategory.includes('pharmacy')) return '💊';
    if (lowerCategory.includes('transportation')) return '🚗';
    if (lowerCategory.includes('entertainment')) return '🎬';
    
    // Default icon
    return '💰';
  }
  
  // Helper function to get category colors
  getCategoryColor(category: string): string {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('grocery') || lowerCategory.includes('groceries')) return '#4CAF50';
    if (lowerCategory.includes('dining')) return '#FF9800';
    if (lowerCategory.includes('fast food')) return '#F44336';
    if (lowerCategory.includes('cafe')) return '#795548';
    if (lowerCategory.includes('shopping')) return '#2196F3';
    if (lowerCategory.includes('retail')) return '#3F51B5';
    if (lowerCategory.includes('health') || lowerCategory.includes('pharmacy')) return '#00BCD4';
    if (lowerCategory.includes('transportation')) return '#9C27B0';
    if (lowerCategory.includes('entertainment')) return '#E91E63';
    
    // Default color
    return '#607D8B';
  }
  
  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
  
  // Helper function for formatting dates
  getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Helper function to determine if budget is at risk
  isBudgetAtRisk(): boolean {
    return this.percentageUsed > 80;
  }
}