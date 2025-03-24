// src/app/stores/homepage.store.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';

import { BudgetService } from '../services/budget.service';
import { CameraService } from '../services/camera.service';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { PromotionService } from '../services/promotions.service';
import { ReceiptProcessingService } from '../services/receipt-processing.service';
import { SavedPromotionsService } from '../services/saved-promotions.service';

// Define the state interface
export interface HomePageState {
  userName: string;
  monthlyExpenses: number;
  userReceiptHistory: any[];
  recommendedPromotions: any[];
  savedPromotions: any[];
  matchingPromotions: any[];
  recentlySavedReceipt: any | null;
  selectedPromotion: any | null;
  showSuccessNotification: boolean;
  successNotificationMessage: string;
  notificationTimeRemaining: number;
  showFullText: boolean;
  isLoading: {
    budget: boolean;
    receipts: boolean;
    promotions: boolean;
    savedPromotions: boolean;
  };
  showMoreSavedPromotions: boolean;
  savedPromotionsLimit: number;
}

@Injectable()
export class HomePageStore extends ComponentStore<HomePageState> {
  private apiUrl = `${environment.apiUrl}`;
  private notificationTimer: any = null;

  constructor(
    private http: HttpClient,
    private budgetService: BudgetService,
    private cameraService: CameraService,
    private firebaseAuthService: FirebaseAuthService,
    private promotionService: PromotionService,
    private savedPromotionService: SavedPromotionsService,
    private receiptProcessingService: ReceiptProcessingService
  ) {
    // Initialize the state
    super({
      userName: 'User',
      monthlyExpenses: 0,
      userReceiptHistory: [],
      recommendedPromotions: [],
      savedPromotions: [],
      matchingPromotions: [],
      recentlySavedReceipt: null,
      selectedPromotion: null,
      showSuccessNotification: false,
      successNotificationMessage: '',
      notificationTimeRemaining: 100,
      showFullText: false,
      isLoading: {
        budget: false,
        receipts: false,
        promotions: false,
        savedPromotions: false
      },
      showMoreSavedPromotions: false,
      savedPromotionsLimit: 3
    });

    // Subscribe to receipt processing service for new receipts
    this.receiptProcessingService.recentlySavedReceipt$.subscribe(receipt => {
      if (receipt) {
        this.updateRecentlySavedReceipt(receipt);
        
        // Update monthly expenses with the new receipt amount
        if (receipt.totalAmount) {
          this.patchState(state => ({
            monthlyExpenses: state.monthlyExpenses + receipt.totalAmount
          }));
        }
        
        // Refresh the recommended promotions as we have a new receipt
        this.loadUserReceiptHistory();
      }
    });
    
    // Subscribe to success message changes
    this.receiptProcessingService.successMessage$.subscribe(message => {
      if (message) {
        this.showNotification(message);
        // Clear the message in the service so it won't show again on next navigation
        this.receiptProcessingService.resetSuccessMessage();
      }
    });
    
    // Subscribe to matching promotions
    this.receiptProcessingService.matchingPromotions$.subscribe(promotions => {
      if (promotions && promotions.length > 0) {
        this.patchState({ matchingPromotions: promotions });
        
        // Group promotions by category
        const groupedPromotions = this.receiptProcessingService.groupPromotionsByCategory(promotions);
        
        // Add each category group to recommendations
        groupedPromotions.forEach(group => {
          this.addPromotionsToRecommendations(group.name, group.deals);
        });
      }
    });

    // Subscribe to savedPromotions observable
    this.savedPromotionService.savedPromotions$.subscribe(
      promotions => {
        this.patchState({ savedPromotions: promotions });
      }
    );
  }

  // Selectors
  readonly userName$ = this.select(state => state.userName);
  readonly monthlyExpenses$ = this.select(state => state.monthlyExpenses);
  readonly userReceiptHistory$ = this.select(state => state.userReceiptHistory);
  readonly recommendedPromotions$ = this.select(state => state.recommendedPromotions);
  readonly savedPromotions$ = this.select(state => state.savedPromotions);
  readonly matchingPromotions$ = this.select(state => state.matchingPromotions);
  readonly recentlySavedReceipt$ = this.select(state => state.recentlySavedReceipt);
  readonly selectedPromotion$ = this.select(state => state.selectedPromotion);
  readonly showSuccessNotification$ = this.select(state => state.showSuccessNotification);
  readonly successNotificationMessage$ = this.select(state => state.successNotificationMessage);
  readonly notificationTimeRemaining$ = this.select(state => state.notificationTimeRemaining);
  readonly showFullText$ = this.select(state => state.showFullText);
  readonly isLoading$ = this.select(state => state.isLoading);
  readonly showMoreSavedPromotions$ = this.select(state => state.showMoreSavedPromotions);
  readonly savedPromotionsLimit$ = this.select(state => state.savedPromotionsLimit);

