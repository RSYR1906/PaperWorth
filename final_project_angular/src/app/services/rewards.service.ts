// src/app/services/rewards.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PointTransaction, Reward, UserPoints, UserReward } from '../model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class RewardsService {
  private apiUrl = `${environment.apiUrl}/rewards`;

  constructor(private http: HttpClient) { }

  // Get available rewards
  getAvailableRewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/available`).pipe(
      catchError(this.handleError<Reward[]>('getAvailableRewards', []))
    );
  }

  // Get rewards by category
  getRewardsByCategory(category: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/category/${category}`).pipe(
      catchError(this.handleError<Reward[]>(`getRewardsByCategory/${category}`, []))
    );
  }

  // Get rewards a user can afford
  getAffordableRewards(userId: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/affordable/${userId}`).pipe(
      catchError(this.handleError<Reward[]>('getAffordableRewards', []))
    );
  }

  // Get a specific reward
  getRewardById(rewardId: string): Observable<Reward> {
    return this.http.get<Reward>(`${this.apiUrl}/${rewardId}`).pipe(
      catchError(this.handleError<Reward>(`getRewardById/${rewardId}`))
    );
  }

  // Get user points
  getUserPoints(userId: string): Observable<UserPoints> {
    return this.http.get<UserPoints>(`${this.apiUrl}/points/${userId}`).pipe(
      catchError(this.handleError<UserPoints>('getUserPoints'))
    );
  }

  // Get user's redemption history
  getRedemptionHistory(userId: string): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/history/${userId}`).pipe(
      catchError(this.handleError<UserReward[]>('getRedemptionHistory', []))
    );
  }

  // Get user's point transactions
  getPointTransactions(userId: string, days?: number): Observable<PointTransaction[]> {
    let url = `${this.apiUrl}/transactions/${userId}`;
    if (days) {
      url += `?days=${days}`;
    }
    
    return this.http.get<PointTransaction[]>(url).pipe(
      catchError(this.handleError<PointTransaction[]>('getPointTransactions', []))
    );
  }

  // Redeem a reward
  redeemReward(userId: string, rewardId: string): Observable<UserReward> {
    return this.http.post<UserReward>(`${this.apiUrl}/redeem/${userId}/${rewardId}`, {}).pipe(
      tap(_ => console.log(`Redeemed reward id=${rewardId}`)),
      catchError(this.handleError<UserReward>('redeemReward'))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   *
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T): (error: any) => Observable<T> {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      console.error('Error details:', error);
      
      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  claimWelcomeBonus(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/welcome-bonus/${userId}`, {}).pipe(
      tap(response => console.log('Claimed welcome bonus:', response)),
      catchError(this.handleError<any>('claimWelcomeBonus'))
    );
  }
}