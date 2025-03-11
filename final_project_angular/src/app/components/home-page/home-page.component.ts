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
  userName = ""; // Will be loaded from user data
  monthlyExpenses = 0; // Will be fetched from budget service
  extractedData: any = null;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  ocrText: string = '';
  isProcessing: boolean = false;
  showFullText: boolean = false;
  recentlySavedReceipt: any = null;
  matchingPromotions: any[] = [];
  isLoadingPromotions: boolean = false;
  userReceiptHistory: any[] = [];
  recommendedPromotions: any[] = [];
  isLoadingRecommendations: boolean = false;
  selectedPromotion: any = null;
  isLoadingBudget: boolean = false;

  // Backup promotions in case no personalized recommendations are available
  fallbackPromotionsByCategory = [];
  
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
  
  loadUserData(): void {
    // First, try to get user from Firebase auth service directly
    const firebaseUser = this.firebaseAuthService.getCurrentUser();
    
    if (firebaseUser && firebaseUser.name) {
      this.userName = firebaseUser.name;
    } else {
      // Fall back to localStorage if Firebase auth doesn't have the user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      if (currentUser && currentUser.name) {
        this.userName = currentUser.name;
      } else if (currentUser && currentUser.id) {
        // If we have userId but no name, set a default name
        this.userName = "User";
      }
    }
    
    // Load budget data if user is logged in
    const currentUser = firebaseUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (currentUser && currentUser.id) {
      this.isLoadingBudget = true;
      
      // Get the current month in YYYY-MM format
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      this.budgetService.loadUserBudget(currentUser.id, currentMonthYear)
        .subscribe({
          next: (budget) => {
            if (budget) {
              this.monthlyExpenses = budget.totalSpent;
            }
            this.isLoadingBudget = false;
          },
          error: (error) => {
            console.error('Error loading budget data:', error);
            this.isLoadingBudget = false;
          }
        });
    }
  }
  
  loadUserReceiptHistory(): void {
    // First, try to get user from Firebase auth service directly
    const firebaseUser = this.firebaseAuthService.getCurrentUser();
    const currentUser = firebaseUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser || !currentUser.id) {
      // If no user is logged in, use fallback promotions
      this.getRecommendedPromotionsFromCategories([]);
      return;
    }
    
    this.isLoadingRecommendations = true;
    
    // Fetch user's past receipts
    this.http.get<any[]>(`http://localhost:8080/api/receipts/user/${currentUser.id}`)
      .subscribe({
        next: (receipts) => {
          console.log('User receipt history:', receipts);
          this.userReceiptHistory = receipts;
          
          // Generate categories based on user's receipt history
          const frequentCategories = this.analyzeReceiptHistory(receipts);
          
          // Fetch promotions based on these categories
          this.getRecommendedPromotionsFromCategories(frequentCategories);
        },
        error: (error) => {
          console.error('Error fetching user receipt history:', error);
          this.isLoadingRecommendations = false;
          
          // Fallback to default promotions
          this.getRecommendedPromotionsFromCategories([]);
        }
      });
  }
  
  analyzeReceiptHistory(receipts: any[]): string[] {
    // Count occurrences of each category
    const categoryCounts: {[key: string]: number} = {};
    
    receipts.forEach(receipt => {
      // Look for category in receipt or additional fields
      const category = receipt.category || 
                       (receipt.additionalFields && receipt.additionalFields.category) || 
                       this.determineCategoryFromMerchant(receipt.merchantName);
      
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
    
    // Sort categories by frequency (most frequent first)
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Return top 3 categories, or fewer if there aren't enough
    return sortedCategories.slice(0, 3);
  }
  
  getRecommendedPromotionsFromCategories(categories: string[]): void {
    if (categories.length === 0) {
      // If no categories, use fallback promotions
      this.recommendedPromotions = this.fallbackPromotionsByCategory;
      this.isLoadingRecommendations = false;
      return;
    }
    
    // Create an array to store all the category groups with promotions
    const categoryPromotionsArray: any[] = [];
    
    // Track how many requests have completed
    let completedRequests = 0;
    
    // Process each category
    categories.forEach(category => {
      this.promotionService.getPromotionsByCategory(category)
        .subscribe({
          next: (promotions) => {
            console.log(`Promotions for ${category}:`, promotions);
            
            // Group the promotions by category
            if (promotions && promotions.length > 0) {
              categoryPromotionsArray.push({
                name: category,
                deals: promotions
              });
            }
          },
          error: (error) => {
            console.error(`Error fetching promotions for ${category}:`, error);
          },
          complete: () => {
            // Increment completed count
            completedRequests++;
            
            // If all requests are done, finalize the recommendations
            if (completedRequests === categories.length) {
              this.finalizeRecommendations(categoryPromotionsArray);
            }
          }
        });
    });
  }
  
  finalizeRecommendations(categoryPromotions: any[]): void {
    // If we have promotions, use them
    if (categoryPromotions.length > 0) {
      this.recommendedPromotions = categoryPromotions;
    } else {
      // Otherwise fall back to defaults
      this.recommendedPromotions = this.fallbackPromotionsByCategory;
    }
    
    this.isLoadingRecommendations = false;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.selectedFile = file;

      // Show image preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
      
      // Clear previous OCR results
      this.ocrText = '';
      this.extractedData = null;
    }
  }

  uploadImage() {
    if (!this.selectedFile) {
      console.error("No file selected!");
      return;
    }
  
    this.isProcessing = true;
  
    const formData = new FormData();
    formData.append('file', this.selectedFile);
  
    // Upload image to OCR backend
    this.http.post<any>('http://localhost:8080/api/ocr/scan', formData)
      .subscribe({
        next: (response) => {
          this.isProcessing = false;
          
          // Ensure extractedData is only set from API response
          if (response && response.merchantName && response.totalAmount && response.dateOfPurchase) {
            this.extractedData = response;
            this.ocrText = response.fullText || "No additional text extracted.";
          } else {
            console.error("Invalid response format:", response);
            this.ocrText = "Error processing image. Please try again.";
          }
        },
        error: (error) => {
          this.isProcessing = false;
          console.error('Error processing image:', error);
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
        next: (response) => {
          console.log('Receipt saved:', response);
          const receiptId = (response as any).id;
          
          // Store the recently saved receipt for reference
          this.recentlySavedReceipt = {
            ...receiptData,
            id: receiptId
          };
          
          // Update monthly expenses with the new receipt amount
          this.monthlyExpenses += this.extractedData.totalAmount;
          
          // Instead of navigating, fetch matching promotions
          this.fetchMatchingPromotions(this.extractedData.merchantName, category, receiptId);
          
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
}