// src/app/services/receipt.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Receipt } from '../model';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private apiUrl = 'http://localhost:8080/api/receipts';

  constructor(private http: HttpClient) { }

  uploadReceipt(formData: FormData): Observable<Receipt> {
    return this.http.post<Receipt>(this.apiUrl, formData);
  }

  getUserReceipts(userId: string): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.apiUrl}/user/${userId}`);
  }

  getReceiptPromotions(receiptId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${receiptId}/promotions`);
  }
}