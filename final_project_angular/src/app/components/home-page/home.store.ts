import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ComponentStore } from '@ngrx/component-store';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.prod';
import { BudgetService } from '../../services/budget.service';
import { CameraService } from '../../services/camera.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { PromotionService } from '../../services/promotions.service';
import { SavedPromotionsService } from '../../services/saved-promotions.service';

export interface HomeState {
  userName: string;
  monthlyExpenses: number;
  userReceiptHistory: any[];
  recommendedPromotions: any[];
  savedPromotions: any[];
  showMoreSavedPromotions: boolean;
  savedPromotionsLimit: number;
  selectedFile: File | null;
  imagePreview: string | ArrayBuffer | null;
  extractedData: any;
  ocrText: string;
  isProcessing: boolean;
  showFullText: boolean;
  recentlySavedReceipt: any;
  matchingPromotions: any[];
  isLoadingPromotions: boolean;
  isLoadingRecommendations: boolean;
  isLoadingBudget: boolean;
  isLoadingSavedPromotions: boolean;
  selectedPromotion: any;
  showSuccessNotification: boolean;
  notificationTimeRemaining: number;
  processingMessage: string;
  successNotificationMessage: string;
  error: string | null;
  isLoading: boolean;
  hasData: boolean;
}

const initialState: HomeState = {
  userName: 'User',
  monthlyExpenses: 0,
  userReceiptHistory: [],
  recommendedPromotions: [],
  savedPromotions: [],
  showMoreSavedPromotions: false,
  savedPromotionsLimit: 3,
  selectedFile: null,
  imagePreview: null,
  extractedData: null,
  ocrText: '',
  isProcessing: false,
  showFullText: false,
  recentlySavedReceipt: null,
  matchingPromotions: [],
  isLoadingPromotions: false,
  isLoadingRecommendations: false,
  isLoadingBudget: false,
  isLoadingSavedPromotions: false,
  selectedPromotion: null,
  showSuccessNotification: false,
  notificationTimeRemaining: 100,
  processingMessage: '',
  successNotificationMessage: 'Receipt saved successfully!',
  error: null,
  isLoading: false,
  hasData: false
};

