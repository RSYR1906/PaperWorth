import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { Promotion } from '../model';

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
  
  searchPromotions(query: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/search?query=${encodeURIComponent(query)}`);
  }

  getActivePromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/active`);
  }

  getPromotionByNumericId(promotionId: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.apiUrl}/id/${promotionId}`);
  }

  addPromotion(promotion: Promotion): Observable<Promotion> {
    return this.http.post<Promotion>(this.apiUrl, promotion);
  }

  updatePromotion(id: string, promotion: Promotion): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.apiUrl}/${id}`, promotion);
  }

  deletePromotion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}