// src/app/services/receipt.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Receipt } from '../model';
import { BudgetService } from './budget.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private apiUrl = `${environment.apiUrl}/receipts`;

  constructor(
    private http: HttpClient,
    private budgetService: BudgetService
  ) { }

  // Upload receipt - now uses the backend to update budget automatically
  uploadReceipt(formData: FormData): Observable<Receipt> {
    return this.http.post<Receipt>(this.apiUrl, formData).pipe(
      catchError(error => {
        console.error('Error uploading receipt:', error);
        return throwError(() => new Error('Failed to upload receipt. Please try again.'));
      })
    );
  }

  // Get user receipts
  getUserReceipts(userId: string): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(error => {
        console.error('Error fetching user receipts:', error);
        return throwError(() => new Error('Failed to fetch receipts. Please try again.'));
      })
    );
  }

  // Get receipt by ID
  getReceiptById(receiptId: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/${receiptId}`).pipe(
      catchError(error => {
        console.error('Error fetching receipt:', error);
        return throwError(() => new Error('Failed to fetch receipt. Please try again.'));
      })
    );
  }

  // Get promotions for a receipt
  getReceiptPromotions(receiptId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${receiptId}/promotions`).pipe(
      catchError(error => {
        console.error('Error fetching receipt promotions:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  deleteReceipt(receiptId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${receiptId}`).pipe(
      catchError(error => {
        console.error('Error deleting receipt:', error);
        return throwError(() => new Error('Failed to delete receipt. Please try again.'));
      })
    );
  }
}