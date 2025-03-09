import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-promotions',
  standalone: false,
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.css']
})
export class PromotionsComponent implements OnInit {
  receivedReceiptId: string | null = null;
  isLoading: boolean = false;
  selectedCategory: string = 'all';
  allPromotions: any[] = [];
  promotionsByCategory: any[] = [];
  
  // Categories for filter
  categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'groceries', name: 'Groceries' },
    { id: 'retail', name: 'Retail' },
    { id: 'cafes', name: 'Cafes' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'healthbeauty', name: 'Health & Beauty' },
    { id: 'travel', name: 'Travel' }
  ];

  // Selected promotion for details view
  selectedPromotion: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.isLoading = true;
    
    // Check if we received query parameters
    this.route.queryParams.subscribe(params => {
      this.receivedReceiptId = params['receiptId'];
      const merchant = params['merchant'];
      const category = params['category'];
      
      if (this.receivedReceiptId) {
        // First check for merchant and category parameters
        if (merchant && category) {
          console.log(`Fetching promotions for merchant: ${merchant}, category: ${category}`);
          
          // New endpoint to get promotions by merchant and category
          this.http.get<any[]>(`http://localhost:8080/api/promotions/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`)
            .subscribe({
              next: (data) => {
                console.log('Received matched promotions:', data);
                this.allPromotions = data;
                this.organizePromotionsByCategory();
                this.setDefaultCategory();
                this.isLoading = false;
              },
              error: (error) => {
                console.error('Error fetching matching promotions:', error);
                // Fall back to receipt ID based matching
                if (this.receivedReceiptId) {
                  this.fetchPromotionsByReceiptId(this.receivedReceiptId);
                } else {
                  this.fetchAllPromotions(); // Fallback if somehow receiptId became null
                }
              }
            });
        } else {
          // Fallback to receipt ID if merchant/category not provided
          this.fetchPromotionsByReceiptId(this.receivedReceiptId);
        }
      } else {
        // Fetch all promotions if no receipt context
        this.fetchAllPromotions();
      }
    });
  }
  
  fetchPromotionsByReceiptId(receiptId: string) {
    this.http.get<any[]>(`http://localhost:8080/api/promotions/receipt/${receiptId}`)
      .subscribe({
        next: (data) => {
          console.log('Received data from receipt ID:', data);
          this.allPromotions = data;
          this.organizePromotionsByCategory();
          this.setDefaultCategory();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching promotions by receipt ID:', error);
          this.isLoading = false;
          this.fetchAllPromotions(); // Fallback
        }
      });
  }
  
  fetchAllPromotions() {
    this.http.get<any[]>('http://localhost:8080/api/promotions')
      .subscribe({
        next: (data) => {
          console.log('Received all promotions:', data);
          this.allPromotions = data;
          this.organizePromotionsByCategory();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching promotions:', error);
          this.isLoading = false;
          // You can keep your original hardcoded data as a fallback
        }
      });
  }
  
  // Organize promotions by category
  organizePromotionsByCategory() {
    // Group the flattened promotions by category
    const categoryMap = new Map<string, any[]>();
    
    this.allPromotions.forEach(promo => {
      const category = promo.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(promo);
    });
    
    // Convert map to array of category objects
    this.promotionsByCategory = Array.from(categoryMap.entries()).map(([category, promos]) => ({
      category: category,
      deals: promos
    }));
    
    console.log('Organized promotions by category:', this.promotionsByCategory);
  }
  
  setDefaultCategory() {
    if (this.allPromotions && this.allPromotions.length > 0) {
      const firstCategory = this.allPromotions[0]?.category;
      if (firstCategory) {
        // Convert category name to ID format
        const categoryId = firstCategory.toLowerCase().replace(/\s+/g, '');
        this.selectedCategory = categoryId;
      }
    }
  }
  
  // Get promotions filtered by selected category
  get filteredPromotions() {
    if (!this.promotionsByCategory || this.promotionsByCategory.length === 0) {
      return [];
    }
    
    if (this.selectedCategory === 'all') {
      return this.promotionsByCategory;
    }
    
    return this.promotionsByCategory.filter(categoryGroup => {
      const categoryId = categoryGroup.category.toLowerCase().replace(/\s+/g, '');
      return categoryId === this.selectedCategory;
    });
  }
  
  // Select category for filtering
  selectCategory(categoryId: string) {
    this.selectedCategory = categoryId;
  }
  
  // View promotion details
  viewPromotionDetails(promotion: any) {
    this.selectedPromotion = promotion;
  }
  
  // Close promotion details
  closePromotionDetails() {
    this.selectedPromotion = null;
  }
  
  // Save promotion (would integrate with backend)
  savePromotion(promotion: any) {
    alert(`Promotion "${promotion.description}" saved! You can access it in your Saved Promotions.`);
  }
  
  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}