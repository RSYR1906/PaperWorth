// src/app/components/saved-promotions/saved-promotions.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, map } from 'rxjs';
import { Promotion } from '../../model';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { SavedPromotionsService } from '../../services/saved-promotions.service';

/**
 * Component for displaying and managing user's saved promotions
 */
@Component({
  selector: 'app-saved-promotions',
  standalone: false,
  templateUrl: './saved-promotions.component.html',
  styleUrls: ['./saved-promotions.component.css']
})
export class SavedPromotionsComponent implements OnInit, OnDestroy {
  isLoading = true;
  selectedPromotion: Promotion | null = null;
  errorMessage: string = '';
  errorType: 'general' | 'network' | 'server' = 'general';

  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  notificationTimer: any = null;

  selectedCategory = 'all';
  categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'groceries', name: 'Groceries' },
    { id: 'retail', name: 'Retail' },
    { id: 'cafes', name: 'Cafes' },
    { id: 'dining', name: 'Dining' },
    { id: 'health&beauty', name: 'Health & Beauty' }
  ];

  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    private savedPromotionsService: SavedPromotionsService
  ) {}

  // Observables declared but will be initialized in ngOnInit
  savedPromotions$!: Observable<Promotion[]>;
  filteredPromotions$!: Observable<Promotion[]>;

  ngOnInit(): void {
    console.log('Auth user:', this.firebaseAuthService.getCurrentUser());
    console.log('Local storage user:', localStorage.getItem('currentUser'));
    this.savedPromotions$ = this.savedPromotionsService.savedPromotions$;
    this.filteredPromotions$ = this.savedPromotions$.pipe(
      map(promotions => this.filterPromotionsByCategory(promotions))
    );

    this.subscriptions.add(
      this.savedPromotionsService.loading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );

    const currentUser = this.getCurrentUser();

    if (!currentUser?.id) {
      // Retry after short delay in case Firebase is still loading
      setTimeout(() => this.ngOnInit(), 300);
      return;
    }

    this.savedPromotionsService.getSavedPromotions(currentUser.id).subscribe();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearNotificationTimer();
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.filteredPromotions$ = this.savedPromotions$.pipe(
      map(promotions => this.filterPromotionsByCategory(promotions))
    );
  }

  viewPromotionDetails(promotion: Promotion): void {
    this.selectedPromotion = promotion;
  }

  closePromotionDetails(): void {
    this.selectedPromotion = null;
  }

  removePromotion(promotion: Promotion): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return;

    this.savedPromotionsService.removePromotion(currentUser.id, promotion.id).subscribe({
      next: () => {
        if (this.selectedPromotion?.id === promotion.id) {
          this.selectedPromotion = null;
        }
        this.showNotificationWithMessage('Promotion removed successfully');
      },
      error: (error) => {
        console.error('Error removing promotion:', error);
        this.handleError(error);
      }
    });
  }

  closeNotification(): void {
    this.showSuccessNotification = false;
    this.clearNotificationTimer();
  }

  isExpiringSoon(expiryDate: string): boolean {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      const now = new Date();
      const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return differenceInDays >= 0 && differenceInDays <= 7;
    } catch (error) {
      return false;
    }
  }

  hasExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      return expiry < new Date();
    } catch (error) {
      return false;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No expiry date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }

  getTimeElapsed(savedAt: string): string {
    if (!savedAt) return '';
    try {
      const savedDate = new Date(savedAt);
      const now = new Date();
      const differenceInSeconds = Math.floor((now.getTime() - savedDate.getTime()) / 1000);
      if (differenceInSeconds < 60) return 'Just now';
      else if (differenceInSeconds < 3600) return `${Math.floor(differenceInSeconds / 60)} minute(s) ago`;
      else if (differenceInSeconds < 86400) return `${Math.floor(differenceInSeconds / 3600)} hour(s) ago`;
      else return `${Math.floor(differenceInSeconds / 86400)} day(s) ago`;
    } catch (error) {
      console.error('Error calculating time elapsed:', error);
      return '';
    }
  }

  loadSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.subscriptions.add(
      this.savedPromotionsService.getSavedPromotions(currentUser.id).subscribe({
        next: () => this.isLoading = false,
        error: (error) => {
          console.error('Error loading saved promotions:', error);
          this.handleError(error);
          this.isLoading = false;
        }
      })
    );
  }

  private filterPromotionsByCategory(promotions: Promotion[]): Promotion[] {
    if (!promotions || !Array.isArray(promotions)) return [];
    if (this.selectedCategory === 'all') return [...promotions];
    const categoryName = this.categories.find(c => c.id === this.selectedCategory)?.name;
    return promotions.filter(p => {
      if (!p.category) return false;
      const promoCat = p.category.toLowerCase().replace(/\s+/g, '');
      const selectedCatId = this.selectedCategory.toLowerCase();
      const selectedCatName = categoryName?.toLowerCase().replace(/\s+/g, '') || '';
      return promoCat === selectedCatId || promoCat === selectedCatName ||
        (this.selectedCategory === 'health&beauty' &&
         ['health&beauty', 'healthandbeauty', 'health', 'beauty'].includes(promoCat));
    });
  }

  private getCurrentUser(): any {
    return this.firebaseAuthService.getCurrentUser() || 
           JSON.parse(localStorage.getItem('currentUser') || '{}');
  }

  private showNotificationWithMessage(message: string): void {
    this.successNotificationMessage = message;
    this.showNotification();
  }

  private showNotification(): void {
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;
    this.clearNotificationTimer();
    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;
      if (this.notificationTimeRemaining <= 0) {
        this.closeNotification();
      }
    }, 60);
  }

  private clearNotificationTimer(): void {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }

  private handleError(error: any): void {
    this.errorMessage = error.message || 'An unexpected error occurred';
    if (!navigator.onLine || error.status === 0) this.errorType = 'network';
    else if (error.status >= 500) this.errorType = 'server';
    else this.errorType = 'general';
  }
}
