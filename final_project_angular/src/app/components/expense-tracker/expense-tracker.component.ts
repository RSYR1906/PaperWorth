import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-expense-tracker',
  standalone: false,
  templateUrl: './expense-tracker.component.html',
  styleUrls: ['./expense-tracker.component.css']
})
export class ExpenseTrackerComponent implements OnInit {
  userName: string = 'Demo User';
  currentMonth: string = 'March 2025';
  
  // Monthly spending summary
  totalSpent: number = 1248.75;
  monthlyBudget: number = 1500.00;
  remainingBudget: number = 251.25;
  percentageUsed: number = 83;
  
  // Expense categories
  expenseCategories = [
    { 
      name: 'Groceries', 
      amount: 425.80, 
      percentage: 34, 
      color: '#4CAF50',
      icon: '🛒',
      transactions: 8
    },
    { 
      name: 'Dining', 
      amount: 312.60, 
      percentage: 25, 
      color: '#FF9800',
      icon: '🍔',
      transactions: 14
    },
    { 
      name: 'Shopping', 
      amount: 289.75, 
      percentage: 23, 
      color: '#2196F3',
      icon: '🛍️',
      transactions: 5
    },
    { 
      name: 'Transportation', 
      amount: 124.35, 
      percentage: 10, 
      color: '#9C27B0',
      icon: '🚗',
      transactions: 6
    },
    { 
      name: 'Entertainment', 
      amount: 96.25, 
      percentage: 8, 
      color: '#F44336',
      icon: '🎬',
      transactions: 3
    }
  ];
  
  // Monthly spending history
  monthlyHistory = [
    { month: 'October 2024', amount: 1356.20 },
    { month: 'November 2024', amount: 1502.45 },
    { month: 'December 2024', amount: 1845.30 },
    { month: 'January 2025', amount: 1280.15 },
    { month: 'February 2025', amount: 1325.80 },
    { month: 'March 2025', amount: 1248.75 }
  ];
  
  // Recent transactions
  recentTransactions = [
    { 
      merchant: 'Cold Storage', 
      category: 'Groceries', 
      amount: 87.50, 
      date: '2025-03-01T13:45:00',
      icon: '🛒'
    },
    { 
      merchant: 'Starbucks', 
      category: 'Dining', 
      amount: 15.80, 
      date: '2025-02-28T09:15:00',
      icon: '☕'
    },
    { 
      merchant: 'McDonalds', 
      category: 'Dining', 
      amount: 22.40, 
      date: '2025-02-27T19:30:00',
      icon: '🍔'
    },
    { 
      merchant: 'Uniqlo', 
      category: 'Shopping', 
      amount: 159.90, 
      date: '2025-02-25T14:20:00',
      icon: '👕'
    },
    { 
      merchant: 'Guardian Pharmacy', 
      category: 'Healthcare', 
      amount: 42.25, 
      date: '2025-02-22T11:10:00',
      icon: '💊'
    }
  ];
  
  // Monthly savings trends
  savingsTrend = [
    { month: 'Oct', saved: 143.80, percentage: 10 },
    { month: 'Nov', saved: 97.55, percentage: 6 },
    { month: 'Dec', saved: -145.30, percentage: -8 },
    { month: 'Jan', saved: 219.85, percentage: 15 },
    { month: 'Feb', saved: 174.20, percentage: 12 },
    { month: 'Mar', saved: 251.25, percentage: 17 }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    // In a real app, you would fetch data from a service
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