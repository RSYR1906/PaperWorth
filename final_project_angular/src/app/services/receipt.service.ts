// src/app/services/receipt.service.ts

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
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
  ) {}

  // Upload receipt - now uses the backend to update budget automatically
  uploadReceipt(formData: FormData): Observable<Receipt> {
    return this.http.post<Receipt>(this.apiUrl, formData).pipe(
      tap(response => console.log('Receipt upload response:', response)),
      catchError(error => {
        console.error('Error uploading receipt:', error);
        return throwError(() => new Error('Failed to upload receipt. Please try again.'));
      })
    );
  }

  // Get user receipts
  getUserReceipts(userId: string): Observable<Receipt[]> {
    console.log(`Fetching receipts for user ID: ${userId}`);
    return this.http.get<Receipt[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(receipts => {
        console.log('Received receipts from API:', receipts);
        this.standardizeReceiptFields(receipts);
      }),
      catchError(error => {
        console.error('Error fetching user receipts:', error);
        return throwError(() => new Error('Failed to fetch receipts. Please try again.'));
      })
    );
  }

  // Get receipt by ID
  getReceiptById(receiptId: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/${receiptId}`).pipe(
      tap(receipt => console.log(`Received receipt by ID ${receiptId}:`, receipt)),
      catchError(error => {
        console.error('Error fetching receipt:', error);
        return throwError(() => new Error('Failed to fetch receipt. Please try again.'));
      })
    );
  }

  // Get promotions for a receipt
  getReceiptPromotions(receiptId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${receiptId}/promotions`).pipe(
      tap(promotions => console.log(`Received promotions for receipt ${receiptId}:`, promotions)),
      catchError(error => {
        console.error('Error fetching receipt promotions:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  // Delete a receipt
  deleteReceipt(receiptId: string): Observable<any> {
    console.log(`Deleting receipt with ID: ${receiptId}`);
    return this.http.delete(`${this.apiUrl}/${receiptId}`).pipe(
      tap(() => console.log(`Receipt ${receiptId} deleted successfully`)),
      catchError(error => {
        console.error('Error deleting receipt:', error);
        return throwError(() => new Error('Failed to delete receipt. Please try again.'));
      })
    );
  }

  // Save a receipt
  saveReceipt(receiptData: any): Observable<{ receipt: Receipt, pointsAwarded: number }> {
    const standardizedReceipt = this.prepareReceiptForBackend(receiptData);
    console.log('Saving receipt with standardized fields:', standardizedReceipt);

    return this.http.post<{ receipt: Receipt, pointsAwarded: number }>(this.apiUrl, standardizedReceipt).pipe(
      tap(response => {
        console.log('Receipt saved successfully:', response);
        if (response.receipt) {
          this.standardizeReceiptFields([response.receipt]);
        }
      }),
      catchError(error => {
        console.error('Error saving receipt:', error);
        return throwError(() => new Error('Failed to save receipt. Please try again.'));
      })
    );
  }

  // Standardize fields in receipt objects
  private standardizeReceiptFields(receipts: any[]): void {
    if (!receipts || !Array.isArray(receipts)) return;

    receipts.forEach(receipt => {
      if (receipt.totalAmount !== undefined && receipt.totalExpense === undefined) {
        receipt.totalExpense = receipt.totalAmount;
      }

      if (receipt.dateOfPurchase && typeof receipt.dateOfPurchase === 'string') {
        try {
          const date = new Date(receipt.dateOfPurchase);
          if (!isNaN(date.getTime())) {
            receipt.dateOfPurchase = date.toISOString();
          }
        } catch (e) {
          console.warn('Could not parse date:', receipt.dateOfPurchase);
        }
      }
    });
  }

  // Prepare receipt data before sending to backend
  private prepareReceiptForBackend(receiptData: any): any {
    const standardizedReceipt: any = { ...receiptData };

    if (standardizedReceipt.totalAmount !== undefined && standardizedReceipt.totalExpense === undefined) {
      standardizedReceipt.totalExpense = standardizedReceipt.totalAmount;
    }

    if (standardizedReceipt.dateOfPurchase) {
      try {
        const date = new Date(standardizedReceipt.dateOfPurchase);
        if (!isNaN(date.getTime())) {
          standardizedReceipt.dateOfPurchase = date.toISOString();
        }
      } catch (e) {
        console.warn('Could not format date:', standardizedReceipt.dateOfPurchase);
      }
    }

    return standardizedReceipt;
  }
}