  // Computed selector for displayed saved promotions
  readonly displayedSavedPromotions$ = this.select(
    this.savedPromotions$,
    this.showMoreSavedPromotions$,
    this.savedPromotionsLimit$,
    (savedPromotions, showMore, limit) => {
      return showMore ? savedPromotions : savedPromotions.slice(0, limit);
    }
  );

    // Helper selector to check if a promotion is saved
    readonly isSaved = (promotion: any) => this.select(
        this.savedPromotions$,
        (savedPromotions) => savedPromotions.some(p => p.id === promotion.id)
    );

  // Updaters
  readonly updateUserName = this.updater((state, userName: string) => ({
    ...state,
    userName
  }));

  readonly updateMonthlyExpenses = this.updater((state, monthlyExpenses: number) => ({
    ...state,
    monthlyExpenses
  }));

  readonly updateRecentlySavedReceipt = this.updater((state, receipt: any) => ({
    ...state,
    recentlySavedReceipt: receipt
  }));

  readonly updateSelectedPromotion = this.updater((state, promotion: any) => ({
    ...state,
    selectedPromotion: promotion
  }));

  readonly toggleShowMoreSavedPromotions = this.updater((state) => ({
    ...state,
    showMoreSavedPromotions: !state.showMoreSavedPromotions
  }));

  readonly toggleShowFullText = this.updater((state) => ({
    ...state,
    showFullText: !state.showFullText
  }));

