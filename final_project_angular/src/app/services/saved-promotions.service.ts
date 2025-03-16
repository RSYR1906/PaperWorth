import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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
        // Update the BehaviorSubject with the new data
        this.savedPromotionsSubject.next(promotions);
      })
    );
  }

  /**
   * Get saved promotions for a user by category
   */
  getSavedPromotionsByCategory(userId: string, category: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}/category/${category}`);
  }

  /**
   * Check if a promotion is saved by a user
   */
  isPromotionSaved(userId: string, promotionId: string): Observable<{saved: boolean}> {
    return this.http.get<{saved: boolean}>(`${this.apiBaseUrl}/${userId}/${promotionId}`);
  }

  /**
   * Save a promotion for a user
   */
  savePromotion(userId: string, promotionId: string): Observable<SavedPromotion> {
    return this.http.post<SavedPromotion>(`${this.apiBaseUrl}/${userId}/${promotionId}`, {}).pipe(
      tap(() => {
        // After saving, refresh the list of saved promotions
        this.refreshSavedPromotions(userId);
      })
    );
  }

  /**
   * Remove a saved promotion
   */
  removePromotion(userId: string, promotionId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiBaseUrl}/${userId}/${promotionId}`).pipe(
      tap(() => {
        // Update the list after removal
        const currentPromotions = this.savedPromotionsSubject.getValue();
        const updatedPromotions = currentPromotions.filter(promo => promo.id !== promotionId);
        this.savedPromotionsSubject.next(updatedPromotions);
      })
    );
  }
  
  /**
   * Helper method to refresh the saved promotions list
   */
  private refreshSavedPromotions(userId: string): void {
    this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}`).subscribe({
      next: (promotions) => {
        this.savedPromotionsSubject.next(promotions);
      },
      error: (error) => {
        console.error('Error refreshing saved promotions:', error);
      }
    });
  }

  /**
   * Get the count of users who saved a promotion
   */
  getSaveCount(promotionId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.apiBaseUrl}/count/${promotionId}`);
  }
}