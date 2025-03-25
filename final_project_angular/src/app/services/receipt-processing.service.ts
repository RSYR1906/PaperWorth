// src/app/services/receipt-processing.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
  
  // BehaviorSubjects
  private processingSubject = new BehaviorSubject<boolean>(false);
  private processingMessageSubject = new BehaviorSubject<string>('');
  private successMessageSubject = new BehaviorSubject<string>('');
  private errorMessageSubject = new BehaviorSubject<string | null>(null);
  private recentlySavedReceiptSubject = new BehaviorSubject<any>(null);
  private matchingPromotionsSubject = new BehaviorSubject<any[]>([]);

  // Observable streams
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

  /**
   * Resets the processing state
   */
  resetProcessing(): void {
    this.processingSubject.next(false);
    this.processingMessageSubject.next('');
    this.errorMessageSubject.next(null);
  }

  /**
   * Cancels receipt processing and resets the scanner
   */
  cancelReceiptProcessing(): void {
    this.cameraService.resetScanner();
    this.resetProcessing();
  }

  /**
   * Confirms and saves the current receipt
   * @param userId ID of the user saving the receipt
   */
  confirmAndSaveReceipt(userId: string): void {
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Get the extracted data from camera service
    const extractedData = {...this.cameraService.extractedData};
    const imagePreview = this.cameraService.imagePreview;
    const ocrText = this.cameraService.ocrText;
    
    // Important: Clear the extracted data BEFORE saving to prevent loop
    this.cameraService.resetScanner();
    
    // Save the receipt
    this.saveReceipt(userId, extractedData, imagePreview, ocrText);
  }

  /**
   * Resets the success message
   */
  resetSuccessMessage(): void {
    this.successMessageSubject.next('');
  }

  /**
   * Groups promotions by category
   * @param promotions Array of promotions to group
   * @returns Array of category objects with nested promotions
   */
  groupPromotionsByCategory(promotions: any[]): any[] {
    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return [];
    }
    
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

  /**
   * Saves the receipt to the backend
   * @param userId ID of the user
   * @param extractedData Extracted receipt data
   * @param imagePreview Image preview data
   * @param ocrText OCR text from receipt
   */
  private saveReceipt(userId: string, extractedData: any, imagePreview: any, ocrText: string): void {
    if (!this.validateReceiptData(extractedData)) {
      this.errorMessageSubject.next("Incomplete receipt data. Please try again.");
      return;
    }

    this.setProcessingState(true, "Saving your receipt...");
    
    // Determine category based on merchant name
    const category = extractedData.category || 
      this.cameraService.determineCategoryFromMerchant(extractedData.merchantName);
    
    const receiptData = this.createReceiptObject(userId, extractedData, category, imagePreview, ocrText);
  
    this.http.post(`${this.apiUrl}/receipts`, receiptData)
      .subscribe({
        next: (response: any) => this.handleReceiptSaveSuccess(response, extractedData, category),
        error: (error) => this.handleReceiptSaveError(error)
      });
  }

  /**
   * Validates that required receipt data is present
   * @param extractedData The extracted receipt data
   * @returns Boolean indicating if data is valid
   */
  private validateReceiptData(extractedData: any): boolean {
    return !!(
      extractedData && 
      extractedData.merchantName && 
      extractedData.totalAmount && 
      extractedData.dateOfPurchase
    );
  }

  /**
   * Creates a receipt object for saving to the backend
   * @param userId User ID
   * @param extractedData Extracted receipt data
   * @param category Receipt category
   * @param imagePreview Image preview data
   * @param ocrText OCR text
   * @returns Receipt object ready for API submission
   */
  private createReceiptObject(
    userId: string, 
    extractedData: any, 
    category: string, 
    imagePreview: any, 
    ocrText: string
  ): any {
    // Extract core fields
    const { merchantName, totalAmount, dateOfPurchase, fullText } = extractedData;
    
    // Get additional fields (exclude core fields)
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

  /**
   * Handles successful receipt save
   * @param response API response
   * @param extractedData Original extracted data
   * @param category Receipt category
   */
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
    
     // Call the method without trying to subscribe to it
     this.fetchMatchingPromotions(extractedData.merchantName, category, savedReceipt.id);
    
     // Add a small delay before navigation to allow time for promotions to load
     setTimeout(() => {
       this.navigateToHomepage(savedReceipt.id);
     }, 500);
  }

  /**
   * Handles receipt save error
   * @param error Error object
   */
  private handleReceiptSaveError(error: any): void {
    console.error('Error saving receipt:', error);
    this.errorMessageSubject.next('Failed to save receipt. Please try again.');
    this.setProcessingState(false, "");
  }

  /**
   * Sets the processing state
   * @param isProcessing Boolean indicating if processing
   * @param message Processing message to display
   */
  private setProcessingState(isProcessing: boolean, message: string): void {
    this.processingSubject.next(isProcessing);
    this.processingMessageSubject.next(message);
  }

  /**
   * Navigates to homepage with receipt data
   * @param receiptId ID of the saved receipt
   */
  private navigateToHomepage(receiptId: string): void {
    this.router.navigate(['/homepage'], {
      state: { 
        fromReceiptProcessing: true,
        savedReceiptId: receiptId
      }
    });
  }

  /**
   * Fetches matching promotions for a receipt
   * @param merchant Merchant name
   * @param category Receipt category
   * @param receiptId Receipt ID
   */
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

  /**
   * Handles the matching promotions response
   * @param promotions Array of matching promotions
   * @param receiptId Receipt ID for fallback
   */
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

  /**
   * Finalizes the processing state
   */
  private finalizeProcessing(): void {
    this.processingMessageSubject.next("Completing...");
    
    // Short timeout to show the final step before clearing
    setTimeout(() => {
      this.setProcessingState(false, "");
    }, 500);
  }

  /**
   * Fallback method to fetch promotions by receipt ID
   * @param receiptId Receipt ID
   * @returns Observable of promotions
   */
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