  readonly closeSuccessNotification = this.updater((state) => {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }
    
    return {
      ...state,
      showSuccessNotification: false,
      successNotificationMessage: ''
    };
  });

  readonly updateNotificationTimeRemaining = this.updater((state, timeRemaining: number) => ({
    ...state,
    notificationTimeRemaining: timeRemaining
  }));

  // Effects
  readonly loadUserData = this.effect((trigger$) => {
    return trigger$.pipe(
      switchMap(() => {
        const currentUser = this.getCurrentUser();
        
        if (currentUser?.name) {
          this.updateUserName(currentUser.name);
        }
        
        if (!currentUser?.id) {
          return of(null);
        }
        
        this.patchState(state => ({
          isLoading: { ...state.isLoading, budget: true }
        }));
        
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        return this.budgetService.loadUserBudget(currentUser.id, currentMonth).pipe(
          tap((budget) => {
            this.updateMonthlyExpenses(budget?.totalSpent || 0);
            this.patchState(state => ({
              isLoading: { ...state.isLoading, budget: false }
            }));
          }),
          catchError((error) => {
            console.error('Error loading budget data:', error);
            this.patchState(state => ({
              isLoading: { ...state.isLoading, budget: false }
            }));
            return of(null); // Return a value to keep the stream alive
          })
        );
      })
    );
  });

  readonly loadSavedPromotions = this.effect((trigger$) => {
    return trigger$.pipe(
      switchMap(() => {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser?.id) {
          return of([]);
        }
        
        this.patchState(state => ({
          isLoading: { ...state.isLoading, savedPromotions: true }
        }));
        
        return this.savedPromotionService.getSavedPromotions(currentUser.id).pipe(
          tap(() => {
            this.patchState(state => ({
              isLoading: { ...state.isLoading, savedPromotions: false }
            }));
          }),
          catchError((error) => {
            console.error('Error loading saved promotions:', error);
            this.patchState(state => ({
              isLoading: { ...state.isLoading, savedPromotions: false }
            }));
            return of([]); // Return empty array to keep the stream alive
          })
        );
      })
    );
  });

  readonly loadUserReceiptHistory = this.effect((trigger$) => {
    return trigger$.pipe(
      switchMap(() => {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser?.id) {
          return of([]);
        }
        
        this.patchState(state => ({
          isLoading: { ...state.isLoading, receipts: true }
        }));
        
        return this.http.get<any[]>(`${this.apiUrl}/receipts/user/${currentUser.id}`).pipe(
          tap((receipts) => {
            this.patchState({ userReceiptHistory: receipts });
            const categories = this.analyzeReceiptHistory(receipts);
            this.loadRecommendedPromotions(categories);
          }),
          catchError((error) => {
            console.error('Error fetching receipt history:', error);
            this.loadRecommendedPromotions([]);
            this.patchState(state => ({
              isLoading: { ...state.isLoading, receipts: false }
            }));
            return of([]); // Return empty array to keep the stream alive
          })
        );
      })
    );
  });

  readonly savePromotion = this.effect((promotionId$: Observable<string>) => {
    return promotionId$.pipe(
      withLatestFrom(this.savedPromotions$),
      switchMap(([promotionId, savedPromotions]) => {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser?.id) {
          // Handle redirection to login in the component
          return of(null);
        }
        
        // Check if already saved to avoid duplicates
        const alreadySaved = savedPromotions.some(p => p.id === promotionId);
        if (alreadySaved) {
          this.showNotification('This promotion is already saved!');
          this.updateSelectedPromotion(null);
          return of(null);
        }
        
        this.patchState(state => ({
          isLoading: { ...state.isLoading, savedPromotions: true }
        }));
        
        return this.savedPromotionService.savePromotion(currentUser.id, promotionId).pipe(
          tap(() => {
            // Explicitly refresh the saved promotions list to ensure updates propagate
            this.savedPromotionService.refreshUserSavedPromotions(currentUser.id);
            
            // Show success notification
            this.showNotification('Promotion saved successfully!');
            
            // Close promotion details
            this.updateSelectedPromotion(null);
            
            this.patchState(state => ({
              isLoading: { ...state.isLoading, savedPromotions: false }
            }));
          }),
          catchError((error) => {
            console.error('Error saving promotion:', error);
            this.showNotification('Failed to save promotion. Please try again.');
            this.patchState(state => ({
              isLoading: { ...state.isLoading, savedPromotions: false }
            }));
            return of(null); // Return a value to keep the stream alive
          })
        );
      })
    );
  });

  readonly removeSavedPromotion = this.effect((promotionId$: Observable<string>) => {
    return promotionId$.pipe(
      switchMap((promotionId) => {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser?.id) {
          return of(null);
        }
        
        this.patchState(state => ({
          isLoading: { ...state.isLoading, savedPromotions: true }
        }));
        
        return this.savedPromotionService.removePromotion(currentUser.id, promotionId).pipe(
          tap(() => {
            // Show success notification
            this.showNotification('Promotion removed!');
            
            this.patchState(state => ({
              isLoading: { ...state.isLoading, savedPromotions: false }
            }));
          }),
          catchError((error) => {
            console.error('Error removing promotion:', error);
            this.showNotification('Failed to remove promotion. Please try again.');
            this.patchState(state => ({
              isLoading: { ...state.isLoading, savedPromotions: false }
            }));
            return of(null); // Return a value to keep the stream alive
          })
        );
      })
    );
  });

  // Helper Methods
  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || 
           JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  // Analyze receipts & determine frequent categories
  private analyzeReceiptHistory(receipts: any[]): string[] {
    const categoryCounts: Record<string, number> = {};
    receipts.forEach(({ category, merchantName, additionalFields }) => {
      const detectedCategory = category || additionalFields?.category || 
                              this.cameraService.determineCategoryFromMerchant(merchantName);
      if (detectedCategory) {
        categoryCounts[detectedCategory] = (categoryCounts[detectedCategory] || 0) + 1;
      }
    });

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  private loadRecommendedPromotions(categories: string[]): void {
    this.patchState(state => ({
      isLoading: { ...state.isLoading, promotions: true }
    }));

    if (!categories.length) {
      this.patchState({
        recommendedPromotions: [],
        isLoading: { ...this.get().isLoading, promotions: false }
      });
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
            this.patchState({
              recommendedPromotions: categoryPromotions,
              isLoading: { ...this.get().isLoading, promotions: false }
            });
          }
        }
      });
    });
  }

  // Helper method to add promotions to recommendations
  private addPromotionsToRecommendations(categoryName: string, promotions: any[]): void {
    const state = this.get();
    const recommendedPromotions = [...state.recommendedPromotions];
    
    // Check if this category already exists in recommendations
    const existingCategoryIndex = recommendedPromotions.findIndex(
      category => category.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (existingCategoryIndex >= 0) {
      // Category exists, merge promotions (avoiding duplicates)
      const existingDeals = recommendedPromotions[existingCategoryIndex].deals;
      const existingIds = new Set(existingDeals.map((deal: { id: any; promotionId: any; }) => 
        deal.id || deal.promotionId
      ));
      
      // Add only new promotions
      promotions.forEach(promo => {
        const promoId = promo.id || promo.promotionId;
        if (!existingIds.has(promoId)) {
          existingDeals.push(promo);
        }
      });
      
      recommendedPromotions[existingCategoryIndex].deals = existingDeals;
    } else {
      // Category doesn't exist, add it to the beginning for visibility
      recommendedPromotions.unshift({
        name: categoryName,
        deals: promotions
      });
    }
    
    this.patchState({ recommendedPromotions });
  }

  // Show notification with countdown timer
  private showNotification(message: string): void {
    if (!message) return;
    
    this.patchState({
      showSuccessNotification: true,
      successNotificationMessage: message,
      notificationTimeRemaining: 100
    });
    
    // Clear any existing timer
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    
    // Set new timer to auto-close notification
    this.notificationTimer = setTimeout(() => {
      this.closeSuccessNotification();
    }, 5000);
    
    // Start progress bar countdown
    let remaining = 100;
    const progressInterval = setInterval(() => {
      remaining -= 2;
      this.updateNotificationTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  // Utility methods for components to use
  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return differenceInDays >= 0 && differenceInDays <= 7;
  }

  hasExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}