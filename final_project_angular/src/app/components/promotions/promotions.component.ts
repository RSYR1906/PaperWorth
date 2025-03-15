import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment.prod';
import { Promotion } from '../../model';


interface CategoryGroup {
  category: string;
  deals: Promotion[];
}

@Component({
  selector: 'app-promotions',
  standalone: false,
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.css']
})
export class PromotionsComponent implements OnInit {
  receivedReceiptId: string | null = null;
  isLoading = false;
  selectedCategory = 'all';
  allPromotions: Promotion[] = [];
  promotionsByCategory: CategoryGroup[] = [];
  
  // Base URL for Digital Ocean Spaces
  private readonly spacesBaseUrl = 'https://paperworth.sgp1.digitaloceanspaces.com';
  
  // Categories for filter
  readonly categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'groceries', name: 'Groceries' },
    { id: 'retail', name: 'Retail' },
    { id: 'cafes', name: 'Cafes' },
    { id: 'dining', name: 'Dining' },
    { id: 'health&beauty', name: 'Health & Beauty' }
  ];

  // Selected promotion for details view
  selectedPromotion: Promotion | null = null;

  private readonly apiBaseUrl = environment.apiUrl + '/promotions';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.isLoading = true;
    
    this.route.queryParams.subscribe(params => {
      this.receivedReceiptId = params['receiptId'];
      const merchant = params['merchant'];
      const category = params['category'];
      
      if (this.receivedReceiptId) {
        if (merchant && category) {
          this.fetchPromotionsByMerchantAndCategory(merchant, category);
        } else {
          this.fetchPromotionsByReceiptId(this.receivedReceiptId);
        }
      } else {
        this.fetchAllPromotions();
      }
    });
  }
  
  // Method to fix image URLs
  fixImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'promotions/placeholder-image.jpg'; // Fallback to a placeholder
    }
    
    // If it's a full URL beginning with http or https, return as is
    if (imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a relative path, prepend with the correct base URL
    // Remove any leading slash for consistency
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    
    // Return the full URL with the correct base
    return `${this.spacesBaseUrl}/${cleanPath}`;
  }
  
  fetchPromotionsByMerchantAndCategory(merchant: string, category: string): void {
    const url = `${this.apiBaseUrl}/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`;
    this.fetchPromotions(url, 'by merchant and category')
      .subscribe(promotions => {
        this.processPromotions(promotions);
      });
  }
  
  fetchPromotionsByReceiptId(receiptId: string): void {
    const url = `${this.apiBaseUrl}/receipt/${receiptId}`;
    this.fetchPromotions(url, 'by receipt ID')
      .subscribe(promotions => {
        this.processPromotions(promotions);
        
        // If no promotions were found, fall back to all promotions
        if (promotions.length === 0) {
          this.fetchAllPromotions();
        }
      });
  }
  
  fetchAllPromotions(): void {
    this.fetchPromotions(this.apiBaseUrl, 'all')
      .subscribe(promotions => {
        this.processPromotions(promotions);
      });
  }
  
  private fetchPromotions(url: string, source: string): Observable<Promotion[]> {
    this.isLoading = true;
    
    return this.http.get<Promotion[]>(url).pipe(
      catchError(error => {
        console.error(`Error fetching ${source} promotions:`, error);
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    );
  }
  
  private processPromotions(promotions: Promotion[]): void {
    console.log("Promotions fetched from backend:", promotions); // Log the fetched promotions
    this.allPromotions = this.normalizePromotions(promotions);
    this.organizePromotionsByCategory();
    
    if (promotions.length > 0) {
      this.setDefaultCategory();
    }
  }
  
  // Normalize promotions data to ensure consistent field names
  private normalizePromotions(promotions: Promotion[]): Promotion[] {
    return promotions.map(promo => {
      // Fix the image URL
      if (promo.imageUrl) {
        promo.imageUrl = this.fixImageUrl(promo.imageUrl);
      }
      
      // Auto-categorize health & beauty items
      if (!promo.category) {
        const merchantText = (promo.merchant || '').toLowerCase();
        const descriptionText = (promo.description || '').toLowerCase();
        
        if (merchantText.includes('unity') || 
            merchantText.includes('watson') || 
            merchantText.includes('pharmacy') || 
            merchantText.includes('guardian') ||
            descriptionText.includes('health') || 
            descriptionText.includes('pharmacy')) {
          promo.category = 'Health & Beauty';
        } else {
          promo.category = 'Uncategorized';
        }
      }
      
      return promo;
    });
  }
  
  // Organize promotions by category
  private organizePromotionsByCategory(): void {
    const categoryMap = new Map<string, Promotion[]>();
    
    this.allPromotions.forEach(promo => {
      const category = promo.category || 'Uncategorized';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      
      categoryMap.get(category)?.push(promo);
    });
    
    this.promotionsByCategory = Array.from(categoryMap.entries()).map(([category, promos]) => ({
      category,
      deals: promos
    }));
  }
  
  private setDefaultCategory(): void {
    if (this.allPromotions.length > 0) {
      const firstCategory = this.allPromotions[0]?.category;
      
      if (firstCategory) {
        const categoryId = firstCategory.toLowerCase().replace(/\s+/g, '');
        
        // Only set if the category exists in our predefined categories
        const categoryExists = this.categories.some(c => c.id === categoryId);
        if (categoryExists) {
          this.selectedCategory = categoryId;
        }
      }
    }
  }
  
  // Get promotions filtered by selected category
  get filteredPromotions(): CategoryGroup[] {
    if (!this.promotionsByCategory.length) {
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
  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }
  
  // View promotion details
  viewPromotionDetails(promotion: Promotion): void {
    this.selectedPromotion = promotion;
  }
  
  // Close promotion details
  closePromotionDetails(): void {
    this.selectedPromotion = null;
  }
  
  // Save promotion (would integrate with backend)
  savePromotion(promotion: Promotion): void {
    alert(`Promotion "${promotion.description}" saved! You can access it in your Saved Promotions.`);
  }
  
  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}