import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { PointTransaction, Reward, UserPoints, UserReward } from '../model';

@Injectable({
  providedIn: 'root'
})
export class RewardsService {
  private apiUrl = `${environment.apiUrl}/rewards`;

  constructor(private http: HttpClient) { }

  getAvailableRewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/available`).pipe(
      catchError(this.handleError<Reward[]>('getAvailableRewards', []))
    );
  }

  getRewardsByCategory(category: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/category/${category}`).pipe(
      catchError(this.handleError<Reward[]>(`getRewardsByCategory/${category}`, []))
    );
  }

  getAffordableRewards(userId: string): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.apiUrl}/affordable/${userId}`).pipe(
      catchError(this.handleError<Reward[]>('getAffordableRewards', []))
    );
  }

  getRewardById(rewardId: string): Observable<Reward> {
    return this.http.get<Reward>(`${this.apiUrl}/${rewardId}`).pipe(
      catchError(this.handleError<Reward>(`getRewardById/${rewardId}`))
    );
  }

  getUserPoints(userId: string): Observable<UserPoints> {
    return this.http.get<UserPoints>(`${this.apiUrl}/points/${userId}`).pipe(
      catchError(this.handleError<UserPoints>('getUserPoints'))
    );
  }

  getRedemptionHistory(userId: string): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/history/${userId}`).pipe(
      catchError(this.handleError<UserReward[]>('getRedemptionHistory', []))
    );
  }

  getPointTransactions(userId: string, days?: number): Observable<PointTransaction[]> {
    let url = `${this.apiUrl}/transactions/${userId}`;
    if (days) {
      url += `?days=${days}`;
    }
    
    return this.http.get<PointTransaction[]>(url).pipe(
      catchError(this.handleError<PointTransaction[]>('getPointTransactions', []))
    );
  }

  redeemReward(userId: string, rewardId: string): Observable<UserReward> {
    return this.http.post<UserReward>(`${this.apiUrl}/redeem/${userId}/${rewardId}`, {}).pipe(
      tap(_ => console.log(`Redeemed reward id=${rewardId}`)),
      catchError(this.handleError<UserReward>('redeemReward'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T): (error: any) => Observable<T> {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      console.error('Error details:', error);

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