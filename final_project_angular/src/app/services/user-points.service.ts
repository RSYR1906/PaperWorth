import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { PointTransaction, UserPoints } from '../model';

@Injectable({
  providedIn: 'root'
})
export class UserPointsService {
  private apiUrl = `${environment.apiUrl}/user-points`;

  constructor(private http: HttpClient) {}

  getUserPoints(userId: string): Observable<UserPoints> {
    return this.http.get<UserPoints>(`${this.apiUrl}/${userId}`);
  }

  getUserTransactions(userId: string): Observable<PointTransaction[]> {
    return this.http.get<PointTransaction[]>(`${this.apiUrl}/${userId}/transactions`);
  }

  getTransactionsByType(userId: string, type: string): Observable<PointTransaction[]> {
    return this.http.get<PointTransaction[]>(`${this.apiUrl}/${userId}/transactions/type/${type}`);
  }

  getTransactionsBySource(userId: string, source: string): Observable<PointTransaction[]> {
    return this.http.get<PointTransaction[]>(`${this.apiUrl}/${userId}/transactions/source/${source}`);
  }
}