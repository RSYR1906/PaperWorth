// src/app/services/saved-promotions.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap } from 'rxjs';
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

  constructor(private http: HttpClient) { }

  /**
   * Get all saved promotions for a user
   */
  getSavedPromotions(userId: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}`).pipe(
      tap(promotions => {
        console.log('Fetched saved promotions:', promotions);
        // Update the BehaviorSubject with the new data
        this.savedPromotionsSubject.next(promotions);
      }),
      catchError(error => {
        console.error('Error fetching saved promotions:', error);
        // Return current value on error
        return this.savedPromotions$;
      })
    );
  }

  /**
   * Get saved promotions for a user by category
   */
  getSavedPromotionsByCategory(userId: string, category: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}/category/${category}`).pipe(
      catchError(error => {
        console.error('Error fetching saved promotions by category:', error);
        return this.savedPromotions$;
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
        return new Observable<{saved: boolean}>(observer => {
          observer.next({ saved: false });
          observer.complete();
        });
      })
    );
  }

  /**
   * Save a promotion for a user
   */
  savePromotion(userId: string, promotionId: string): Observable<SavedPromotion> {
    return this.http.post<SavedPromotion>(`${this.apiBaseUrl}/${userId}/${promotionId}`, {}).pipe(
      tap(() => {
        console.log(`Saved promotion id=${promotionId} for user=${userId}`);
        // After saving, refresh the list of saved promotions
        this.refreshSavedPromotions(userId);
      }),
      catchError(error => {
        console.error('Error saving promotion:', error);
        throw error; // Rethrow to let component handle it
      })
    );
  }

  /**
   * Remove a saved promotion
   */
  removePromotion(userId: string, promotionId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiBaseUrl}/${userId}/${promotionId}`).pipe(
      tap(() => {
        console.log(`Removed promotion id=${promotionId} for user=${userId}`);
        // Update the list after removal by filtering out the removed promotion
        const currentPromotions = this.savedPromotionsSubject.getValue();
        const updatedPromotions = currentPromotions.filter(promo => promo.id !== promotionId);
        this.savedPromotionsSubject.next(updatedPromotions);
      }),
      catchError(error => {
        console.error('Error removing promotion:', error);
        throw error; // Rethrow to let component handle it
      })
    );
  }
  
  /**
   * Helper method to refresh the saved promotions list
   */
  private refreshSavedPromotions(userId: string): void {
    this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}`).subscribe({
      next: (promotions) => {
        console.log('Refreshed saved promotions:', promotions);
        this.savedPromotionsSubject.next(promotions);
      },
      error: (error) => {
        console.error('Error refreshing saved promotions:', error);
      }
    });
  }

  /**
   * Public method to manually refresh saved promotions
   */
  refreshUserSavedPromotions(userId: string): void {
    this.refreshSavedPromotions(userId);
  }

  /**
   * Get the count of users who saved a promotion
   */
  getSaveCount(promotionId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.apiBaseUrl}/count/${promotionId}`).pipe(
      catchError(error => {
        console.error('Error getting save count:', error);
        return new Observable<{count: number}>(observer => {
          observer.next({ count: 0 });
          observer.complete();
        });
      })
    );
  }
}