// src/app/components/home-page/home-page.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { CameraService } from '../../services/camera.service';
import { ReceiptProcessingService } from '../../services/receipt-processing.service';
import { HomePageStore } from '../../stores/homepage.store';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  providers: [HomePageStore] // Provide the store at the component level
})
export class HomePageComponent implements OnInit, OnDestroy {
  // Observable streams from the store
  userName$!: Observable<string>;
  monthlyExpenses$!: Observable<number>;
  recommendedPromotions$!: Observable<any[]>;
  savedPromotions$!: Observable<any[]>;
  displayedSavedPromotions$!: Observable<any[]>;
  selectedPromotion$!: Observable<any | null>;
  showSuccessNotification$!: Observable<boolean>;
  successNotificationMessage$!: Observable<string>;
  notificationTimeRemaining$!: Observable<number>;
  isLoading$!: Observable<any>;
  showMoreSavedPromotions$!: Observable<boolean>;
  
  // Subject for unsubscribing from observables when component is destroyed
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    public cameraService: CameraService,
    public receiptProcessingService: ReceiptProcessingService,
    public store: HomePageStore // Changed to public for template access
  ) {}

  ngOnInit(): void {
    // Initialize observables from the store
    this.userName$ = this.store.userName$;
    this.monthlyExpenses$ = this.store.monthlyExpenses$;
    this.recommendedPromotions$ = this.store.recommendedPromotions$;
    this.savedPromotions$ = this.store.savedPromotions$;
    this.displayedSavedPromotions$ = this.store.displayedSavedPromotions$;
    this.selectedPromotion$ = this.store.selectedPromotion$;
    this.showSuccessNotification$ = this.store.showSuccessNotification$;
    this.successNotificationMessage$ = this.store.successNotificationMessage$;
    this.notificationTimeRemaining$ = this.store.notificationTimeRemaining$;
    this.isLoading$ = this.store.isLoading$;
    this.showMoreSavedPromotions$ = this.store.showMoreSavedPromotions$;
    
    // Load data on component initialization
    this.store.loadUserData();
    this.store.loadSavedPromotions();
    this.store.loadUserReceiptHistory();
    
    // Check for receipt processing state from router
    const state = history.state;
    if (state?.fromReceiptProcessing) {
      console.log('Navigated from receipt processing, receipt ID:', state.savedReceiptId);
    }
  }

  ngOnDestroy(): void {
    // Complete the destroy subject to unsubscribe from all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * View details of a promotion
   */
  viewPromotionDetails(promotion: any): void {
    if (promotion) {
      this.store.updateSelectedPromotion(promotion);
    }
  }

  /**
   * Close the promotion details modal
   */
  closePromotionDetails(): void {
    this.store.updateSelectedPromotion(null);
  }

  /**
   * Save a promotion
   */
  savePromotion(promotion: any): void {
    if (!promotion || !promotion.id) {
      console.error('Invalid promotion object:', promotion);
      return;
    }
    
    this.store.savePromotion(promotion.id);
  }

  /**
   * Check if a promotion is already saved
   * Uses the store's selector for efficiency
   */
  isSavedPromotion(promotion: any): Observable<boolean> {
    return this.store.isSavedPromotion(promotion);
  }

  /**
   * Remove a saved promotion
   */
  removeSavedPromotion(promotionId: string): void {
    if (!promotionId) {
      console.error('Invalid promotion ID');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this promotion?')) {
      return;
    }
    
    this.store.removeSavedPromotion(promotionId);
  }

  /**
   * Toggle showing more/less saved promotions
   */
  toggleShowMoreSavedPromotions(): void {
    this.store.toggleShowMoreSavedPromotions();
  }

  /**
   * Close the success notification
   */
  closeSuccessNotification(): void {
    this.store.closeSuccessNotification();
  }

  /**
   * Toggle showing full OCR text
   */
  toggleFullText(): void {
    this.store.toggleShowFullText();
  }

  /**
   * Utility methods passed through to the store
   */
  isExpiringSoon(expiryDate: string): boolean {
    return this.store.isExpiringSoon(expiryDate);
  }

  hasExpired(expiryDate: string): boolean {
    return this.store.hasExpired(expiryDate);
  }

  formatDate(dateString: string): string {
    return this.store.formatDate(dateString);
  }
}