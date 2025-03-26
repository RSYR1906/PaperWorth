import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment.prod';
import { Promotion } from '../../model';
import { BudgetService } from '../../services/budget.service';
import { CameraService } from '../../services/camera.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { PromotionService } from '../../services/promotions.service';
import { ReceiptProcessingService } from '../../services/receipt-processing.service';
import { SavedPromotionsService } from '../../services/saved-promotions.service';
import { CategoryRecommendation, RecommendedPromotionsStore } from '../../stores/recommended-promotions.state';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit, OnDestroy {
  userName: string = 'User';
  monthlyExpenses: number = 0;
  savedPromotions: Promotion[] = [];
  displayedSavedPromotions: Promotion[] = [];
  selectedPromotion: Promotion | null = null;
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  isLoading = {
    budget: false,
    savedPromotions: false
  };
  showMoreSavedPromotions = false;
  savedPromotionsLimit = 3;
  private notificationTimer: any = null;
  private subscriptions = new Subscription();
  
  // Observable streams from the store
  recommendedPromotions$: Observable<CategoryRecommendation[]>;
  isLoadingRecommendations$: Observable<boolean>;
  errorRecommendations$: Observable<string | null>;
  hasRecommendations$: Observable<boolean>;

  constructor(
    private router: Router,
    public cameraService: CameraService,
    public receiptProcessingService: ReceiptProcessingService,
    private savedPromotionsService: SavedPromotionsService,
    private budgetService: BudgetService,
    private firebaseAuthService: FirebaseAuthService,
    private promotionService: PromotionService,
    private http: HttpClient,
    // Inject the store in the constructor
    private recommendedStore: RecommendedPromotionsStore
  ) {
    // Initialize observable streams from the store
    this.recommendedPromotions$ = this.recommendedStore.recommendedPromotions$;
    this.isLoadingRecommendations$ = this.recommendedStore.isLoading$;
    this.errorRecommendations$ = this.recommendedStore.error$;
    this.hasRecommendations$ = this.recommendedStore.hasRecommendations$;
  }

  ngOnInit(): void {
    const currentUser = this.firebaseAuthService.getCurrentUser();
    if (currentUser?.name) this.userName = currentUser.name;

    // Initial data loading
    this.loadBudget();
    this.loadSavedPromotions();
    this.loadReceiptHistory();
    
    // Subscribe to receipt saved events to refresh saved promotions
    this.subscriptions.add(
      this.receiptProcessingService.receiptSaved
        .pipe(
          filter(userId => {
            const currentUserId = this.firebaseAuthService.getCurrentUser()?.id;
            console.log('Receipt event received for userId:', userId, 'Current userId:', currentUserId);
            return !!userId && userId === currentUserId;
          })
        )
        .subscribe(this.handleReceiptSaved.bind(this))
    );
    
    // Check if we navigated from receipt processing
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state && navigation.extras.state['fromReceiptProcessing']) {
      const receiptId = navigation.extras.state['savedReceiptId'];
      const userId = this.firebaseAuthService.getCurrentUser()?.id;
      console.log('Navigated from receipt processing with receipt ID:', receiptId);
      
      if (userId) {
        // Force refresh data from server since we just processed a receipt
        setTimeout(() => {
          this.refreshAllData(userId);
        }, 500);
      }
    }
  }
  
  /**
   * Handles receipt saved event by refreshing all data
   * This will work regardless of whether we're on the homepage or just navigated to it
   */
  handleReceiptSaved(userId: string): void {
    console.log('⭐ Receipt saved event captured, refreshing all data for user:', userId);
    
    // Force a delay to ensure navigation has completed
    setTimeout(() => {
      this.refreshAllData(userId);
      
      // Show notification about refreshed data
      this.showNotification('Data refreshed with your latest receipt!');
    }, 300);
  }
  
  /**
   * Refreshes all data for the user
   * Can be called from ngOnInit or from receipt event handler
   */
  refreshAllData(userId: string): void {
    console.log('Refreshing all data for user:', userId);
    
    // Use the existing method to refresh promotions
    this.savedPromotionsService.refreshUserSavedPromotions(userId);
    this.loadBudget();
    this.loadReceiptHistory();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearNotificationTimer();
  }

  loadBudget(): void {
    const currentUser = this.firebaseAuthService.getCurrentUser();
    if (!currentUser?.id) return;
    this.isLoading.budget = true;
    const currentMonth = new Date().toISOString().slice(0, 7);
    this.subscriptions.add(
      this.budgetService.loadUserBudget(currentUser.id, currentMonth).subscribe({
        next: (budget) => {
          this.monthlyExpenses = budget?.totalSpent || 0;
          this.isLoading.budget = false;
        },
        error: () => (this.isLoading.budget = false)
      })
    );
  }

  loadSavedPromotions(): void {
    const currentUser = this.firebaseAuthService.getCurrentUser();
    if (!currentUser?.id) return;
    
    this.isLoading.savedPromotions = true;
    console.log('Loading saved promotions for user:', currentUser.id);
    
    // Subscribe to both the one-time call and the observable stream
    this.subscriptions.add(
      this.savedPromotionsService.getSavedPromotions(currentUser.id).subscribe({
        next: (promotions) => {
          console.log('Initial saved promotions loaded:', promotions.length);
          this.savedPromotions = promotions;
          this.displayedSavedPromotions = this.showMoreSavedPromotions 
            ? promotions 
            : promotions.slice(0, this.savedPromotionsLimit);
          this.isLoading.savedPromotions = false;
        },
        error: (error) => {
          console.error('Error loading saved promotions:', error);
          this.isLoading.savedPromotions = false;
        }
      })
    );
    
    // Also subscribe to the stream to get updates
    this.subscriptions.add(
      this.savedPromotionsService.savedPromotions$.subscribe(promotions => {
        console.log('Saved promotions stream updated:', promotions.length);
        this.savedPromotions = promotions;
        this.displayedSavedPromotions = this.showMoreSavedPromotions 
          ? promotions 
          : promotions.slice(0, this.savedPromotionsLimit);
      })
    );
  }

  loadReceiptHistory(): void {
    const currentUser = this.firebaseAuthService.getCurrentUser();
    if (!currentUser?.id) return;
    
    console.log('Loading receipt history for user:', currentUser.id);
    // Fetch receipts from API
    this.http.get<any[]>(`${environment.apiUrl}/receipts/user/${currentUser.id}`).subscribe({
      next: (receipts) => {
        console.log('Receipts loaded:', receipts.length);
        // Use the store to process receipts and load recommendations
        this.recommendedStore.processReceiptHistory(receipts);
      },
      error: (error) => {
        console.error('Error loading receipts:', error);
        // If no receipts are available, load some default categories
        this.loadDefaultRecommendations();
      }
    });
  }

  loadDefaultRecommendations(): void {
    // Fallback categories if no receipt history is available
    const defaultCategories = ['Groceries', 'Dining', 'Retail'];
    this.recommendedStore.loadByCategories(defaultCategories);
  }

  isSavedPromotion(promotion: any): boolean {
    return this.savedPromotions.some(p => p.id === promotion.id);
  }

  toggleShowMoreSavedPromotions(): void {
    this.showMoreSavedPromotions = !this.showMoreSavedPromotions;
    this.displayedSavedPromotions = this.showMoreSavedPromotions
      ? this.savedPromotions
      : this.savedPromotions.slice(0, this.savedPromotionsLimit);
  }

  viewPromotionDetails(promotion: Promotion): void {
    this.selectedPromotion = promotion;
  }

  closePromotionDetails(): void {
    this.selectedPromotion = null;
  }

  savePromotion(promotion: Promotion): void {
    const currentUser = this.firebaseAuthService.getCurrentUser();
    if (!currentUser?.id) return;
    this.savedPromotionsService.savePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        this.showNotification('Promotion saved!');
        this.loadSavedPromotions();
        this.closePromotionDetails();
      },
      error: () => this.showNotification('Failed to save promotion')
    });
  }

  removeSavedPromotion(promotionId: string): void {
    const currentUser = this.firebaseAuthService.getCurrentUser();
    if (!currentUser?.id) return;
    this.savedPromotionsService.removePromotion(currentUser.id, promotionId).subscribe({
      next: () => {
        this.showNotification('Promotion removed!');
        this.loadSavedPromotions();
        if (this.selectedPromotion?.id === promotionId) {
          this.closePromotionDetails();
        }
      },
      error: () => this.showNotification('Failed to remove promotion')
    });
  }

  showNotification(message: string): void {
    this.successNotificationMessage = message;
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;
    this.clearNotificationTimer();
    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;
      if (this.notificationTimeRemaining <= 0) this.closeSuccessNotification();
    }, 100);
  }

  closeSuccessNotification(): void {
    this.showSuccessNotification = false;
    this.clearNotificationTimer();
  }

  clearNotificationTimer(): void {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }

  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7;
  }

  hasExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No date provided';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}