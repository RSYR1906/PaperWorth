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
    public cameraService: CameraService
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
    
    // Check for any receipt data passed from the camera service
    this.checkForReceiptData();
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
   * Check if there's any receipt data passed from navigation state
   */
  private checkForReceiptData(): void {
    // Get navigation state
    const state = history.state;
    if (state?.extractedData) {
      console.log('Received extracted data:', state.extractedData);
      
      // Process the received data
      this.processExtractedData(state.extractedData, state.imagePreview, state.ocrText);
    }
    
    // Also subscribe to OCR processed events from the camera service
    this.subscriptions.add(
      this.cameraService.ocrProcessed$.subscribe(result => {
        if (result?.extractedData) {
          this.processExtractedData(
            result.extractedData, 
            this.cameraService.imagePreview, 
            result.ocrText
          );
        }
      })
    );
  }
  
  /**
   * Process extracted data and prepare to save receipt
   */
  private processExtractedData(extractedData: any, imagePreview: any, ocrText: string): void {
    // If data has been processed already, save the receipt
    const currentUser = this.getCurrentUser();
    if (currentUser?.id && extractedData) {
      this.saveReceipt(currentUser.id, extractedData, imagePreview, ocrText);
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
  
  // Save the receipt to the backend
  saveReceipt(userId: string, extractedData: any, imagePreview: any, ocrText: string): void {
    if (!extractedData || !extractedData.merchantName || !extractedData.totalAmount || !extractedData.dateOfPurchase) {
      console.error("Incomplete receipt data:", extractedData);
      return;
    }

    this.cameraService.isProcessing = true;
    this.cameraService.processingMessage = "Saving your receipt...";
    
    // Determine category based on merchant name
    const category = extractedData.category || this.cameraService.determineCategoryFromMerchant(extractedData.merchantName);
    
    // Create receipt object based on our updated model
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
          
          // Update the processing message to show next step
          this.cameraService.processingMessage = "Finding matching promotions...";
          
          // Extract receipt and points data from response
          const savedReceipt = response.receipt;
          const pointsAwarded = response.pointsAwarded || 0;
          
          // Store the recently saved receipt for reference
          this.recentlySavedReceipt = {
            ...receiptData,
            id: savedReceipt.id
          };
          
          // Update monthly expenses with the new receipt amount
          this.monthlyExpenses += extractedData.totalAmount;
          
          // Customize notification message to include points
          this.successNotificationMessage = `Receipt saved! You earned ${pointsAwarded} points.`;
          
          // Show the success notification
          this.showNotification();
  
          // Fetch matching promotions for the receipt
          this.fetchMatchingPromotions(extractedData.merchantName, category, savedReceipt.id);
          
          // Also refresh the recommended promotions as we have a new receipt
          this.loadUserReceiptHistory();
        },
        error: (error) => {
          console.error('Error saving receipt:', error);
          alert('Failed to save receipt. Please try again.');
          this.cameraService.isProcessing = false;
          this.cameraService.processingMessage = "";
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

  // Updated fetchMatchingPromotions method to properly clear loading state
  fetchMatchingPromotions(merchant: string, category: string, receiptId: string) {
    this.isLoadingPromotions = true;
    
    // Use the match endpoint to find promotions by merchant or category
    this.http.get<any[]>(`${this.apiUrl}/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`)
      .subscribe({
        next: (promotions) => {
          console.log('Matching promotions:', promotions);
          if (promotions && promotions.length > 0) {
            // Group promotions by category
            const groupedPromotions = this.groupPromotionsByCategory(promotions);
            
            // Add each category group to recommendations
            groupedPromotions.forEach(group => {
              this.addPromotionsToRecommendations(group.name, group.deals);
            });
            
            this.isLoadingPromotions = false;
            this.cameraService.isProcessing = false;
            this.cameraService.processingMessage = "";
            
            // Clear the receipt data in camera service
            this.cameraService.resetScanner();
          } else {
            // Update processing message for fallback attempt
            this.cameraService.processingMessage = "Searching for more promotions...";
            
            // If no promotions found, try fallback to receipt-based API
            this.fetchPromotionsByReceiptId(receiptId);
          }
        },
        error: (error) => {
          console.error('Error fetching matching promotions:', error);
          // Update processing message for fallback attempt
          this.cameraService.processingMessage = "Searching for more promotions...";
          
          // Try fallback to receipt-based API
          this.fetchPromotionsByReceiptId(receiptId);
        }
      });
  }
  
  // Group flat promotions by category
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
  
  // Fallback method if direct matching fails
  fetchPromotionsByReceiptId(receiptId: string) {
    this.http.get<any[]>(`${this.apiUrl}/promotions/receipt/${receiptId}`)
      .subscribe({
        next: (promotions) => {
          console.log('Promotions by receipt ID:', promotions);
          if (promotions && promotions.length > 0) {
            // Group promotions by category
            const groupedPromotions = this.groupPromotionsByCategory(promotions);
            
            // Add each category group to recommendations
            groupedPromotions.forEach(group => {
              this.addPromotionsToRecommendations(group.name, group.deals);
            });
          }
          
          // Set final processing message before completion
          this.cameraService.processingMessage = "Completing...";
          
          // Short timeout to show the final step before clearing
          setTimeout(() => {
            this.isLoadingPromotions = false;
            this.cameraService.isProcessing = false;
            this.cameraService.processingMessage = "";
          }, 500);
        },
        error: (error) => {
          console.error('Error fetching promotions by receipt ID:', error);
          this.isLoadingPromotions = false;
          this.cameraService.isProcessing = false;
          this.cameraService.processingMessage = "";
        }
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
  savePromotion(promotion: any): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Check if already saved to avoid duplicates
    const alreadySaved = this.savedPromotions.some(p => p.id === promotion.id);
    if (alreadySaved) {
      alert('This promotion is already saved!');
      return;
    }
    
    this.savedPromotionService.savePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        // Show success notification
        this.successNotificationMessage = 'Promotion saved successfully!';
        this.showNotification();
        
        // Close promotion details if open
        this.closePromotionDetails();
      },
      error: (error) => {
        console.error('Error saving promotion:', error);
        alert('Failed to save promotion. Please try again.');
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
    
    this.savedPromotionService.removePromotion(currentUser.id, promotionId).subscribe({
      next: () => {
        // Show success notification
        this.successNotificationMessage = 'Promotion removed!';
        this.showNotification();
      },
      error: (error) => {
        console.error('Error removing promotion:', error);
        alert('Failed to remove promotion. Please try again.');
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

  // Add these methods to the HomePageComponent class

/**
 * Cancel receipt processing and reset the scanner
 */
  cancelReceiptProcessing(): void {
    // Clear the extracted data and reset scanner
    this.cameraService.resetScanner();
  }

/**
 * Confirm and save the receipt
 */
  confirmAndSaveReceipt(): void {
    const currentUser = this.getCurrentUser();
    
    if (!currentUser?.id) {
      // Redirect to login if user is not logged in
      this.router.navigate(['/login']);
      return;
    }
    
    // Save the receipt using data from camera service
    this.saveReceipt(
      currentUser.id, 
      this.cameraService.extractedData, 
      this.cameraService.imagePreview, 
      this.cameraService.ocrText
    );
  }
}