@Injectable()
export class HomeStore extends ComponentStore<HomeState> {
  private apiUrl = `${environment.apiUrl}`;
  private notificationTimer: any = null;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private budgetService: BudgetService,
    private promotionService: PromotionService,
    private savedPromotionService: SavedPromotionsService,
    private firebaseAuthService: FirebaseAuthService,
    public cameraService: CameraService
  ) {
    super(initialState);
  }

  // Helper method to extract the current value from an observable
  extract<T>(observable$: Observable<T>): T {
    let value: T;
    observable$.subscribe(val => value = val).unsubscribe();
    return value!;
  }

  // Selectors
  readonly userName$ = this.select(state => state.userName);
  readonly userFirstName$ = this.select(this.userName$, name => name.split(' ')[0]);
  readonly monthlyExpenses$ = this.select(state => state.monthlyExpenses);
  readonly savedPromotions$ = this.select(state => state.savedPromotions);
  readonly showMoreSavedPromotions$ = this.select(state => state.showMoreSavedPromotions);
  readonly savedPromotionsLimit$ = this.select(state => state.savedPromotionsLimit);
  readonly displayedSavedPromotions$ = this.select(
    this.savedPromotions$,
    this.showMoreSavedPromotions$,
    this.savedPromotionsLimit$,
    (promotions, showMore, limit) => showMore ? promotions : promotions.slice(0, limit)
  );
  readonly selectedFile$ = this.select(state => state.selectedFile);
  readonly imagePreview$ = this.select(state => state.imagePreview);
  readonly extractedData$ = this.select(state => state.extractedData);
  readonly ocrText$ = this.select(state => state.ocrText);
  readonly isProcessing$ = this.select(state => state.isProcessing);
  readonly showFullText$ = this.select(state => state.showFullText);
  readonly recentlySavedReceipt$ = this.select(state => state.recentlySavedReceipt);
  readonly recommendedPromotions$ = this.select(state => state.recommendedPromotions);
  readonly isLoadingPromotions$ = this.select(state => state.isLoadingPromotions);
  readonly isLoadingRecommendations$ = this.select(state => state.isLoadingRecommendations);
  readonly isLoadingBudget$ = this.select(state => state.isLoadingBudget);
  readonly isLoadingSavedPromotions$ = this.select(state => state.isLoadingSavedPromotions);
  readonly selectedPromotion$ = this.select(state => state.selectedPromotion);
  readonly showSuccessNotification$ = this.select(state => state.showSuccessNotification);
  readonly notificationTimeRemaining$ = this.select(state => state.notificationTimeRemaining);
  readonly processingMessage$ = this.select(state => state.processingMessage);
  readonly successNotificationMessage$ = this.select(state => state.successNotificationMessage);
  readonly error$ = this.select(state => state.error);
  readonly isLoading$ = this.select(state => state.isLoading);
  readonly hasData$ = this.select(state => state.hasData);

  // Rest of your store implementation...
  // Include all your existing updater methods and effects

  // Updaters (synchronous state changes)
  readonly setUserName = this.updater((state, userName: string) => ({
    ...state,
    userName
  }));

  readonly setMonthlyExpenses = this.updater((state, monthlyExpenses: number) => ({
    ...state,
    monthlyExpenses
  }));

  readonly toggleShowMoreSavedPromotions = this.updater(state => ({
    ...state,
    showMoreSavedPromotions: !state.showMoreSavedPromotions
  }));

  readonly setSelectedFile = this.updater((state, payload: { file: File | null, preview: string | ArrayBuffer | null }) => ({
    ...state,
    selectedFile: payload.file,
    imagePreview: payload.preview,
    ocrText: '',
    extractedData: null
  }));

  readonly setOcrResult = this.updater((state, payload: { extractedData: any, ocrText: string }) => ({
    ...state,
    extractedData: payload.extractedData,
    ocrText: payload.ocrText,
    isProcessing: false
  }));

  readonly toggleFullText = this.updater(state => ({
    ...state,
    showFullText: !state.showFullText
  }));

  readonly startProcessing = this.updater((state, processingMessage: string = '') => ({
    ...state,
    isProcessing: true,
    processingMessage
  }));

  readonly stopProcessing = this.updater(state => ({
    ...state,
    isProcessing: false,
    processingMessage: ''
  }));

  readonly resetScanner = this.updater(state => ({
    ...state,
    selectedFile: null,
    imagePreview: null,
    ocrText: '',
    extractedData: null,
    showFullText: false,
    recentlySavedReceipt: null
  }));

  readonly viewPromotionDetails = this.updater((state, promotion: any) => ({
    ...state,
    selectedPromotion: promotion
  }));

  readonly closePromotionDetails = this.updater(state => ({
    ...state,
    selectedPromotion: null
  }));

  readonly showNotification = this.updater((state, message: string) => ({
    ...state,
    showSuccessNotification: true,
    notificationTimeRemaining: 100,
    successNotificationMessage: message
  }));

  readonly updateNotificationTimeRemaining = this.updater((state, timeRemaining: number) => ({
    ...state,
    notificationTimeRemaining: timeRemaining
  }));

  readonly closeNotification = this.updater(state => ({
    ...state,
    showSuccessNotification: false
  }));

  readonly setSavedPromotions = this.updater((state, promotions: any[]) => ({
    ...state,
    savedPromotions: promotions,
    isLoadingSavedPromotions: false
  }));

  readonly setRecommendedPromotions = this.updater((state, promotions: any[]) => ({
    ...state,
    recommendedPromotions: promotions,
    isLoadingRecommendations: false
  }));

  // Add more updaters as needed...

  // Utility methods
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

  formatCurrency(value: number): string {
    if (value === undefined || value === null) return '0.00';
    return value.toFixed(2);
  }

  // Add stub implementations for effects to prevent compilation errors
  checkRouterState() {}
  monitorRouterEvents() {}
  loadUserData() {}
  loadUserReceiptHistory() {}
  loadSavedPromotions() {}
  processOcr(file: File) {}
  saveReceipt() {}
  startNotificationTimer() {}
  savePromotion(promotion: any) {}
  removePromotion(promotionId: string) {}
  cleanup() {}
  openCamera() {}
}