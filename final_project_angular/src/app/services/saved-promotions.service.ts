// src/app/services/saved-promotions.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { Promotion, SavedPromotion } from '../model';


@Injectable({
  providedIn: 'root'
})
export class SavedPromotionsService {
  private readonly apiBaseUrl = environment.apiUrl + '/promotions/saved';
  
  // BehaviorSubject to store the current list of saved promotions
  private savedPromotionsSubject = new BehaviorSubject<Promotion[]>([]);
  
  // Observable that components can subscribe to
  public savedPromotions$ = this.savedPromotionsSubject.asObservable();

  // Track if initial load has been done
  private initialLoadDone = false;
  
  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Get all saved promotions for a user
   */
  getSavedPromotions(userId: string): Observable<Promotion[]> {
    // Set loading flag
    this.loadingSubject.next(true);
    console.log(`Fetching saved promotions for user ${userId} from ${this.apiBaseUrl}/${userId}`);
    
    return this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}`).pipe(
      tap(promotions => {
        console.log('Fetched saved promotions:', promotions);
        // Update the BehaviorSubject with the new data
        this.savedPromotionsSubject.next(promotions);
        this.initialLoadDone = true;
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching saved promotions:', error);
        
        // If this is the initial load, set an empty array
        if (!this.initialLoadDone) {
          this.savedPromotionsSubject.next([]);
          this.initialLoadDone = true;
        }
        
        this.loadingSubject.next(false);
        
        // Return current value on error
        return of(this.savedPromotionsSubject.value);
      })
    );
  }

  /**
   * Get saved promotions for a user by category
   */
  getSavedPromotionsByCategory(userId: string, category: string): Observable<Promotion[]> {
    this.loadingSubject.next(true);
    return this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}/category/${category}`).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        console.error('Error fetching saved promotions by category:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Check if a promotion is saved by a user
   */
  isPromotionSaved(userId: string, promotionId: string): Observable<{saved: boolean}> {
    return this.http.get<{saved: boolean}>(`${this.apiBaseUrl}/${userId}/${promotionId}`).pipe(
      catchError(error => {
        console.error('Error checking if promotion is saved:', error);
        return of({ saved: false });
      })
    );
  }

  /**
   * Save a promotion for a user
   */
  savePromotion(userId: string, promotionId: string): Observable<SavedPromotion> {
    console.log(`Saving promotion ${promotionId} for user ${userId}`);
    this.loadingSubject.next(true);
    
    return this.http.post<SavedPromotion>(`${this.apiBaseUrl}/${userId}/${promotionId}`, {}).pipe(
      tap(() => {
        console.log(`Saved promotion id=${promotionId} for user=${userId}`);
        // After saving, refresh the list of saved promotions
        this.refreshSavedPromotions(userId);
      }),
      catchError(error => {
        console.error('Error saving promotion:', error);
        this.loadingSubject.next(false);
        throw error; // Rethrow to let component handle it
      })
    );
  }

  /**
   * Remove a saved promotion
   */
  removePromotion(userId: string, promotionId: string): Observable<{message: string}> {
    console.log(`Removing promotion ${promotionId} for user ${userId}`);
    this.loadingSubject.next(true);
    
    return this.http.delete<{message: string}>(`${this.apiBaseUrl}/${userId}/${promotionId}`).pipe(
      tap(() => {
        console.log(`Removed promotion id=${promotionId} for user=${userId}`);
        // Update the list after removal by filtering out the removed promotion
        const currentPromotions = this.savedPromotionsSubject.getValue();
        const updatedPromotions = currentPromotions.filter(promo => promo.id !== promotionId);
        this.savedPromotionsSubject.next(updatedPromotions);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error removing promotion:', error);
        this.loadingSubject.next(false);
        throw error; // Rethrow to let component handle it
      })
    );
  }
  
  /**
   * Helper method to refresh the saved promotions list
   */
  private refreshSavedPromotions(userId: string): void {
    console.log(`Refreshing saved promotions for user ${userId}`);
    
    this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}`).subscribe({
      next: (promotions) => {
        console.log('Refreshed saved promotions:', promotions);
        this.savedPromotionsSubject.next(promotions);
        this.loadingSubject.next(false);
      },
      error: (error) => {
        console.error('Error refreshing saved promotions:', error);
        this.loadingSubject.next(false);
      }
    });
  }

  /**
   * Public method to manually refresh saved promotions
   */
  refreshUserSavedPromotions(userId: string): void {
    this.loadingSubject.next(true);
    this.refreshSavedPromotions(userId);
  }

  /**
   * Get the count of users who saved a promotion
   */
  getSaveCount(promotionId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.apiBaseUrl}/count/${promotionId}`).pipe(
      catchError(error => {
        console.error('Error getting save count:', error);
        return of({ count: 0 });
      })
    );
  }
  
  /**
   * Get the current saved promotions without making an API call
   */
  getCurrentSavedPromotions(): Promotion[] {
    return this.savedPromotionsSubject.getValue();
  }
  
  /**
   * Check if initial load has been done
   */
  isInitialLoadComplete(): boolean {
    return this.initialLoadDone;
  }
  
  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loadingSubject.getValue();
  }
}