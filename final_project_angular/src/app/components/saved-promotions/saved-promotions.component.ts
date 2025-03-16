// src/app/components/saved-promotions/saved-promotions.component.ts
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Promotion } from '../../model';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { SavedPromotionsService } from '../../services/saved-promotions.service';

@Component({
  selector: 'app-saved-promotions',
  standalone: false,
  templateUrl: './saved-promotions.component.html',
  styleUrls: ['./saved-promotions.component.css']
})
export class SavedPromotionsComponent implements OnInit, OnDestroy {
  savedPromotions: Promotion[] = [];
  isLoading = false;
  selectedPromotion: Promotion | null = null;
  errorMessage: string = '';
  
  // Success notification variables
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  
  // Category filtering
  selectedCategory = 'all';
  categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'groceries', name: 'Groceries' },
    { id: 'retail', name: 'Retail' },
    { id: 'cafes', name: 'Cafes' },
    { id: 'dining', name: 'Dining' },
    { id: 'health&beauty', name: 'Health & Beauty' }
  ];
  
  filteredPromotions: Promotion[] = [];
  
  private subscriptions = new Subscription();
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionsService: SavedPromotionsService
  ) { }

  ngOnInit(): void {
    this.loadSavedPromotions();
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }
  
  // Load saved promotions for the current user
  loadSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.isLoading = true;
    
    // Get saved promotions from the service
    this.subscriptions.add(
      this.savedPromotionsService.getSavedPromotions(currentUser.id).subscribe({
        next: (promotions) => {
          this.savedPromotions = promotions;
          this.filterPromotions();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading saved promotions:', error);
          this.errorMessage = 'Failed to load saved promotions. Please try again.';
          this.isLoading = false;
        }
      })
    );
  }
  
  // Filter promotions by category
  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.filterPromotions();
  }
  
  // Filter promotions based on selected category
  private filterPromotions(): void {
    if (this.selectedCategory === 'all') {
      this.filteredPromotions = [...this.savedPromotions];
    } else {
      // Find the category name that matches the category ID
      const categoryName = this.categories.find(c => c.id === this.selectedCategory)?.name;
      
      // Filter promotions by the selected category
      this.filteredPromotions = this.savedPromotions.filter(promotion => {
        if (!promotion.category) return false;
        
        // Convert category names to comparable format for matching
        const promoCategory = promotion.category.toLowerCase().replace(/\s+/g, '');
        const selectedCategoryId = this.selectedCategory.toLowerCase();
        const selectedCategoryName = categoryName?.toLowerCase().replace(/\s+/g, '') || '';
        
        return promoCategory === selectedCategoryId || 
               promoCategory === selectedCategoryName ||
               (this.selectedCategory === 'health&beauty' && promoCategory === 'health&beauty');
      });
    }
  }
  
  // Get current user
  private getCurrentUser(): any {
    return this.firebaseAuthService.getCurrentUser() || 
           JSON.parse(localStorage.getItem('currentUser') || '{}');
  }
  
  // View promotion details
  viewPromotionDetails(promotion: Promotion): void {
    this.selectedPromotion = promotion;
  }
  
  // Close promotion details modal
  closePromotionDetails(): void {
    this.selectedPromotion = null;
  }
  
  // Remove promotion from saved list
  removePromotion(promotion: Promotion): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return;
    
    this.savedPromotionsService.removePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        // Remove from local array
        this.savedPromotions = this.savedPromotions.filter(p => p.id !== promotion.id);
        this.filterPromotions();
        
        // Close modal if it's the one being deleted
        if (this.selectedPromotion && this.selectedPromotion.id === promotion.id) {
          this.selectedPromotion = null;
        }
        
        // Show success notification
        this.successNotificationMessage = 'Promotion removed successfully';
        this.showNotification();
      },
      error: (error) => {
        console.error('Error removing promotion:', error);
        this.successNotificationMessage = 'Failed to remove promotion. Please try again.';
        this.showNotification();
      }
    });
  }
  
  // Show notification
  private showNotification(): void {
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;

    setTimeout(() => {
      this.showSuccessNotification = false;
    }, 3000);
  }
  
  // Check if a promotion is expiring soon (within 7 days)
  isExpiringSoon(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return differenceInDays >= 0 && differenceInDays <= 7;
  }
  
  // Check if a promotion has expired
  hasExpired(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  }
  
  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Get time elapsed since promotion was saved
  getTimeElapsed(savedAt: string): string {
    if (!savedAt) return '';
    
    const savedDate = new Date(savedAt);
    const now = new Date();
    const differenceInSeconds = Math.floor((now.getTime() - savedDate.getTime()) / 1000);
    
    if (differenceInSeconds < 60) {
      return 'Just now';
    } else if (differenceInSeconds < 3600) {
      const minutes = Math.floor(differenceInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (differenceInSeconds < 86400) {
      const hours = Math.floor(differenceInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(differenceInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }

  // Add to your component class
errorType: 'general' | 'network' | 'server' = 'general';

// Update your error handling method
handleError(error: any) {
  this.errorMessage = error.message || 'An unexpected error occurred';
  
  if (!navigator.onLine || error.status === 0) {
    this.errorType = 'network';
  } else if (error.status >= 500) {
    this.errorType = 'server';
  } else {
    this.errorType = 'general';
  }
}
}