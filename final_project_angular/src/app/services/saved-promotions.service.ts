// src/app/services/saved-promotions.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { FirebaseAuthService } from './firebase-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SavedPromotionsService {
  private apiUrl = `${environment.apiUrl}/promotions`;
  
  constructor(
    private http: HttpClient,
    private firebaseAuthService: FirebaseAuthService
  ) { }
  
  /**
   * Get all saved promotions for the current user
   */
  getSavedPromotions(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/saved/${userId}`).pipe(
      catchError(error => {
        console.error('Error fetching saved promotions:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Save a promotion for the current user
   */
  savePromotion(userId: string, promotionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/saved/${userId}/${promotionId}`, {}).pipe(
      catchError(error => {
        console.error('Error saving promotion:', error);
        throw error;
      })
    );
  }
  
  /**
   * Remove a saved promotion for the current user
   */
  removePromotion(userId: string, promotionId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/saved/${userId}/${promotionId}`).pipe(
      catchError(error => {
        console.error('Error removing saved promotion:', error);
        throw error;
      })
    );
  }
  
  /**
   * Check if a promotion is saved by the current user
   */
  isPromotionSaved(userId: string, promotionId: string): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/saved/${userId}/${promotionId}`).pipe(
      map(response => !!response),
      catchError(error => {
        // 404 means not saved
        return of(false);
      })
    );
  }
  
  /**
   * Get the current user ID
   */
  getCurrentUserId(): string | null {
    const currentUser = this.firebaseAuthService.getCurrentUser() || 
                       JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser?.id || null;
  }
}