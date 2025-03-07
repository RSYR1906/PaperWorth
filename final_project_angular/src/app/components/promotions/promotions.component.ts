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
    
    // Check if we received a receipt ID
    this.route.queryParams.subscribe(params => {
      this.receivedReceiptId = params['receiptId'];
      
      if (this.receivedReceiptId) {
        // Fetch promotions based on receipt ID
        this.http.get<any[]>(`http://localhost:8080/api/promotions/receipt/${this.receivedReceiptId}`)
          .subscribe({
            next: (data) => {
              console.log('Received data:', data);
              this.allPromotions = data;
              this.setDefaultCategory();
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Error fetching promotions:', error);
              this.isLoading = false;
              this.fetchAllPromotions(); // Fallback
            }
          });
      } else {
        // Fetch all promotions
        this.fetchAllPromotions();
      }
    });
  }
  
  fetchAllPromotions() {
    this.http.get<any[]>('http://localhost:8080/api/promotions')
      .subscribe({
        next: (data) => {
          console.log('Received all promotions:', data);
          this.allPromotions = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching promotions:', error);
          this.isLoading = false;
          // You can keep your original hardcoded data as a fallback
        }
      });
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
    if (!this.allPromotions || this.allPromotions.length === 0) {
      return [];
    }
    
    if (this.selectedCategory === 'all') {
      return this.allPromotions;
    }
    
    return this.allPromotions.filter(category => {
      const categoryId = (category.category || '').toLowerCase().replace(/\s+/g, '');
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