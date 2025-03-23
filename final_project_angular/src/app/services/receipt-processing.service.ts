// src/app/services/receipt-processing.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, of } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { BudgetService } from './budget.service';
import { CameraService } from './camera.service';
import { PromotionService } from './promotions.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptProcessingService {
  private apiUrl = environment.apiUrl;
  
  // Processing status
  private processingSubject = new BehaviorSubject<boolean>(false);
  private processingMessageSubject = new BehaviorSubject<string>('');
  private successMessageSubject = new BehaviorSubject<string>('');
  private errorMessageSubject = new BehaviorSubject<string | null>(null);
  
  // Receipt data
  private recentlySavedReceiptSubject = new BehaviorSubject<any>(null);
  private matchingPromotionsSubject = new BehaviorSubject<any[]>([]);

  // Observable streams
  processing$ = this.processingSubject.asObservable();
  processingMessage$ = this.processingMessageSubject.asObservable();
  successMessage$ = this.successMessageSubject.asObservable();
  errorMessage$ = this.errorMessageSubject.asObservable();
  recentlySavedReceipt$ = this.recentlySavedReceiptSubject.asObservable();
  matchingPromotions$ = this.matchingPromotionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private cameraService: CameraService,
    private promotionService: PromotionService,
    private budgetService: BudgetService
  ) {
    // No need to subscribe here - we'll let the app component handle subscriptions
  }

  // Reset processing state
  resetProcessing(): void {
    this.processingSubject.next(false);
    this.processingMessageSubject.next('');
    this.errorMessageSubject.next(null);
  }

  // Cancel receipt processing
  cancelReceiptProcessing(): void {
    this.cameraService.resetScanner();
    this.resetProcessing();
  }

  // Confirm and save receipt
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

  // Save receipt to backend
  private saveReceipt(userId: string, extractedData: any, imagePreview: any, ocrText: string): void {
    if (!extractedData || !extractedData.merchantName || !extractedData.totalAmount || !extractedData.dateOfPurchase) {
      this.errorMessageSubject.next("Incomplete receipt data. Please try again.");
      return;
    }

    this.processingSubject.next(true);
    this.processingMessageSubject.next("Saving your receipt...");
    
    // Determine category based on merchant name
    const category = extractedData.category || this.cameraService.determineCategoryFromMerchant(extractedData.merchantName);
    
    // Create receipt object
    const receiptData = {
      userId: userId,
      merchantName: extractedData.merchantName,
      totalAmount: extractedData.totalAmount,
      dateOfPurchase: extractedData.dateOfPurchase,
      category: category,
      imageUrl: imagePreview, // Store the image preview URL
      additionalFields: {
        fullText: extractedData.fullText || ocrText,
        // Include any other fields from extracted data
        ...Object.entries(extractedData)
          .filter(([key]) => !['merchantName', 'totalAmount', 'dateOfPurchase', 'category', 'fullText'].includes(key))
          .reduce((obj, [key, value]) => ({...obj, [key]: value}), {})
      }
    };
  
    this.http.post(`${this.apiUrl}/receipts`, receiptData)
      .subscribe({
        next: (response: any) => {
          console.log('Receipt saved:', response);
          
          // Update the processing message
          this.processingMessageSubject.next("Finding matching promotions...");
          
          // Extract receipt and points data from response
          const savedReceipt = response.receipt;
          const pointsAwarded = response.pointsAwarded || 0;
          
          // Store the recently saved receipt
          this.recentlySavedReceiptSubject.next({
            ...receiptData,
            id: savedReceipt.id
          });
          
          // Set success message with points
          this.successMessageSubject.next(`Receipt saved! You earned ${pointsAwarded} points.`);
          
          // Fetch matching promotions for the receipt
          this.fetchMatchingPromotions(extractedData.merchantName, category, savedReceipt.id);
          
          // Navigate to homepage to show results
          this.router.navigate(['/homepage'], {
            state: { 
              fromReceiptProcessing: true,
              savedReceiptId: savedReceipt.id 
            }
          });
        },
        error: (error) => {
          console.error('Error saving receipt:', error);
          this.errorMessageSubject.next('Failed to save receipt. Please try again.');
          this.processingSubject.next(false);
          this.processingMessageSubject.next("");
        }
      });
  }

  // Fetch matching promotions based on merchant name and category
  private fetchMatchingPromotions(merchant: string, category: string, receiptId: string): void {
    // Use the match endpoint to find promotions by merchant or category
    this.http.get<any[]>(`${this.apiUrl}/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching matching promotions:', error);
          // Fall back to receipt-based API
          this.processingMessageSubject.next("Searching for more promotions...");
          return this.fetchPromotionsByReceiptId(receiptId);
        }),
        finalize(() => {
          // Set final processing message before completion
          this.processingMessageSubject.next("Completing...");
          
          // Short timeout to show the final step before clearing
          setTimeout(() => {
            this.processingSubject.next(false);
            this.processingMessageSubject.next("");
          }, 500);
        })
      )
      .subscribe({
        next: (promotions) => {
          console.log('Matching promotions:', promotions);
          if (promotions && promotions.length > 0) {
            // Store matching promotions
            this.matchingPromotionsSubject.next(promotions);
          } else {
            // If no promotions found, try fallback to receipt-based API
            this.processingMessageSubject.next("Searching for more promotions...");
            this.fetchPromotionsByReceiptId(receiptId).subscribe();
          }
        }
      });
  }

  // Fallback method to fetch promotions by receipt ID
  private fetchPromotionsByReceiptId(receiptId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/promotions/receipt/${receiptId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching promotions by receipt ID:', error);
          return of([]);
        })
      );
  }

  // Group promotions by category (helper method)
  groupPromotionsByCategory(promotions: any[]): any[] {
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
}