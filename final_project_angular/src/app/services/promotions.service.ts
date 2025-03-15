// src/app/services/promotion.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Promotion } from '../model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = `${environment.apiUrl}/promotions`;

  constructor(private http: HttpClient) { }

  getAllPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(this.apiUrl);
  }

  getPromotionsByCategory(category: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/category/${category}`);
  }

  getPromotionsByMerchant(merchant: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/merchant/${merchant}`);
  }
}