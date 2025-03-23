// src/app/components/home-page/home-page.component.ts
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment.prod';
import { BudgetService } from '../../services/budget.service';
import { CameraService } from '../../services/camera.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { PromotionService } from '../../services/promotions.service';
import { ReceiptProcessingService } from '../../services/receipt-processing.service';
import { SavedPromotionsService } from '../../services/saved-promotions.service';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit, OnDestroy {
  userName = 'User';
  monthlyExpenses = 0;
  showFullText = false;
  recentlySavedReceipt: any = null;
  matchingPromotions: any[] = [];
  isLoadingPromotions = false;
  userReceiptHistory: any[] = [];
  recommendedPromotions: any[] = [];
  isLoadingRecommendations = false;
  selectedPromotion: any = null;
  isLoadingBudget = false;
  fallbackPromotionsByCategory = [];
  showSuccessNotification = false;
  notificationTimeRemaining = 100;
  notificationTimer: any = null;
  successNotificationMessage: string = 'Receipt saved successfully!';
  savedPromotions: any[] = [];
  isLoadingSavedPromotions: boolean = false;
  showMoreSavedPromotions: boolean = false;
  savedPromotionsLimit: number = 3; // Default limit to show in homepage
  
  private subscriptions = new Subscription();
  private apiUrl = `${environment.apiUrl}`;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private promotionService: PromotionService,
    private budgetService: BudgetService,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionService: SavedPromotionsService,
    public cameraService: CameraService,
    public receiptProcessingService: ReceiptProcessingService
  ) {}

  ngOnInit(): void {
    // Load user data
    this.loadUserData();
    
    // Load user's receipt history when component initializes
    this.loadUserReceiptHistory();

    // Subscribe to savedPromotions observable
    this.subscriptions.add(
      this.savedPromotionService.savedPromotions$.subscribe(
        promotions => {
          this.savedPromotions = promotions;
        }
      )
    );
  
    // Initial load of saved promotions
    this.loadSavedPromotions();
    
    // Check for receipt processing state
    this.checkReceiptProcessingState();
    
    // Subscribe to receipt processing service for new receipts
    this.subscriptions.add(
      this.receiptProcessingService.recentlySavedReceipt$.subscribe(receipt => {
        if (receipt) {
          this.recentlySavedReceipt = receipt;
          
          // Update monthly expenses with the new receipt amount
          if (receipt.totalAmount) {
            this.monthlyExpenses += receipt.totalAmount;
          }
          
          // Refresh the recommended promotions as we have a new receipt
          this.loadUserReceiptHistory();
        }
      })
    );
    
    // Subscribe to success message changes
    this.subscriptions.add(
      this.receiptProcessingService.successMessage$.subscribe(message => {
        if (message) {
          this.successNotificationMessage = message;
          this.showNotification();
        }
      })
    );
    
    // Subscribe to matching promotions
    this.subscriptions.add(
      this.receiptProcessingService.matchingPromotions$.subscribe(promotions => {
        if (promotions && promotions.length > 0) {
          this.matchingPromotions = promotions;
          
          // Group promotions by category
          const groupedPromotions = this.receiptProcessingService.groupPromotionsByCategory(promotions);
          
          // Add each category group to recommendations
          groupedPromotions.forEach(group => {
            this.addPromotionsToRecommendations(group.name, group.deals);
          });
        }
      })
    );
  }

  ngOnDestroy() {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }

    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
  
  /**
   * Check for receipt processing state from router
   */
  private checkReceiptProcessingState(): void {
    // Check router state for receipt processing data
    const state = history.state;
    if (state?.fromReceiptProcessing) {
      console.log('Navigated from receipt processing, receipt ID:', state.savedReceiptId);
    }
  }
  
  private loadUserData(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser?.name) {
      this.userName = currentUser.name;
    }

    if (currentUser?.id) {
      this.isLoadingBudget = true;
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      this.budgetService.loadUserBudget(currentUser.id, currentMonth).subscribe({
        next: (budget) => this.monthlyExpenses = budget?.totalSpent || 0,
        error: (error) => console.error('Error loading budget data:', error),
        complete: () => this.isLoadingBudget = false
      });
    }
  }

  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  private loadSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.savedPromotions = [];
      return;
    }
  
    this.isLoadingSavedPromotions = true;
    this.savedPromotionService.getSavedPromotions(currentUser.id).subscribe({
      next: () => {
        this.isLoadingSavedPromotions = false;
      },
      error: (error) => {
        console.error('Error loading saved promotions:', error);
        this.isLoadingSavedPromotions = false;
      }
    });
  }
  
  /** Toggle show more/less saved promotions */
  toggleShowMoreSavedPromotions(): void {
    this.showMoreSavedPromotions = !this.showMoreSavedPromotions;
  }

  /** Get saved promotions to display based on limit */
  get displayedSavedPromotions(): any[] {
    return this.showMoreSavedPromotions 
      ? this.savedPromotions 
      : this.savedPromotions.slice(0, this.savedPromotionsLimit);
  }

  /** Check if a promotion is expiring soon (within 7 days) */
  isExpiringSoon(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return differenceInDays >= 0 && differenceInDays <= 7;
  }

  /** Check if a promotion has expired */
  hasExpired(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  }

  /** Format date for display */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  /** Load user's receipt history & fetch promotions */
  private loadUserReceiptHistory(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.getRecommendedPromotions([]);
      return;
    }

    this.isLoadingRecommendations = true;
    this.http.get<any[]>(`${this.apiUrl}/receipts/user/${currentUser.id}`).subscribe({
      next: (receipts) => {
        this.userReceiptHistory = receipts;
        const categories = this.analyzeReceiptHistory(receipts);
        this.getRecommendedPromotions(categories);
      },
      error: (error) => {
        console.error('Error fetching receipt history:', error);
        this.getRecommendedPromotions([]);
      }
    });
  }
  
  /** Analyze receipts & determine frequent categories */
  private analyzeReceiptHistory(receipts: any[]): string[] {
    const categoryCounts: Record<string, number> = {};
    receipts.forEach(({ category, merchantName, additionalFields }) => {
      const detectedCategory = category || additionalFields?.category || this.cameraService.determineCategoryFromMerchant(merchantName);
      if (detectedCategory) categoryCounts[detectedCategory] = (categoryCounts[detectedCategory] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  /** Fetch promotions based on category */
  private getRecommendedPromotions(categories: string[]): void {
    if (!categories.length) {
      this.recommendedPromotions = this.fallbackPromotionsByCategory;
      this.isLoadingRecommendations = false;
      return;
    }

    let completedRequests = 0;
    const categoryPromotions: any[] = [];

    categories.forEach(category => {
      this.promotionService.getPromotionsByCategory(category).subscribe({
        next: (promotions) => {
          if (promotions?.length) {
            categoryPromotions.push({ name: category, deals: promotions });
          }
        },
        complete: () => {
          if (++completedRequests === categories.length) {
            this.recommendedPromotions = categoryPromotions.length ? categoryPromotions : this.fallbackPromotionsByCategory;
            this.isLoadingRecommendations = false;
          }
        }
      });
    });
  }
  
  // Helper method to add promotions to recommendations
  addPromotionsToRecommendations(categoryName: string, promotions: any[]): void {
    // Check if this category already exists in recommendations
    const existingCategoryIndex = this.recommendedPromotions.findIndex(
      category => category.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (existingCategoryIndex >= 0) {
      // Category exists, merge promotions (avoiding duplicates)
      const existingDeals = this.recommendedPromotions[existingCategoryIndex].deals;
      const existingIds = new Set(existingDeals.map((deal: { id: any; promotionId: any; }) => deal.id || deal.promotionId));
      
      // Add only new promotions
      promotions.forEach(promo => {
        const promoId = promo.id || promo.promotionId;
        if (!existingIds.has(promoId)) {
          existingDeals.push(promo);
        }
      });
    } else {
      // Category doesn't exist, add it to the beginning for visibility
      this.recommendedPromotions.unshift({
        name: categoryName,
        deals: promotions
      });
    }
  }

  // Save a promotion
  // Update to savePromotion method in home-page.component.ts
savePromotion(promotion: any): void {
  const currentUser = this.getCurrentUser();
  if (!currentUser?.id) {
    this.router.navigate(['/login']);
    return;
  }
  
  // Check if already saved to avoid duplicates
  const alreadySaved = this.savedPromotions.some(p => p.id === promotion.id);
  if (alreadySaved) {
    this.successNotificationMessage = 'This promotion is already saved!';
    this.showNotification();
    return;
  }
  
  // Show loading state
  this.isLoadingSavedPromotions = true;
  
  this.savedPromotionService.savePromotion(currentUser.id, promotion.id).subscribe({
    next: () => {
      // Explicitly refresh the saved promotions list
      this.savedPromotionService.refreshUserSavedPromotions(currentUser.id);
      
      // Show success notification
      this.successNotificationMessage = 'Promotion saved successfully!';
      this.showNotification();
      
      // Close promotion details if open
      this.closePromotionDetails();
      this.isLoadingSavedPromotions = false;
    },
    error: (error) => {
      console.error('Error saving promotion:', error);
      this.isLoadingSavedPromotions = false;
      this.successNotificationMessage = 'Failed to save promotion. Please try again.';
      this.showNotification();
    }
  });
}
  
  // Remove a saved promotion
  removeSavedPromotion(promotionId: string): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return;
    
    if (!confirm('Are you sure you want to remove this promotion?')) {
      return;
    }
    
    // Show loading state
    this.isLoadingSavedPromotions = true;
    
    this.savedPromotionService.removePromotion(currentUser.id, promotionId).subscribe({
      next: () => {
        // savedPromotions will be updated via the subscription to savedPromotions$
        
        // Show success notification
        this.successNotificationMessage = 'Promotion removed!';
        this.showNotification();
        this.isLoadingSavedPromotions = false;
      },
      error: (error) => {
        console.error('Error removing promotion:', error);
        this.isLoadingSavedPromotions = false;
        this.successNotificationMessage = 'Failed to remove promotion. Please try again.';
        this.showNotification();
      }
    });
  }

  // View promotion details
  viewPromotionDetails(promotion: any) {
    this.selectedPromotion = promotion;
  }

  // Close promotion details modal
  closePromotionDetails() {
    this.selectedPromotion = null;
  }

  // Show notification
  showNotification() {
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;

    // Clear any existing timer
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }
    
    // Create timer that decreases the progress bar
    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;
      
      if (this.notificationTimeRemaining <= 0) {
        this.closeSuccessNotification();
      }
    }, 100); // Update every 100ms, will take ~5 seconds to complete
  }

  closeSuccessNotification() {
    this.showSuccessNotification = false;
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }

  // Toggle OCR full text
  toggleFullText() {
    this.showFullText = !this.showFullText;
  }
}