import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {
  userName = "Demo"; // Mock user
  monthlyExpenses = 1248.75; // Mock monthly expenses
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

  // Backup promotions in case no personalized recommendations are available
  fallbackPromotionsByCategory = [
    {
      name: "Fast Food",
      deals: [
        { description: "McDonald's - $6.50 McSpicy Meal", expiry: "March 30, 2025", imageUrl: "promotions/mcdonalds.jpg" },
        { description: "KFC - 2-for-1 Zinger Burgers", expiry: "April 10, 2025", imageUrl: "promotions/kfc.jpg" }
      ]
    },
    {
      name: "Groceries",
      deals: [
        { description: "Giant - Myojo Instant Noodles Assorted", expiry: "March 28, 2025", imageUrl: "promotions/giant.jpg" }
      ]
    }
  ];
  
  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    // Load user's receipt history when component initializes
    this.loadUserReceiptHistory();
  }
  
  loadUserReceiptHistory(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
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
      this.http.get<any[]>(`http://localhost:8080/api/promotions/category/${category}`)
        .subscribe({
          next: (promotions) => {
            console.log(`Promotions for ${category}:`, promotions);
            
            // Add this category and its promotions to our array
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
          if (response && response.merchantName && response.totalAmount && response.date) {
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
    if (!this.extractedData || !this.extractedData.merchantName || !this.extractedData.totalAmount || !this.extractedData.date) {
      alert("Incomplete receipt data. Please try again.");
      return;
    }
  
    this.isProcessing = true;
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Determine category based on merchant name
    const category = this.extractedData.category || this.determineCategoryFromMerchant(this.extractedData.merchantName);
    
    // Create receipt object based on our updated model
    const receiptData = {
      userId: currentUser.id || '1',
      merchantName: this.extractedData.merchantName,
      totalAmount: this.extractedData.totalAmount,
      date: this.extractedData.date,
      scanDate: new Date().toISOString(), // Current time as scan date
      category: category,
      items: this.extractedData.items || [], // Include items if available
      additionalFields: {
        fullText: this.extractedData.fullText || this.ocrText,
        // Include any other fields from extracted data
        ...Object.entries(this.extractedData)
          .filter(([key]) => !['merchantName', 'totalAmount', 'date', 'category', 'items', 'fullText'].includes(key))
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
  
  // New method to fetch matching promotions
  fetchMatchingPromotions(merchant: string, category: string, receiptId: string) {
    this.isLoadingPromotions = true;
    
    // Build the URL with query parameters
    const url = `http://localhost:8080/api/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`;
    
    this.http.get<any[]>(url)
      .subscribe({
        next: (promotions) => {
          console.log('Matching promotions:', promotions);
          this.matchingPromotions = promotions;
          this.isLoadingPromotions = false;
          this.isProcessing = false;
          
          // Clear the receipt data after successfully showing promotions
          this.resetScannerKeepPromotions();
        },
        error: (error) => {
          console.error('Error fetching promotions:', error);
          
          // Fallback to receipt-based API if direct matching fails
          this.fetchPromotionsByReceiptId(receiptId);
        }
      });
  }
  
  // Fallback method if direct matching fails
  fetchPromotionsByReceiptId(receiptId: string) {
    this.http.get<any[]>(`http://localhost:8080/api/promotions/receipt/${receiptId}`)
      .subscribe({
        next: (promotions) => {
          console.log('Promotions by receipt ID:', promotions);
          this.matchingPromotions = promotions;
          this.isLoadingPromotions = false;
          this.isProcessing = false;
          
          // Clear the receipt data after successfully showing promotions
          this.resetScannerKeepPromotions();
        },
        error: (error) => {
          console.error('Error fetching promotions by receipt ID:', error);
          this.isLoadingPromotions = false;
          this.isProcessing = false;
          
          // Even if promotions fail, clear the scanner
          this.resetScannerKeepPromotions();
        }
      });
  }
  
  // Modified reset method that keeps promotions
  resetScannerKeepPromotions(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrText = '';
    this.extractedData = null;
    this.showFullText = false;
  }
  
  // Clear everything including promotions
  resetAll(): void {
    this.resetScannerKeepPromotions();
    this.recentlySavedReceipt = null;
    this.matchingPromotions = [];
  }
  
  // Helper method to determine category from merchant name
  determineCategoryFromMerchant(merchantName: string): string {
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
      return 'Healthcare';
    }
    
    // Default to "Others" if no match
    return 'Others';
  }

  resetScanner(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrText = '';
    this.extractedData = null;
    this.showFullText = false;
  }

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    fileInput?.click();
  }

  toggleFullText() {
    this.showFullText = !this.showFullText;
  }

  logout() {
    // Clear user session
    localStorage.removeItem('currentUser');
    console.log("User logged out");
    this.router.navigate(['']);
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
}