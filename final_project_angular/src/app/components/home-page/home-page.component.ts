import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BudgetService } from '../../services/budget.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { PromotionService } from '../../services/promotions.service';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {
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
  successNotificationMessage: string = 'Receipt saved successfully!';

  
  constructor(
    private http: HttpClient, 
    private router: Router, 
    private promotionService: PromotionService,
    private budgetService: BudgetService,
    private firebaseAuthService: FirebaseAuthService
  ) {}

  ngOnInit(): void {
    // Load user data
    this.loadUserData();
    // Load user's receipt history when component initializes
    this.loadUserReceiptHistory();
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
    this.http.get<any[]>(`http://localhost:8080/api/receipts/user/${currentUser.id}`).subscribe({
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
    }
  }

   /** Upload image for OCR */
   uploadImage(): void {
    if (!this.selectedFile) return console.error("No file selected!");
    
    this.isProcessing = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<any>('http://localhost:8080/api/ocr/scan', formData).subscribe({
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
  
  // src/app/components/home-page/home-page.component.ts - Update saveReceipt method
saveReceipt() {
  if (!this.extractedData || !this.extractedData.merchantName || !this.extractedData.totalAmount || !this.extractedData.dateOfPurchase) {
    alert("Incomplete receipt data. Please try again.");
    return;
  }

  this.isProcessing = true;
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

  this.http.post('http://localhost:8080/api/receipts', receiptData)
    .subscribe({
      next: (response: any) => {
        console.log('Receipt saved:', response);
        
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
      }
    });
}

  // Method to fetch matching promotions and add them to recommendations
  fetchMatchingPromotions(merchant: string, category: string, receiptId: string) {
    this.isLoadingPromotions = true;
    
    // Use the match endpoint to find promotions by merchant or category
    this.http.get<any[]>(`http://localhost:8080/api/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`)
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
            
            // Clear the receipt data
            this.resetScanner();
          } else {
            // If no promotions found, try fallback to receipt-based API
            this.fetchPromotionsByReceiptId(receiptId);
          }
        },
        error: (error) => {
          console.error('Error fetching matching promotions:', error);
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
    this.http.get<any[]>(`http://localhost:8080/api/promotions/receipt/${receiptId}`)
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
          this.isLoadingPromotions = false;
          this.isProcessing = false;
          
          // Clear the receipt data
          this.resetScanner();
        },
        error: (error) => {
          console.error('Error fetching promotions by receipt ID:', error);
          this.isLoadingPromotions = false;
          this.isProcessing = false;
          
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

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    fileInput?.click();
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

  // Add this method to save a promotion
  savePromotion(promotion: any) {
    alert(`Promotion "${promotion.description}" saved! You can access it in your Saved Promotions.`);
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