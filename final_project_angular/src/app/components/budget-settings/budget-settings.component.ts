// src/app/components/budget-settings/budget-settings.component.ts
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
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  categories: any[] = [];
  successMessage: string = '';
  errorMessage: string = '';
  originalValues: Map<string, number> = new Map();

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private budgetService: BudgetService
  ) {
    // Initialize form
    this.budgetForm = this.formBuilder.group({
      totalBudget: [0, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadBudgetData();
  }

  loadBudgetData(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.budgetService.loadUserBudget(currentUser.id).subscribe({
      next: (budget) => {
        this.currentBudget = budget;
        this.categories = budget.categories;
        
        // Set form values
        this.budgetForm.patchValue({
          totalBudget: budget.totalBudget
        });
        
        // Store original values for change detection
        this.originalValues.set('totalBudget', budget.totalBudget);
        
        // Add category form controls dynamically
        this.categories.forEach(category => {
          this.budgetForm.addControl(
            `category_${category.category}`,
            this.formBuilder.control(category.budgetAmount, [Validators.required, Validators.min(0)])
          );
          
          // Store original category budget values
          this.originalValues.set(category.category, category.budgetAmount);
        });
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading budget:', error);
        this.errorMessage = 'Failed to load budget data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // Save the budget
  saveBudget(): void {
    if (this.budgetForm.invalid) {
      this.errorMessage = 'Please correct the highlighted fields.';
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Get the new total budget
    const totalBudget = this.budgetForm.get('totalBudget')?.value;
    
    // Update the total budget first
    this.budgetService.setTotalBudget(totalBudget).subscribe({
      next: (budget) => {
        // Then update each category budget
        const updatePromises = this.categories.map(category => {
          const categoryBudget = this.budgetForm.get(`category_${category.category}`)?.value;
          return this.budgetService.setCategoryBudget(category.category, categoryBudget);
        });
        
        // Once all updates are done
        Promise.all(updatePromises).then(() => {
          this.successMessage = 'Budget updated successfully!';
          this.isLoading = false;
          this.isSubmitting = false;
          
          // Update original values for change detection
          this.originalValues.set('totalBudget', totalBudget);
          this.categories.forEach(category => {
            const categoryBudget = this.budgetForm.get(`category_${category.category}`)?.value;
            this.originalValues.set(category.category, categoryBudget);
          });
          
          // Navigate back to expense tracker
          setTimeout(() => {
            this.router.navigate(['/expense-tracker']);
          }, 1500);
        }).catch(error => {
          console.error('Error updating category budgets:', error);
          this.errorMessage = 'Failed to update category budgets. Please try again.';
          this.isLoading = false;
          this.isSubmitting = false;
        });
      },
      error: (error) => {
        console.error('Error updating total budget:', error);
        this.errorMessage = 'Failed to update budget. Please try again.';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
  }

  // Calculate the percentage of the total budget for a category
  calculatePercentage(categoryBudget: number): number {
    if (!this.currentBudget || this.currentBudget.totalBudget <= 0) return 0;
    return Math.round((categoryBudget / this.budgetForm.get('totalBudget')?.value) * 100);
  }

  // When total budget changes, recalculate all category budgets proportionally
  onTotalBudgetChange(): void {
    if (!this.currentBudget) return;
    
    const newTotalBudget = this.budgetForm.get('totalBudget')?.value || 0;
    const oldTotalBudget = this.currentBudget.totalBudget;
    
    if (oldTotalBudget <= 0 || newTotalBudget <= 0) return;
    
    // Update each category budget proportionally
    this.categories.forEach(category => {
      const oldCategoryBudget = this.budgetForm.get(`category_${category.category}`)?.value || 0;
      const newCategoryBudget = (oldCategoryBudget / oldTotalBudget) * newTotalBudget;
      
      this.budgetForm.get(`category_${category.category}`)?.setValue(
        Math.round(newCategoryBudget * 100) / 100 // Round to 2 decimal places
      );
    });
  }

  // Navigate back to expense tracker
  goBack(): void {
    this.router.navigate(['/expense-tracker']);
  }
  
  // Helper function to get category colors (match with expense tracker component)
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
  
  // Get appropriate icons for categories
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
    
    // Default icon
    return '💰';
  }
  
  // Check if a category value has changed from original
  hasChanged(categoryName: string): boolean {
    const currentValue = this.budgetForm.get(`category_${categoryName}`)?.value;
    const originalValue = this.originalValues.get(categoryName);
    
    return originalValue !== undefined && Math.abs(originalValue - currentValue) > 0.01;
  }
  
  // Get percentage class based on value
  getPercentageClass(percentage: number): string {
    if (percentage > 30) return 'high';
    if (percentage > 15) return 'medium';
    return 'low';
  }
  
  // Format number as currency
  formatCurrency(value: number): string {
    return value.toFixed(2);
  }
}