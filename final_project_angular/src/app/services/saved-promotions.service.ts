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
  
  private savedPromotionsSubject = new BehaviorSubject<Promotion[]>([]);
  
  public savedPromotions$ = this.savedPromotionsSubject.asObservable();

  private initialLoadDone = false;
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) { }

  getSavedPromotions(userId: string): Observable<Promotion[]> {
    // Set loading flag
    this.loadingSubject.next(true);
    console.log(`Fetching saved promotions for user ${userId} from ${this.apiBaseUrl}/${userId}`);
    
    return this.http.get<Promotion[]>(`${this.apiBaseUrl}/${userId}`).pipe(
      tap(promotions => {
        console.log('Fetched saved promotions:', promotions);
        this.savedPromotionsSubject.next(promotions);
        this.initialLoadDone = true;
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching saved promotions:', error);
        
        if (!this.initialLoadDone) {
          this.savedPromotionsSubject.next([]);
          this.initialLoadDone = true;
        }
        
        this.loadingSubject.next(false);
        
        return of(this.savedPromotionsSubject.value);
      })
    );
  }

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

  isPromotionSaved(userId: string, promotionId: string): Observable<{saved: boolean}> {
    return this.http.get<{saved: boolean}>(`${this.apiBaseUrl}/${userId}/${promotionId}`).pipe(
      catchError(error => {
        console.error('Error checking if promotion is saved:', error);
        return of({ saved: false });
      })
    );
  }

  savePromotion(userId: string, promotionId: string): Observable<SavedPromotion> {
    console.log(`Saving promotion ${promotionId} for user ${userId}`);
    this.loadingSubject.next(true);
    
    return this.http.post<SavedPromotion>(`${this.apiBaseUrl}/${userId}/${promotionId}`, {}).pipe(
      tap((response) => {
        console.log('Save promotion response:', response);
        this.refreshSavedPromotions(userId);
      }),
      catchError(error => {
        console.error('Error saving promotion:', error);
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  removePromotion(userId: string, promotionId: string): Observable<{message: string}> {
    console.log(`Removing promotion ${promotionId} for user ${userId}`);
    this.loadingSubject.next(true);
    
    return this.http.delete<{message: string}>(`${this.apiBaseUrl}/${userId}/${promotionId}`).pipe(
      tap(() => {
        console.log(`Removed promotion id=${promotionId} for user=${userId}`);
        const currentPromotions = this.savedPromotionsSubject.getValue();
        const updatedPromotions = currentPromotions.filter(promo => promo.id !== promotionId);
        this.savedPromotionsSubject.next(updatedPromotions);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error removing promotion:', error);
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

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

  refreshUserSavedPromotions(userId: string): void {
    this.getSavedPromotions(userId).subscribe();
  }

  getSaveCount(promotionId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.apiBaseUrl}/count/${promotionId}`).pipe(
      catchError(error => {
        console.error('Error getting save count:', error);
        return of({ count: 0 });
      })
    );
  }
  
  getCurrentSavedPromotions(): Promotion[] {
    return this.savedPromotionsSubject.getValue();
  }
  
  isInitialLoadComplete(): boolean {
    return this.initialLoadDone;
  }

  isLoading(): boolean {
    return this.loadingSubject.getValue();
  }
}