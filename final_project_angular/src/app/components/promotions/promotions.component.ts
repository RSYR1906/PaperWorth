import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment.prod';
import { Promotion } from '../../model';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { SavedPromotionsService } from '../../services/saved-promotions.service';

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
  isSaving = false;
  selectedCategory = 'all';
  allPromotions: Promotion[] = [];
  promotionsByCategory: CategoryGroup[] = [];
  filteredPromotions: CategoryGroup[] = [];
  savedPromotions: Promotion[] = [];
  
  // Track saved state for each promotion
  savedPromotionMap: Map<string, boolean> = new Map();

  // Success notification variables
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;

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
    private http: HttpClient,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionsService: SavedPromotionsService
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

    // Fetch the user's saved promotions if logged in
    this.fetchSavedPromotions();
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
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    
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
    console.log("Promotions fetched from backend:", promotions);
    this.allPromotions = this.normalizePromotions(promotions);
    this.organizePromotionsByCategory();
    
    if (promotions.length > 0) {
      this.setDefaultCategory();
    }

    // Initialize filtered promotions based on selected category
    this.selectCategory(this.selectedCategory);
    
    // Check which promotions are saved by the current user
    this.checkSavedPromotions();
  }
  
  private normalizePromotions(promotions: Promotion[]): Promotion[] {
    return promotions.map(promo => {
      if (promo.imageUrl) {
        promo.imageUrl = this.fixImageUrl(promo.imageUrl);
      }
      
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
        
        const categoryExists = this.categories.some(c => c.id === categoryId);
        if (categoryExists) {
          this.selectedCategory = categoryId;
        }
      }
    }
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    
    if (categoryId === 'all') {
      this.filteredPromotions = [...this.promotionsByCategory];
    } else {
      // Find the category name that matches the category ID
      const categoryName = this.categories.find(c => c.id === categoryId)?.name;
      
      // Filter promotions by the selected category
      this.filteredPromotions = this.promotionsByCategory.filter(group => {
        // Convert category names to comparable format for matching
        const groupCategoryLower = group.category.toLowerCase().replace(/\s+/g, '');
        const categoryIdLower = categoryId.toLowerCase();
        const categoryNameLower = categoryName?.toLowerCase().replace(/\s+/g, '') || '';
        
        return groupCategoryLower === categoryIdLower || 
               groupCategoryLower === categoryNameLower ||
               (categoryId === 'health&beauty' && groupCategoryLower === 'health&beauty');
      });
    }
  }

  viewPromotionDetails(promotion: Promotion): void {
    this.selectedPromotion = promotion;
    
    // Check if this promotion is saved by the current user
    const currentUser = this.getCurrentUser();
    if (currentUser?.id) {
      this.savedPromotionsService.isPromotionSaved(currentUser.id, promotion.id)
        .subscribe({
          next: (result) => {
            this.savedPromotionMap.set(promotion.id, result.saved);
          },
          error: (error) => {
            console.error('Error checking saved status:', error);
          }
        });
    }
  }

  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  // Fetch saved promotions for the current user
  fetchSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      return;
    }
    
    this.savedPromotionsService.getSavedPromotions(currentUser.id)
      .subscribe({
        next: (promotions) => {
          this.savedPromotions = promotions;
          
          // Update the saved status map
          promotions.forEach(promo => {
            this.savedPromotionMap.set(promo.id, true);
          });
        },
        error: (error) => {
          console.error('Error fetching saved promotions:', error);
        }
      });
  }

  // Check which promotions are saved by the current user
  private checkSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id || this.allPromotions.length === 0) {
      return;
    }
    
    // Create an array of observables for each promotion
    const checkRequests = this.allPromotions.map(promo => 
      this.savedPromotionsService.isPromotionSaved(currentUser.id, promo.id).pipe(
        tap(result => {
          this.savedPromotionMap.set(promo.id, result.saved);
        }),
        catchError(error => {
          console.error(`Error checking saved status for promotion ${promo.id}:`, error);
          return of({ saved: false });
        })
      )
    );
    
    // Execute all requests in parallel
    forkJoin(checkRequests).subscribe();
  }

  // Check if a promotion is saved
  isPromotionSaved(promotionId: string): boolean {
    return this.savedPromotionMap.get(promotionId) || false;
  }

  // Save Promotion
  // Updated savePromotion method for PromotionsComponent
savePromotion(promotion: any): void {
  const currentUser = this.getCurrentUser();
  if (!currentUser?.id) {
    this.router.navigate(['/login']);
    return;
  }
  
  // Set loading state
  this.isSaving = true;
  
  // Check if already saved
  this.savedPromotionsService.isPromotionSaved(currentUser.id, promotion.id).subscribe({
    next: (result) => {
      if (result.saved) {
        // Already saved
        this.showNotification('This promotion is already saved!');
        this.closePromotionDetails();
        this.isSaving = false;
      } else {
        // Not saved yet, proceed to save
        this.savedPromotionsService.savePromotion(currentUser.id, promotion.id).subscribe({
          next: () => {
            // Force refresh the saved promotions list
            this.savedPromotionsService.refreshUserSavedPromotions(currentUser.id);
            
            // Update local UI state
            promotion.isSaved = true;
            
            // Show success notification
            this.showNotification('Promotion saved successfully!');
            this.closePromotionDetails();
            this.isSaving = false;
          },
          error: (error) => {
            console.error('Error saving promotion:', error);
            this.showNotification('Failed to save promotion. Please try again.');
            this.isSaving = false;
          }
        });
      }
    },
    error: (error) => {
      console.error('Error checking if promotion is saved:', error);
      
      // If we can't check, try to save anyway
      this.savedPromotionsService.savePromotion(currentUser.id, promotion.id).subscribe({
        next: () => {
          // Force refresh the saved promotions list
          this.savedPromotionsService.refreshUserSavedPromotions(currentUser.id);
          
          // Show success notification
          this.showNotification('Promotion saved successfully!');
          this.closePromotionDetails();
          this.isSaving = false;
        },
        error: (saveError) => {
          console.error('Error saving promotion:', saveError);
          this.showNotification('Failed to save promotion. Please try again.');
          this.isSaving = false;
        }
      });
    }
  });
}

  // Remove saved promotion
  removePromotion(promotion: Promotion): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.savedPromotionsService.removePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        // Remove from saved map
        this.savedPromotionMap.set(promotion.id, false);
        
        // Remove from saved promotions array
        this.savedPromotions = this.savedPromotions.filter(p => p.id !== promotion.id);
        
        this.successNotificationMessage = 'Promotion removed from saved list!';
        this.showNotification();
      },
      error: (error) => {
        console.error('Error removing promotion:', error);
        this.successNotificationMessage = 'Failed to remove promotion. Please try again.';
        this.showNotification();
      }
    });
  }

  closePromotionDetails() {
    this.selectedPromotion = null;
  }

  private showNotification(message?: string): void {
    if (message) {
      this.successNotificationMessage = message;
    }
    
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;

    setTimeout(() => {
      this.showSuccessNotification = false;
    }, 3000);
  }
  
  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}