import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-budget-settings',
  standalone: false,
  templateUrl: './budget-settings.component.html',
  styleUrls: ['./budget-settings.component.css']
})
export class BudgetSettingsComponent implements OnInit {
  budgetForm: FormGroup;
  currentBudget: any = null;
  categories: any[] = [];
  
  isLoading = true;
  isSubmitting = false;
  
  successMessage = '';
  errorMessage = '';
  
  originalValues: Map<string, number> = new Map();

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private budgetService: BudgetService
  ) {
    this.budgetForm = this.formBuilder.group({
      totalBudget: [0, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadBudgetData();
  }

  private loadBudgetData(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.budgetService.loadUserBudget(currentUser.id).subscribe({
      next: (budget) => this.handleBudgetLoadSuccess(budget),
      error: (error) => this.handleBudgetLoadError(error)
    });
  }

  private handleBudgetLoadSuccess(budget: any): void {
    this.currentBudget = budget;
    this.categories = budget.categories;
    
    this.budgetForm.patchValue({ totalBudget: budget.totalBudget });
    this.originalValues.set('totalBudget', budget.totalBudget);
    
    this.setupCategoryControls();
    this.isLoading = false;
  }

  private handleBudgetLoadError(error: any): void {
    console.error('Error loading budget:', error);
    this.errorMessage = 'Failed to load budget data. Please try again.';
    this.isLoading = false;
  }

  private setupCategoryControls(): void {
    this.categories.forEach(category => {
      const controlName = `category_${category.category}`;
      
      this.budgetForm.addControl(
        controlName,
        this.formBuilder.control(category.budgetAmount, [Validators.required, Validators.min(0)])
      );
      
      this.originalValues.set(category.category, category.budgetAmount);
    });
  }

  saveBudget(): void {
    if (this.budgetForm.invalid) {
      this.errorMessage = 'Please correct the highlighted fields.';
      return;
    }

    this.resetMessages();
    this.isSubmitting = true;
    this.isLoading = true;

    const totalBudget = this.budgetForm.get('totalBudget')?.value;
    
    this.budgetService.setTotalBudget(totalBudget).subscribe({
      next: (budget) => this.updateCategoryBudgets(totalBudget),
      error: (error) => this.handleBudgetUpdateError(error)
    });
  }

  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private updateCategoryBudgets(totalBudget: number): void {
    const updatePromises = this.categories.map(category => {
      const controlName = `category_${category.category}`;
      const categoryBudget = this.budgetForm.get(controlName)?.value;
      return this.budgetService.setCategoryBudget(category.category, categoryBudget);
    });
    
    Promise.all(updatePromises).then(() => {
      this.handleUpdateSuccess(totalBudget);
    }).catch(error => {
      this.handleCategoryUpdateError(error);
    });
  }

  private handleUpdateSuccess(totalBudget: number): void {
    this.successMessage = 'Budget updated successfully!';
    this.isLoading = false;
    this.isSubmitting = false;
    
    this.updateOriginalValues(totalBudget);
    
    setTimeout(() => {
      this.router.navigate(['/expense-tracker']);
    }, 1500);
  }

  private updateOriginalValues(totalBudget: number): void {
    this.originalValues.set('totalBudget', totalBudget);
    this.categories.forEach(category => {
      const controlName = `category_${category.category}`;
      const categoryBudget = this.budgetForm.get(controlName)?.value;
      this.originalValues.set(category.category, categoryBudget);
    });
  }

  private handleBudgetUpdateError(error: any): void {
    console.error('Error updating total budget:', error);
    this.errorMessage = 'Failed to update budget. Please try again.';
    this.isLoading = false;
    this.isSubmitting = false;
  }

  private handleCategoryUpdateError(error: any): void {
    console.error('Error updating category budgets:', error);
    this.errorMessage = 'Failed to update category budgets. Please try again.';
    this.isLoading = false;
    this.isSubmitting = false;
  }

  calculatePercentage(categoryBudget: number): number {
    if (!this.currentBudget || this.currentBudget.totalBudget <= 0) return 0;
    return Math.round((categoryBudget / this.budgetForm.get('totalBudget')?.value) * 100);
  }

  onTotalBudgetChange(): void {
    if (!this.currentBudget) return;
    
    const newTotalBudget = this.budgetForm.get('totalBudget')?.value || 0;
    const oldTotalBudget = this.currentBudget.totalBudget;
    
    if (oldTotalBudget <= 0 || newTotalBudget <= 0) return;
    
    this.adjustCategoryBudgets(oldTotalBudget, newTotalBudget);
  }

  private adjustCategoryBudgets(oldTotalBudget: number, newTotalBudget: number): void {
    this.categories.forEach(category => {
      const controlName = `category_${category.category}`;
      const oldCategoryBudget = this.budgetForm.get(controlName)?.value || 0;
      const newCategoryBudget = (oldCategoryBudget / oldTotalBudget) * newTotalBudget;
      
      this.budgetForm.get(controlName)?.setValue(Math.round(newCategoryBudget * 100) / 100);
    });
  }

  goBack(): void {
    this.router.navigate(['/expense-tracker']);
  }
  
  // UI Helper Methods
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
    
    return '#607D8B';
  }
  
  getCategoryIcon(category: string): string {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('grocery') || lowerCategory.includes('groceries')) return '🛒';
    if (lowerCategory.includes('dining')) return '🍽️';
    if (lowerCategory.includes('fast food')) return '🍔';
    if (lowerCategory.includes('cafe')) return '☕';
    if (lowerCategory.includes('shopping')) return '🛍️';
    if (lowerCategory.includes('retail')) return '👕';
    if (lowerCategory.includes('health') || lowerCategory.includes('pharmacy')) return '💊';
    if (lowerCategory.includes('transportation')) return '🚗';
    if (lowerCategory.includes('entertainment')) return '🎬';
    
    return '💰';
  }
  
  hasChanged(categoryName: string): boolean {
    const currentValue = this.budgetForm.get(`category_${categoryName}`)?.value;
    const originalValue = this.originalValues.get(categoryName);
    
    return originalValue !== undefined && Math.abs(originalValue - currentValue) > 0.01;
  }
  
  getPercentageClass(percentage: number): string {
    if (percentage > 30) return 'high';
    if (percentage > 15) return 'medium';
    return 'low';
  }
  
  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  isRemainingLow(category: any): boolean {
    const budgetValue = this.budgetForm.get('category_' + category.category)?.value || 0;
    if (budgetValue <= 0) return false;
    
    const remaining = budgetValue - category.spentAmount;
    return remaining > 0 && remaining < (budgetValue * 0.2);
  }

  isRemainingNegative(category: any): boolean {
    const budgetValue = this.budgetForm.get('category_' + category.category)?.value || 0;
    return (budgetValue - category.spentAmount) < 0;
  }

  getSpentPercentage(category: any): number {
    const budgetValue = this.budgetForm.get('category_' + category.category)?.value || 0;
    if (budgetValue <= 0) return 0;
    
    const percentage = (category.spentAmount / budgetValue) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  }
  
  getRemainingAmount(category: any): number {
    const budgetValue = this.budgetForm.get('category_' + category.category)?.value || 0;
    return budgetValue - category.spentAmount;
  }
}