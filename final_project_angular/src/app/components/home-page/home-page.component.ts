// src/app/components/home-page/home-page.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { CameraService } from '../../services/camera.service';
import { ReceiptProcessingService } from '../../services/receipt-processing.service';
import { HomePageStore } from '../../stores/homepage.store';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
})
export class HomePageComponent implements OnInit, OnDestroy {
  // Store Observables
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
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    public cameraService: CameraService,
    public receiptProcessingService: ReceiptProcessingService,
    public store: HomePageStore
  ) {}

  ngOnInit(): void {
    this.initializeStoreObservables();
    this.store.refreshData(); // Force refresh instead of clearing
    this.checkReceiptProcessingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeStoreObservables(): void {
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
  }

  private loadInitialData(): void {
    const trigger$ = of(void 0);
    this.store.loadUserData(trigger$);
    this.store.loadSavedPromotions(trigger$);
    this.store.loadUserReceiptHistory(trigger$);
  }

  private checkReceiptProcessingState(): void {
    const state = history.state;
    if (state?.fromReceiptProcessing) {
      console.log('Navigated from receipt processing, receipt ID:', state.savedReceiptId);
    }
  }

  // Promotion Actions
  viewPromotionDetails(promotion: any): void {
    if (promotion) {
      this.store.updateSelectedPromotion(promotion);
    }
  }

  closePromotionDetails(): void {
    this.store.updateSelectedPromotion(null);
  }

  savePromotion(promotion: any): void {
    if (!promotion?.id) {
      console.error('Invalid promotion object:', promotion);
      return;
    }
    this.store.savePromotion(promotion.id);
  }

  removeSavedPromotion(promotionId: string): void {
    if (!promotionId) {
      console.error('Invalid promotion ID');
      return;
    }
    
    if (confirm('Are you sure you want to remove this promotion?')) {
      this.store.removeSavedPromotion(promotionId);
    }
  }

  isSavedPromotion(promotion: any): Observable<boolean> {
    return this.store.isSavedPromotion(promotion);
  }

  // UI Actions
  toggleShowMoreSavedPromotions(): void {
    this.store.toggleShowMoreSavedPromotions();
  }

  closeSuccessNotification(): void {
    this.store.closeSuccessNotification();
  }

  toggleFullText(): void {
    this.store.toggleShowFullText();
  }

  // Utility Methods
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