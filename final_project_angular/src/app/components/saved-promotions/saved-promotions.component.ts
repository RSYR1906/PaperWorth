// src/app/components/saved-promotions/saved-promotions.component.ts
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
  isLoading = true;
  selectedPromotion: Promotion | null = null;
  errorMessage: string = '';
  errorType: 'general' | 'network' | 'server' = 'general';
  
  // Success notification variables
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  notificationTimer: any = null;
  
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
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionsService: SavedPromotionsService
  ) { }

  ngOnInit(): void {
    // Subscribe to loading state
    this.subscriptions.add(
      this.savedPromotionsService.loading$.subscribe(
        loading => {
          this.isLoading = loading;
        }
      )
    );
    
    // Subscribe to changes in savedPromotions$ from the service
    this.subscriptions.add(
      this.savedPromotionsService.savedPromotions$.subscribe(promotions => {
        console.log('Saved promotions component received promotions update:', promotions);
        if (promotions && Array.isArray(promotions)) {
          this.savedPromotions = promotions;
          this.filterPromotions();
        } else {
          console.error('Received non-array promotions data:', promotions);
          this.savedPromotions = [];
          this.filteredPromotions = [];
        }
        
        // If we're showing loading indicator and received promotions, stop showing it
        if (this.isLoading && this.savedPromotionsService.isInitialLoadComplete()) {
          this.isLoading = false;
        }
      })
    );
    
    // Load saved promotions (only if not already loaded)
    this.loadSavedPromotions();
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions and timers
    this.subscriptions.unsubscribe();
    
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }
  }
  
  // Load saved promotions for the current user
  loadSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Check if we already have saved promotions loaded
    if (this.savedPromotionsService.isInitialLoadComplete()) {
      // We already have data, just use what's in the service
      const currentPromotions = this.savedPromotionsService.getCurrentSavedPromotions();
      if (currentPromotions.length > 0) {
        console.log('Using cached saved promotions:', currentPromotions.length);
        this.savedPromotions = currentPromotions;
        this.filterPromotions();
        this.isLoading = false;
        return;
      }
    }
    
    // Need to fetch from API
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Fetching saved promotions from API');
    // Get saved promotions from the service
    this.subscriptions.add(
      this.savedPromotionsService.getSavedPromotions(currentUser.id).subscribe({
        next: (promotions) => {
          console.log('Successfully loaded saved promotions:', promotions?.length || 0);
          // savedPromotions will be updated via the subscription to savedPromotions$
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading saved promotions:', error);
          this.handleError(error);
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
    if (!this.savedPromotions || !Array.isArray(this.savedPromotions)) {
      console.error('savedPromotions is not an array:', this.savedPromotions);
      this.filteredPromotions = [];
      return;
    }
    
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
               (this.selectedCategory === 'health&beauty' && 
                (promoCategory === 'health&beauty' || promoCategory === 'healthandbeauty' || 
                 promoCategory === 'health' || promoCategory === 'beauty'));
      });
    }
    
    console.log(`Filtered promotions (${this.selectedCategory}):`, this.filteredPromotions.length);
  }
  
  // Get current user
  private getCurrentUser(): any {
    return this.firebaseAuthService.getCurrentUser() || 
           JSON.parse(localStorage.getItem('currentUser') || '{}');
  }
  
  // View promotion details
  viewPromotionDetails(promotion: Promotion): void {
    console.log('Viewing promotion details:', promotion);
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
    
    // Show loading state is handled by the service
    
    this.savedPromotionsService.removePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        // savedPromotions will be updated via the subscription to savedPromotions$
        
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
        this.handleError(error);
      }
    });
  }
  
  // Show notification
  showNotification(): void {
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;

    // Clear any existing timer
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }

    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;

      if (this.notificationTimeRemaining <= 0) {
        this.closeNotification();
      }
    }, 60);
  }
  
  // Close notification
  closeNotification(): void {
    this.showSuccessNotification = false;
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }
  
  // Check if a promotion is expiring soon (within 7 days)
  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return differenceInDays >= 0 && differenceInDays <= 7;
  }
  
  // Check if a promotion has expired
  hasExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  }
  
  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'No expiry date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }
  
  // Get time elapsed since promotion was saved
  getTimeElapsed(savedAt: string): string {
    if (!savedAt) return '';
    
    try {
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
    } catch (error) {
      console.error('Error calculating time elapsed:', error);
      return '';
    }
  }

  // Error handling method
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