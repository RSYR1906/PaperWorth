// Cleaned up version of PromotionsComponent for better readability and organization.
// No logic has been removed or changed.

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
  savedPromotionMap: Map<string, boolean> = new Map();
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  notificationTimer: any;
  selectedPromotion: Promotion | null = null;

  private readonly apiBaseUrl = environment.apiUrl + '/promotions';
  private readonly spacesBaseUrl = 'https://paperworth.sgp1.digitaloceanspaces.com';

  readonly categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'groceries', name: 'Groceries' },
    { id: 'retail', name: 'Retail' },
    { id: 'cafes', name: 'Cafes' },
    { id: 'dining', name: 'Dining' },
    { id: 'health&beauty', name: 'Health & Beauty' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionsService: SavedPromotionsService
  ) {}

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
    this.fetchSavedPromotions();
  }

  fixImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) return 'placeholder-image.jpg';
    if (imageUrl.startsWith('https://')) return imageUrl;
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    return `${this.spacesBaseUrl}/${cleanPath}`;
  }

  fetchPromotionsByMerchantAndCategory(merchant: string, category: string): void {
    const url = `${this.apiBaseUrl}/match?merchant=${encodeURIComponent(merchant)}&category=${encodeURIComponent(category)}`;
    this.fetchPromotions(url, 'by merchant and category').subscribe(promos => this.processPromotions(promos));
  }

  fetchPromotionsByReceiptId(receiptId: string): void {
    const url = `${this.apiBaseUrl}/receipt/${receiptId}`;
    this.fetchPromotions(url, 'by receipt ID').subscribe(promos => {
      this.processPromotions(promos);
      if (promos.length === 0) this.fetchAllPromotions();
    });
  }

  fetchAllPromotions(): void {
    this.fetchPromotions(this.apiBaseUrl, 'all').subscribe(promos => this.processPromotions(promos));
  }

  private fetchPromotions(url: string, source: string): Observable<Promotion[]> {
    this.isLoading = true;
    return this.http.get<Promotion[]>(url).pipe(
      catchError(error => {
        console.error(`Error fetching ${source} promotions:`, error);
        return of([]);
      }),
      finalize(() => this.isLoading = false)
    );
  }

  private processPromotions(promotions: Promotion[]): void {
    this.allPromotions = this.normalizePromotions(promotions);
    this.organizePromotionsByCategory();
    if (promotions.length > 0) this.setDefaultCategory();
    this.selectCategory(this.selectedCategory);
    this.checkSavedPromotions();
  }

  private normalizePromotions(promotions: Promotion[]): Promotion[] {
    return promotions.map(promo => {
      promo.imageUrl = this.fixImageUrl(promo.imageUrl);
      if (!promo.category) {
        const merchant = (promo.merchant || '').toLowerCase();
        const desc = (promo.description || '').toLowerCase();
        if ([merchant, desc].some(text => text.includes('health') || text.includes('pharmacy') || text.includes('guardian') || text.includes('watson') || text.includes('unity'))){
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
      const cat = promo.category || 'Uncategorized';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)?.push(promo);
    });
    this.promotionsByCategory = Array.from(categoryMap.entries()).map(([category, deals]) => ({ category, deals }));
  }

  private setDefaultCategory(): void {
    const firstCategory = this.allPromotions[0]?.category;
    if (!firstCategory) return;
    const categoryId = firstCategory.toLowerCase().replace(/\s+/g, '');
    if (this.categories.some(c => c.id === categoryId)) this.selectedCategory = categoryId;
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    if (categoryId === 'all') {
      this.filteredPromotions = [...this.promotionsByCategory];
    } else {
      const categoryName = this.categories.find(c => c.id === categoryId)?.name;
      this.filteredPromotions = this.promotionsByCategory.filter(group => {
        const groupCat = group.category.toLowerCase().replace(/\s+/g, '');
        return groupCat === categoryId || groupCat === (categoryName?.toLowerCase().replace(/\s+/g, '') || '');
      });
    }
  }

  viewPromotionDetails(promotion: Promotion): void {
    this.selectedPromotion = promotion;
    const currentUser = this.getCurrentUser();
    if (currentUser?.id) {
      this.savedPromotionsService.isPromotionSaved(currentUser.id, promotion.id).subscribe({
        next: res => this.savedPromotionMap.set(promotion.id, res.saved),
        error: err => console.error('Error checking saved status:', err)
      });
    }
  }

  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  fetchSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return;
    this.savedPromotionsService.getSavedPromotions(currentUser.id).subscribe({
      next: promos => {
        this.savedPromotions = promos;
        promos.forEach(promo => this.savedPromotionMap.set(promo.id, true));
      },
      error: err => console.error('Error fetching saved promotions:', err)
    });
  }

  private checkSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id || this.allPromotions.length === 0) return;
    const requests = this.allPromotions.map(promo =>
      this.savedPromotionsService.isPromotionSaved(currentUser.id, promo.id).pipe(
        tap(result => this.savedPromotionMap.set(promo.id, result.saved)),
        catchError(err => {
          console.error(`Error checking saved status for promotion ${promo.id}:`, err);
          return of({ saved: false });
        })
      )
    );
    forkJoin(requests).subscribe();
  }

  isPromotionSaved(promotionId: string): boolean {
    return this.savedPromotionMap.get(promotionId) || false;
  }

  savePromotion(promotion: any): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.isSaving = true;
    this.savedPromotionsService.isPromotionSaved(currentUser.id, promotion.id).subscribe({
      next: result => {
        if (result.saved) {
          this.showNotification('This promotion is already saved!');
          this.closePromotionDetails();
          this.isSaving = false;
        } else {
          this.savedPromotionsService.savePromotion(currentUser.id, promotion.id).subscribe({
            next: () => {
              this.savedPromotionsService.refreshUserSavedPromotions(currentUser.id);
              promotion.isSaved = true;
              this.showNotification('Promotion saved successfully!');
              this.closePromotionDetails();
              this.isSaving = false;
            },
            error: err => {
              console.error('Error saving promotion:', err);
              this.showNotification('Failed to save promotion. Please try again.');
              this.isSaving = false;
            }
          });
        }
      },
      error: err => {
        console.error('Error checking if promotion is saved:', err);
        this.savedPromotionsService.savePromotion(currentUser.id, promotion.id).subscribe({
          next: () => {
            this.savedPromotionsService.refreshUserSavedPromotions(currentUser.id);
            this.showNotification('Promotion saved successfully!');
            this.closePromotionDetails();
            this.isSaving = false;
          },
          error: saveErr => {
            console.error('Error saving promotion:', saveErr);
            this.showNotification('Failed to save promotion. Please try again.');
            this.isSaving = false;
          }
        });
      }
    });
  }

  removePromotion(promotion: Promotion): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.savedPromotionsService.removePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        this.savedPromotionMap.set(promotion.id, false);
        this.savedPromotions = this.savedPromotions.filter(p => p.id !== promotion.id);
        this.showNotification('Promotion removed from saved list!');
      },
      error: err => {
        console.error('Error removing promotion:', err);
        this.showNotification('Failed to remove promotion. Please try again.');
      }
    });
  }

  closePromotionDetails(): void {
    this.selectedPromotion = null;
  }

  showNotification(message?: string): void {
    this.successNotificationMessage = message || 'Action completed successfully';
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;
    if (this.notificationTimer) clearInterval(this.notificationTimer);
    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;
      if (this.notificationTimeRemaining <= 0) this.closeSuccessNotification();
    }, 100);
  }

  closeSuccessNotification(): void {
    this.showSuccessNotification = false;
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }
}
