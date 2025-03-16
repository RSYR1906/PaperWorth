import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  extractedData: any = null;
  ocrText = '';
  isProcessing = false;
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
  processingMessage: string = '';
  successNotificationMessage: string = 'Receipt saved successfully!';
  savedPromotions: any[] = [];
  isLoadingSavedPromotions: boolean = false;
  showMoreSavedPromotions: boolean = false;
  savedPromotionsLimit: number = 3; // Default limit to show in homepage

  
  constructor(
    private http: HttpClient, 
    private router: Router,
    private route: ActivatedRoute,
    private promotionService: PromotionService,
    private budgetService: BudgetService,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionService : SavedPromotionsService,
    private cameraService: CameraService
  ) {}

  private apiUrl = `${environment.apiUrl}`

  ngOnInit(): void {
    // Load user data
    this.loadUserData();
    // Load user's receipt history when component initializes
    this.loadUserReceiptHistory();

    // Check if we were redirected here with camera flag
    this.route.queryParams.subscribe(params => {
      if (params['camera'] === 'open') {
        // Trigger the camera after a short delay to ensure component is fully loaded
        setTimeout(() => {
          this.triggerFileInput();
        }, 300);
      }
    });
  }

  ngOnDestroy() {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
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
      next: (promotions) => {
        this.savedPromotions = promotions;
        this.isLoadingSavedPromotions = false;
      },
      error: (error) => {
        console.error('Error loading saved promotions:', error);
        this.isLoadingSavedPromotions = false;
      }
    });
  }

  /** Save a promotion */
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
        // Add to local array
        const savedPromotion = {
          ...promotion,
          savedAt: new Date().toISOString()
        };
        this.savedPromotions.unshift(savedPromotion);
        
        // Show success notification
        this.successNotificationMessage = 'Promotion saved successfully!';
        this.showNotification();
        
        // Close promotion details if open
        this.closePromotionDetails();
      },
      error: (error) => {
        console.error('Error saving promotion:', error);
        alert('Failed to save promotion. Please try again.');
        
        // For demo: add to local array anyway
        const savedPromotion = {
          ...promotion,
          savedAt: new Date().toISOString()
        };
        this.savedPromotions.unshift(savedPromotion);
      }
    });
  }

  /** Remove a saved promotion */
  removeSavedPromotion(promotionId: string): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return;
    
    if (!confirm('Are you sure you want to remove this promotion?')) {
      return;
    }
    
    this.savedPromotionService.removePromotion(currentUser.id, promotionId).subscribe({
      next: () => {
        // Remove from local array
        this.savedPromotions = this.savedPromotions.filter(p => p.id !== promotionId);
        
        // Show success notification
        this.successNotificationMessage = 'Promotion removed!';
        this.showNotification();
      },
      error: (error) => {
        console.error('Error removing promotion:', error);
        alert('Failed to remove promotion. Please try again.');
        
        // For demo: remove from local array anyway
        this.savedPromotions = this.savedPromotions.filter(p => p.id !== promotionId);
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

  /** Determine category based on merchant name */
  private getCategoryFromMerchant(merchantName: string): string {
    if (!merchantName) return 'Others';
    const name = merchantName.toLowerCase();

    if (/cold storage|fairprice|ntuc|giant|sheng siong/.test(name)) return 'Groceries';
    if (/mcdonald|burger king|kfc|subway|jollibee/.test(name)) return 'Fast Food';
    if (/starbucks|coffee bean|toast box|ya kun|cafe/.test(name)) return 'Cafes';
    if (/uniqlo|zara|h&m|cotton on/.test(name)) return 'Retail';
    if (/guardian|watsons|unity|pharmacy/.test(name)) return 'Health & Beauty';

    return 'Others';
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
      const detectedCategory = category || additionalFields?.category || this.getCategoryFromMerchant(merchantName);
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

   /** File selection & preview */
   onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result;
      reader.readAsDataURL(file);
      this.ocrText = '';
      this.extractedData = null;
      
      // Notify the camera service about the selected file
      this.cameraService.notifyFileSelected(file);
    }
  }

   /** Upload image for OCR */
   uploadImage(): void {
    if (!this.selectedFile) return console.error("No file selected!");
    
    this.isProcessing = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<any>(`${this.apiUrl}/ocr/scan`, formData).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
          this.extractedData = response;
          this.ocrText = response.fullText || "No additional text extracted.";
        } else {
          this.ocrText = "Error processing image. Please try again.";
        }
      },
      error: () => {
        this.isProcessing = false;
        this.ocrText = "Error processing image. Please try again.";
      }
    });
  }
  
  saveReceipt() {
    if (!this.extractedData || !this.extractedData.merchantName || !this.extractedData.totalAmount || !this.extractedData.dateOfPurchase) {
      alert("Incomplete receipt data. Please try again.");
      return;
    }
  
    this.isProcessing = true;
    // Show a more specific processing message
    this.processingMessage = "Saving your receipt...";
    
    // First, try to get user from Firebase auth service directly
    const firebaseUser = this.firebaseAuthService.getCurrentUser();
    const currentUser = firebaseUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Determine category based on merchant name
    const category = this.extractedData.category || this.determineCategoryFromMerchant(this.extractedData.merchantName);
    
    // Create receipt object based on our updated model
    const receiptData = {
      userId: currentUser.id || '1',
      merchantName: this.extractedData.merchantName,
      totalAmount: this.extractedData.totalAmount,
      dateOfPurchase: this.extractedData.dateOfPurchase,
      category: category,
      imageUrl: this.imagePreview, // Store the image preview URL
      items: this.extractedData.items || [], // Include items if available
      additionalFields: {
        fullText: this.extractedData.fullText || this.ocrText,
        // Include any other fields from extracted data
        ...Object.entries(this.extractedData)
          .filter(([key]) => !['merchantName', 'totalAmount', 'dateOfPurchase', 'category', 'items', 'fullText'].includes(key))
          .reduce((obj, [key, value]) => ({...obj, [key]: value}), {})
      }
    };
  
    this.http.post(`${this.apiUrl}/receipts`, receiptData)
      .subscribe({
        next: (response: any) => {
          console.log('Receipt saved:', response);
          
          // Update the processing message to show next step
          this.processingMessage = "Finding matching promotions...";
          
          // Extract receipt and points data from response
          const savedReceipt = response.receipt;
          const pointsAwarded = response.pointsAwarded || 0;
          
          // Store the recently saved receipt for reference
          this.recentlySavedReceipt = {
            ...receiptData,
            id: savedReceipt.id
          };
          
          // Update monthly expenses with the new receipt amount
          this.monthlyExpenses += this.extractedData.totalAmount;
          
          // Customize notification message to include points
          this.successNotificationMessage = `Receipt saved! You earned ${pointsAwarded} points.`;
          
          // Show the success notification
          this.showNotification();
  
          // Fetch matching promotions for the receipt
          this.fetchMatchingPromotions(this.extractedData.merchantName, category, savedReceipt.id);
          
          // Also refresh the recommended promotions as we have a new receipt
          this.loadUserReceiptHistory();
        },
        error: (error) => {
          console.error('Error saving receipt:', error);
          alert('Failed to save receipt. Please try again.');
          this.isProcessing = false;
          this.processingMessage = "";
        }
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
            this.isProcessing = false;
            this.processingMessage = "";
            
            // Clear the receipt data
            this.resetScanner();
          } else {
            // Update processing message for fallback attempt
            this.processingMessage = "Searching for more promotions...";
            
            // If no promotions found, try fallback to receipt-based API
            this.fetchPromotionsByReceiptId(receiptId);
          }
        },
        error: (error) => {
          console.error('Error fetching matching promotions:', error);
          // Update processing message for fallback attempt
          this.processingMessage = "Searching for more promotions...";
          
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
          this.processingMessage = "Completing...";
          
          // Short timeout to show the final step before clearing
          setTimeout(() => {
            this.isLoadingPromotions = false;
            this.isProcessing = false;
            this.processingMessage = "";
            
            // Clear the receipt data
            this.resetScanner();
          }, 500);
        },
        error: (error) => {
          console.error('Error fetching promotions by receipt ID:', error);
          this.isLoadingPromotions = false;
          this.isProcessing = false;
          this.processingMessage = "";
          
          // Even if promotions fail, clear the scanner
          this.resetScanner();
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
  
  // Reset scanner state
  resetScanner(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrText = '';
    this.extractedData = null;
    this.showFullText = false;
    this.recentlySavedReceipt = null;
  }
  
  // Helper method to determine category from merchant name
  determineCategoryFromMerchant(merchantName: string): string {
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

  // Modified to use the shared service
  triggerFileInput() {
    this.cameraService.triggerFileInput();
  }

  toggleFullText() {
    this.showFullText = !this.showFullText;
  }

  // Update the logout method in HomePage component
  logout() {
    this.firebaseAuthService.signOut()
      .then(() => {
        // The navigation is already handled in the FirebaseAuthService
        console.log("User logged out");
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  }
  
  // Helper method to format currency values
  formatCurrency(value: number): string {
    return value.toFixed(2);
  }
  
  // Helper method to get first name only
  get userFirstName(): string {
    return this.userName.split(' ')[0];
  }
  
  // Calculate if file size is acceptable
  isFileSizeAcceptable(file: File): boolean {
    const maxSizeInMB = 5;
    const fileSizeInMB = file.size / (1024 * 1024);
    return fileSizeInMB <= maxSizeInMB;
  }
  
  // Get file extension
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  // Add this method to handle promotion click
  viewPromotionDetails(promotion: any) {
    this.selectedPromotion = promotion;
  }

  // Add this method to close the promotion details modal
  closePromotionDetails() {
    this.selectedPromotion = null;
  }

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
}