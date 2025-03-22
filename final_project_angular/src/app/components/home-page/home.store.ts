import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, filter, switchMap, tap, withLatestFrom } from 'rxjs/operators';
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
  successNotificationMessage: 'Receipt saved successfully!'
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

  readonly addToRecommendedPromotions = this.updater((state, categoryGroup: { name: string, deals: any[] }) => {
    const existingIndex = state.recommendedPromotions.findIndex(
      group => group.name.toLowerCase() === categoryGroup.name.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Category exists, merge deals avoiding duplicates
      const updatedPromotions = [...state.recommendedPromotions];
      const existingDeals = updatedPromotions[existingIndex].deals;
      const existingIds = new Set(existingDeals.map((deal: any) => deal.id || deal.promotionId));
      
      // Add only new promotions
      categoryGroup.deals.forEach(deal => {
        const dealId = deal.id || deal.promotionId;
        if (!existingIds.has(dealId)) {
          existingDeals.push(deal);
        }
      });

      return {
        ...state,
        recommendedPromotions: updatedPromotions
      };
    } else {
      // Add new category group to the start
      return {
        ...state,
        recommendedPromotions: [categoryGroup, ...state.recommendedPromotions]
      };
    }
  });

  // Effects (asynchronous operations)
  // Add method to check router state for camera data
  readonly checkRouterState = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras?.state as any;
        
        if (state && state.extractedData) {
          this.patchState({
            extractedData: state.extractedData,
            imagePreview: state.imagePreview,
            ocrText: state.ocrText || ''
          });
          
          // If we have extracted data from navigation, process it automatically
          if (state.extractedData.merchantName && 
              state.extractedData.totalAmount && 
              state.extractedData.dateOfPurchase) {
            // Optional: Add a small delay to ensure UI is updated
            setTimeout(() => {
              this.saveReceipt();
            }, 100);
          }
        }
      })
    );
  });
  
  // Listen for router navigation events
  readonly monitorRouterEvents = this.effect(trigger$ => {
    return trigger$.pipe(
      switchMap(() => {
        return this.router.events.pipe(
          filter(event => event instanceof NavigationStart),
          tap(() => {
            this.checkRouterState();
          })
        );
      })
    );
  });

  readonly loadUserData = this.effect(trigger$ => {
    return trigger$.pipe(
      switchMap(() => {
        const currentUser = this.getCurrentUser();
        if (currentUser?.name) {
          this.setUserName(currentUser.name);
        }

        if (currentUser?.id) {
          this.patchState({ isLoadingBudget: true });
          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
          return this.budgetService.loadUserBudget(currentUser.id, currentMonth).pipe(
            tap(budget => {
              this.setMonthlyExpenses(budget?.totalSpent || 0);
              this.patchState({ isLoadingBudget: false });
            }),
            catchError(error => {
              console.error('Error loading budget data:', error);
              this.patchState({ isLoadingBudget: false });
              return EMPTY;
            })
          );
        }
        return EMPTY;
      })
    );
  });

  readonly loadUserReceiptHistory = this.effect(trigger$ => {
    return trigger$.pipe(
      switchMap(() => {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.id) {
          this.patchState({ recommendedPromotions: [] });
          return EMPTY;
        }

        this.patchState({ isLoadingRecommendations: true });
        return this.http.get<any[]>(`${this.apiUrl}/receipts/user/${currentUser.id}`).pipe(
          tap(receipts => {
            this.patchState({ userReceiptHistory: receipts });
            const categories = this.analyzeReceiptHistory(receipts);
            this.loadRecommendedPromotions(categories);
          }),
          catchError(error => {
            console.error('Error fetching receipt history:', error);
            this.patchState({ 
              isLoadingRecommendations: false,
              recommendedPromotions: []
            });
            return EMPTY;
          })
        );
      })
    );
  });

  readonly loadSavedPromotions = this.effect(trigger$ => {
    return trigger$.pipe(
      switchMap(() => {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.id) {
          this.patchState({ savedPromotions: [], isLoadingSavedPromotions: false });
          return EMPTY;
        }

        this.patchState({ isLoadingSavedPromotions: true });
        return this.savedPromotionService.getSavedPromotions(currentUser.id).pipe(
          tap(promotions => {
            this.setSavedPromotions(promotions);
          }),
          catchError(error => {
            console.error('Error loading saved promotions:', error);
            this.patchState({ isLoadingSavedPromotions: false });
            return EMPTY;
          })
        );
      })
    );
  });

  readonly processOcr = this.effect<File>(file$ => {
    return file$.pipe(
      tap(() => this.startProcessing()),
      switchMap(file => {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<any>(`${this.apiUrl}/ocr/scan`, formData).pipe(
          tap(response => {
            if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
              this.setOcrResult({
                extractedData: response,
                ocrText: response.fullText || "No additional text extracted."
              });
            } else {
              this.setOcrResult({
                extractedData: null,
                ocrText: "Error processing image. Please try again."
              });
            }
          }),
          catchError(error => {
            console.error('Error processing image:', error);
            this.setOcrResult({
              extractedData: null,
              ocrText: "Error processing image. Please try again."
            });
            return EMPTY;
          })
        );
      })
    );
  });

  readonly saveReceipt = this.effect<void>(trigger$ => {
    return trigger$.pipe(
      withLatestFrom(this.extractedData$, this.imagePreview$),
      switchMap(([_, extractedData, imagePreview]) => {
        if (!extractedData || !extractedData.merchantName || !extractedData.totalAmount || !extractedData.dateOfPurchase) {
          alert("Incomplete receipt data. Please try again.");
          return EMPTY;
        }

        this.startProcessing("Saving your receipt...");
        
        const currentUser = this.getCurrentUser();
        const category = extractedData.category || this.determineCategoryFromMerchant(extractedData.merchantName);
        
        const receiptData = {
          userId: currentUser.id || '1',
          merchantName: extractedData.merchantName,
          totalAmount: extractedData.totalAmount,
          dateOfPurchase: extractedData.dateOfPurchase,
          category: category,
          imageUrl: imagePreview,
          additionalFields: {
            fullText: extractedData.fullText || this.extract(this.ocrText$),
            ...Object.entries(extractedData)
              .filter(([key]) => !['merchantName', 'totalAmount', 'dateOfPurchase', 'category', 'fullText'].includes(key))
              .reduce((obj, [key, value]) => ({...obj, [key]: value}), {})
          }
        };

        return this.http.post<any>(`${this.apiUrl}/receipts`, receiptData).pipe(
          tap(response => {
            console.log('Receipt saved:', response);
            
            this.patchState({
              processingMessage: "Finding matching promotions...",
              recentlySavedReceipt: {
                ...receiptData,
                id: response.receipt.id
              },
              monthlyExpenses: this.extract(this.monthlyExpenses$) + extractedData.totalAmount
            });
            
            const pointsAwarded = response.pointsAwarded || 0;
            this.showNotification(`Receipt saved! You earned ${pointsAwarded} points.`);
            
            this.fetchMatchingPromotions(
              extractedData.merchantName, 
              category, 
              response.receipt.id
            );
            
            this.loadUserReceiptHistory();
          }),
          catchError(error => {
            console.error('Error saving receipt:', error);
            alert('Failed to save receipt. Please try again.');
            this.stopProcessing();
            return EMPTY;
          })
        );
      })
    );
  });

  readonly fetchMatchingPromotions = this.effect<{merchant: string, category: string, receiptId: string}>(params$ => {
    return params$.pipe(
      tap(() => this.patchState({ isLoadingPromotions: true })),
      switchMap(({ merchant, category, receiptId }) => {
        return this.http.get<any[]>(`${this.apiUrl}/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`).pipe(
          tap(promotions => {
            if (promotions && promotions.length > 0) {
              const groupedPromotions = this.groupPromotionsByCategory(promotions);
              
              groupedPromotions.forEach(group => {
                this.addToRecommendedPromotions(group);
              });
              
              this.patchState({ 
                isLoadingPromotions: false,
                isProcessing: false,
                processingMessage: ""
              });
              
              this.resetScanner();
            } else {
              this.patchState({ processingMessage: "Searching for more promotions..." });
              this.fetchPromotionsByReceiptId(receiptId);
            }
          }),
          catchError(error => {
            console.error('Error fetching matching promotions:', error);
            this.patchState({ processingMessage: "Searching for more promotions..." });
            this.fetchPromotionsByReceiptId(receiptId);
            return EMPTY;
          })
        );
      })
    );
  });

  readonly fetchPromotionsByReceiptId = this.effect<string>(receiptId$ => {
    return receiptId$.pipe(
      switchMap(receiptId => {
        return this.http.get<any[]>(`${this.apiUrl}/promotions/receipt/${receiptId}`).pipe(
          tap(promotions => {
            if (promotions && promotions.length > 0) {
              const groupedPromotions = this.groupPromotionsByCategory(promotions);
              
              groupedPromotions.forEach(group => {
                this.addToRecommendedPromotions(group);
              });
            }
            
            this.patchState({ processingMessage: "Completing..." });
            
            setTimeout(() => {
              this.patchState({
                isLoadingPromotions: false,
                isProcessing: false,
                processingMessage: ""
              });
              
              this.resetScanner();
            }, 500);
          }),
          catchError(error => {
            console.error('Error fetching promotions by receipt ID:', error);
            this.patchState({
              isLoadingPromotions: false,
              isProcessing: false,
              processingMessage: ""
            });
            
            this.resetScanner();
            return EMPTY;
          })
        );
      })
    );
  });

  readonly savePromotion = this.effect<any>(promotion$ => {
    return promotion$.pipe(
      switchMap(promotion => {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.id) {
          // Navigate to login page would be handled in component
          return EMPTY;
        }
        
        // Check if already saved to avoid duplicates
        const alreadySaved = this.extract(this.savedPromotions$).some(p => p.id === promotion.id);
        if (alreadySaved) {
          alert('This promotion is already saved!');
          return EMPTY;
        }
        
        return this.savedPromotionService.savePromotion(currentUser.id, promotion.id).pipe(
          tap(() => {
            this.showNotification('Promotion saved successfully!');
            this.closePromotionDetails();
          }),
          catchError(error => {
            console.error('Error saving promotion:', error);
            alert('Failed to save promotion. Please try again.');
            return EMPTY;
          })
        );
      })
    );
  });

  readonly removePromotion = this.effect<string>(promotionId$ => {
    return promotionId$.pipe(
      switchMap(promotionId => {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.id) return EMPTY;
        
        if (!confirm('Are you sure you want to remove this promotion?')) {
          return EMPTY;
        }
        
        return this.savedPromotionService.removePromotion(currentUser.id, promotionId).pipe(
          tap(() => {
            this.showNotification('Promotion removed!');
          }),
          catchError(error => {
            console.error('Error removing promotion:', error);
            alert('Failed to remove promotion. Please try again.');
            return EMPTY;
          })
        );
      })
    );
  });

  readonly loadRecommendedPromotions = this.effect<string[]>(categories$ => {
    return categories$.pipe(
      switchMap(categories => {
        if (!categories.length) {
          this.patchState({ 
            recommendedPromotions: [], 
            isLoadingRecommendations: false 
          });
          return EMPTY;
        }

        const categoryPromotions: any[] = [];
        let completedRequests = 0;

        return forkJoin(
          categories.map(category => 
            this.promotionService.getPromotionsByCategory(category).pipe(
              tap(promotions => {
                if (promotions?.length) {
                  categoryPromotions.push({ name: category, deals: promotions });
                }
              }),
              catchError(() => of(null)) // Ensure forkJoin completes even if one request fails
            )
          )
        ).pipe(
          tap(() => {
            this.setRecommendedPromotions(categoryPromotions);
          })
        );
      })
    );
  });

  readonly startNotificationTimer = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        if (this.notificationTimer) {
          clearInterval(this.notificationTimer);
        }
        
        this.notificationTimer = setInterval(() => {
          const currentTime = this.extract(this.notificationTimeRemaining$);
          const newTime = currentTime - 2;
          
          this.updateNotificationTimeRemaining(newTime);
          
          if (newTime <= 0) {
            this.closeNotification();
            clearInterval(this.notificationTimer);
            this.notificationTimer = null;
          }
        }, 100); // Update every 100ms
      })
    );
  });

  // Utility methods
  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  private analyzeReceiptHistory(receipts: any[]): string[] {
    const categoryCounts: Record<string, number> = {};
    receipts.forEach(({ category, merchantName, additionalFields }) => {
      const detectedCategory = category || additionalFields?.category || this.determineCategoryFromMerchant(merchantName);
      if (detectedCategory) categoryCounts[detectedCategory] = (categoryCounts[detectedCategory] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  private determineCategoryFromMerchant(merchantName: string): string {
    if (!merchantName) return 'Others';
    
    merchantName = merchantName.toLowerCase();
    
    // Grocery stores
    if (merchantName.includes('cold storage') || 
        merchantName.includes('fairprice') || 
        merchantName.includes('ntuc') || 
        merchantName.includes('giant') || 
        merchantName.includes('sheng siong')) {
      return 'Groceries';
    }
    
    // Fast food
    if (merchantName.includes('mcdonald') || 
        merchantName.includes('burger king') || 
        merchantName.includes('kfc') || 
        merchantName.includes('subway') ||
        merchantName.includes('jollibee')) {
      return 'Fast Food';
    }
    
    // Cafes
    if (merchantName.includes('starbucks') || 
        merchantName.includes('coffee bean') || 
        merchantName.includes('toast box') ||
        merchantName.includes('ya kun') ||
        merchantName.includes('cafe')) {
      return 'Cafes';
    }
    
    // Retail
    if (merchantName.includes('uniqlo') || 
        merchantName.includes('zara') || 
        merchantName.includes('h&m') ||
        merchantName.includes('cotton on')) {
      return 'Retail';
    }
    
    // Healthcare
    if (merchantName.includes('guardian') || 
        merchantName.includes('watsons') || 
        merchantName.includes('unity') ||
        merchantName.includes('pharmacy')) {
      return 'Health & Beauty';
    }
    
    // Default to "Others" if no match
    return 'Others';
  }

  private groupPromotionsByCategory(promotions: any[]): any[] {
    // Group the promotions by category
    const categoryMap = new Map<string, any[]>();
    
    promotions.forEach(promo => {
      const category = promo.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(promo);
    });
    
    // Convert map to array of category objects
    return Array.from(categoryMap.entries()).map(([name, deals]) => ({
      name,
      deals
    }));
  }

  isExpiringSoon(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return differenceInDays >= 0 && differenceInDays <= 7;
  }

  hasExpired(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    return value.toFixed(2);
  }

  isFileSizeAcceptable(file: File): boolean {
    const maxSizeInMB = 5;
    const fileSizeInMB = file.size / (1024 * 1024);
    return fileSizeInMB <= maxSizeInMB;
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  // Camera functionality
  openCamera(): void {
    this.cameraService.triggerCamera();
  }

  // Clean up
  cleanup() {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }
}