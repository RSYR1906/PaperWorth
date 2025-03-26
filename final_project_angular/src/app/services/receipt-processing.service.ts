import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, of } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { BudgetService } from './budget.service';
import { CameraService } from './camera.service';
import { PromotionService } from './promotions.service';

/**
 * Service for processing receipts, finding matching promotions and managing related UI states
 */
@Injectable({
  providedIn: 'root'
})
export class ReceiptProcessingService {
  private readonly apiUrl = environment.apiUrl;
  
  private processingSubject = new BehaviorSubject<boolean>(false);
  private processingMessageSubject = new BehaviorSubject<string>('');
  private successMessageSubject = new BehaviorSubject<string>('');
  private errorMessageSubject = new BehaviorSubject<string | null>(null);
  private recentlySavedReceiptSubject = new BehaviorSubject<any>(null);
  private matchingPromotionsSubject = new BehaviorSubject<any[]>([]);

  receiptSaved = new EventEmitter<string>();

  readonly processing$ = this.processingSubject.asObservable();
  readonly processingMessage$ = this.processingMessageSubject.asObservable();
  readonly successMessage$ = this.successMessageSubject.asObservable();
  readonly errorMessage$ = this.errorMessageSubject.asObservable();
  readonly recentlySavedReceipt$ = this.recentlySavedReceiptSubject.asObservable();
  readonly matchingPromotions$ = this.matchingPromotionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private cameraService: CameraService,
    private promotionService: PromotionService,
    private budgetService: BudgetService
  ) {}

  resetProcessing(): void {
    this.processingSubject.next(false);
    this.processingMessageSubject.next('');
    this.errorMessageSubject.next(null);
  }

  cancelReceiptProcessing(): void {
    this.cameraService.resetScanner();
    this.resetProcessing();
  }

  confirmAndSaveReceipt(userId: string): void {
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }
    
    const extractedData = {...this.cameraService.extractedData};
    const imagePreview = this.cameraService.imagePreview;
    const ocrText = this.cameraService.ocrText;
    
    this.cameraService.resetScanner();
    this.saveReceipt(userId, extractedData, imagePreview, ocrText);
  }

  resetSuccessMessage(): void {
    this.successMessageSubject.next('');
  }

  groupPromotionsByCategory(promotions: any[]): any[] {
    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return [];
    }
    
    const categoryMap = new Map<string, any[]>();
    
    promotions.forEach(promo => {
      const category = promo.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(promo);
    });
    
    return Array.from(categoryMap.entries()).map(([name, deals]) => ({
      name,
      deals
    }));
  }

  private saveReceipt(userId: string, extractedData: any, imagePreview: any, ocrText: string): void {
    if (!this.validateReceiptData(extractedData)) {
      this.errorMessageSubject.next("Incomplete receipt data. Please try again.");
      return;
    }

    this.setProcessingState(true, "Saving your receipt...");
    
    const category = extractedData.category || 
      this.cameraService.determineCategoryFromMerchant(extractedData.merchantName);
    
    const receiptData = this.createReceiptObject(userId, extractedData, category, imagePreview, ocrText);
  
    this.http.post(`${this.apiUrl}/receipts`, receiptData)
      .subscribe({
        next: (response: any) => this.handleReceiptSaveSuccess(response, extractedData, category),
        error: (error) => this.handleReceiptSaveError(error)
      });
  }

  private validateReceiptData(extractedData: any): boolean {
    return !!(
      extractedData && 
      extractedData.merchantName && 
      extractedData.totalAmount && 
      extractedData.dateOfPurchase
    );
  }

  private createReceiptObject(
    userId: string, 
    extractedData: any, 
    category: string, 
    imagePreview: any, 
    ocrText: string
  ): any {
    const { merchantName, totalAmount, dateOfPurchase, fullText } = extractedData;
    
    const additionalFields = {
      fullText: fullText || ocrText,
      ...Object.entries(extractedData)
        .filter(([key]) => !['merchantName', 'totalAmount', 'dateOfPurchase', 'category', 'fullText'].includes(key))
        .reduce((obj, [key, value]) => ({...obj, [key]: value}), {})
    };
    
    return {
      userId,
      merchantName,
      totalAmount,
      dateOfPurchase,
      category,
      imageUrl: imagePreview,
      additionalFields
    };
  }

  private handleReceiptSaveSuccess(response: any, extractedData: any, category: string): void {
    console.log('Receipt saved:', response);
    
    this.processingMessageSubject.next("Finding matching promotions...");
    
    const savedReceipt = response.receipt;
    const pointsAwarded = response.pointsAwarded || 0;
    
    this.recentlySavedReceiptSubject.next({
      ...extractedData,
      category,
      id: savedReceipt.id
    });
    
    this.successMessageSubject.next(`Receipt saved! You earned ${pointsAwarded} points.`);
    
    this.fetchMatchingPromotions(extractedData.merchantName, category, savedReceipt.id);
    
    const userId = savedReceipt.userId || extractedData.userId;
    
    if (userId) {
      console.log('Emitting receiptSaved event with userId:', userId);
      setTimeout(() => {
        this.receiptSaved.emit(userId);
        console.log('Event emitted for saved receipt, userId:', userId);
      }, 0);
    } else {
      console.warn('No userId available to emit for receipt saved event');
    }
    
    setTimeout(() => {
      this.navigateToHomepage(savedReceipt.id);
    }, 700);
  }

  private handleReceiptSaveError(error: any): void {
    console.error('Error saving receipt:', error);
    this.errorMessageSubject.next('Failed to save receipt. Please try again.');
    this.setProcessingState(false, "");
  }

  private setProcessingState(isProcessing: boolean, message: string): void {
    this.processingSubject.next(isProcessing);
    this.processingMessageSubject.next(message);
  }

  private navigateToHomepage(receiptId: string): void {
    this.router.navigate(['/homepage'], {
      state: { 
        fromReceiptProcessing: true,
        savedReceiptId: receiptId
      }
    });
  }

  private fetchMatchingPromotions(merchant: string, category: string, receiptId: string): void {
    console.log(`Fetching matching promotions for merchant: ${merchant}, category: ${category}`);
    
    const url = `${this.apiUrl}/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`;
    
    this.http.get<any[]>(url)
      .pipe(
        catchError(error => {
          console.error('Error fetching matching promotions:', error);
          this.processingMessageSubject.next("Searching for more promotions...");
          return this.fetchPromotionsByReceiptId(receiptId);
        }),
        finalize(() => this.finalizeProcessing())
      )
      .subscribe({
        next: (promotions) => this.handleMatchingPromotions(promotions, receiptId),
        error: (error) => {
          console.error('Error in promotions subscription:', error);
          this.matchingPromotionsSubject.next([]);
        }
      });
  }

  private handleMatchingPromotions(promotions: any[], receiptId: string): void {
    console.log('Matching promotions fetched:', promotions?.length || 0);
    
    if (promotions && promotions.length > 0) {
      this.matchingPromotionsSubject.next(promotions);
      console.log('Matching promotions emitted to subject');
    } else {
      console.log('No matching promotions found, trying receipt-based API');
      this.processingMessageSubject.next("Searching for more promotions...");
      this.fetchPromotionsByReceiptId(receiptId).subscribe();
    }
  }

  private finalizeProcessing(): void {
    this.processingMessageSubject.next("Completing...");
    
    setTimeout(() => {
      this.setProcessingState(false, "");
    }, 500);
  }

  private fetchPromotionsByReceiptId(receiptId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/promotions/receipt/${receiptId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching promotions by receipt ID:', error);
          return of([]);
        })
      );
  }
}