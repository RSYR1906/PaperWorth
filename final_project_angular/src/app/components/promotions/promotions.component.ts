import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment.prod';
import { Promotion } from '../../model';
import { CameraService } from '../../services/camera.service'; // Import the camera service
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
export class PromotionsComponent implements OnInit, OnDestroy {
  receivedReceiptId: string | null = null;
  isLoading = false;
  selectedCategory = 'all';
  allPromotions: Promotion[] = [];
  promotionsByCategory: CategoryGroup[] = [];
  filteredPromotions: CategoryGroup[] = [];
  savedPromotions: Promotion[] = [];

  // Success notification variables
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  notificationTimer: any = null;

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
  private fileSelectionSubscription: Subscription | undefined;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionService: SavedPromotionsService,
    private cameraService: CameraService // Inject camera service
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    
    // Subscribe to file selection events from the camera service
    this.fileSelectionSubscription = this.cameraService.fileSelected$.subscribe(file => {
      // Handle the file if needed in this component
      // For now, we just redirect to home component for processing
      this.redirectToHomeWithCamera();
    });
    
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

  ngOnDestroy(): void {
    // Clean up notification timer
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }
    
    // Unsubscribe from camera service
    if (this.fileSelectionSubscription) {
      this.fileSelectionSubscription.unsubscribe();
    }
  }

  // Method to handle file selection
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // Notify the camera service about the file selection
      this.cameraService.notifyFileSelected(file);
      
      // Redirect to the home component for processing
      this.redirectToHomeWithCamera();
    }
  }

  // Method to open camera through the service
  openCamera(): void {
    this.cameraService.triggerFileInput();
  }

  // Method to redirect to home component for camera processing
  redirectToHomeWithCamera(): void {
    this.router.navigate(['/home'], { queryParams: { camera: 'open' } });
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
  }

  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  // Save Promotion
  savePromotion(promotion: any): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }

    const alreadySaved = this.savedPromotions.some(p => p.id === promotion.id);
    if (alreadySaved) {
      alert('This promotion is already saved!');
      return;
    }

    this.savedPromotionService.savePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        const savedPromotion = { ...promotion, savedAt: new Date().toISOString() };
        this.savedPromotions.unshift(savedPromotion);
        
        this.successNotificationMessage = 'Promotion saved successfully!';
        this.showNotification();

        this.closePromotionDetails();
      },
      error: (error) => {
        console.error('Error saving promotion:', error);
        alert('Failed to save promotion. Please try again.');
        
        const savedPromotion = { ...promotion, savedAt: new Date().toISOString() };
        this.savedPromotions.unshift(savedPromotion);
      }
    });
  }

  closePromotionDetails() {
    this.selectedPromotion = null;
  }

  private showNotification(): void {
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
        this.showSuccessNotification = false;
        clearInterval(this.notificationTimer);
      }
    }, 60); // Update every 60ms, will take ~3 seconds to complete
  }
  
  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}