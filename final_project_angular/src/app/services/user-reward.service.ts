// src/app/services/user-reward.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { UserReward } from '../model';

@Injectable({
  providedIn: 'root'
})
export class UserRewardService {
  private apiUrl = `${environment.apiUrl}/user-rewards`;

  constructor(private http: HttpClient) {}

  getUserRewards(userId: string): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/${userId}`);
  }

  getUserRewardsByStatus(userId: string, status: string): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/${userId}/status/${status}`);
  }

  getRecentUserRewards(userId: string, days: number = 30): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/${userId}/recent?days=${days}`);
  }

  getExpiringUserRewards(userId: string, days: number = 30): Observable<UserReward[]> {
    return this.http.get<UserReward[]>(`${this.apiUrl}/${userId}/expiring?days=${days}`);
  }
}