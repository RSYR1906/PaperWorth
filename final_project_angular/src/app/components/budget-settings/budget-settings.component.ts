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
  categories: any[] = [];
  successMessage: string = '';
  errorMessage: string = '';

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
        
        // Add category form controls dynamically
        this.categories.forEach(category => {
          this.budgetForm.addControl(
            `category_${category.category}`,
            this.formBuilder.control(category.budgetAmount, [Validators.required, Validators.min(0)])
          );
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
          
          // Navigate back to expense tracker
          setTimeout(() => {
            this.router.navigate(['/expense-tracker']);
          }, 1500);
        }).catch(error => {
          console.error('Error updating category budgets:', error);
          this.errorMessage = 'Failed to update category budgets. Please try again.';
          this.isLoading = false;
        });
      },
      error: (error) => {
        console.error('Error updating total budget:', error);
        this.errorMessage = 'Failed to update budget. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // Calculate the percentage of the total budget for a category
  calculatePercentage(categoryBudget: number): number {
    if (!this.currentBudget || this.currentBudget.totalBudget <= 0) return 0;
    return Math.round((categoryBudget / this.currentBudget.totalBudget) * 100);
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
}