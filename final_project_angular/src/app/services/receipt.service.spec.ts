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
  ) { }

  /**
   * Get all receipts for a user
   * @param userId User ID
   * @returns Observable with array of receipts
   */
  getUserReceipts(userId: string): Observable<Receipt[]> {
    console.log(`Fetching receipts for user ID: ${userId}`);
    return this.http.get<Receipt[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(receipts => console.log('Received receipts from API:', receipts)),
      catchError(error => {
        console.error('Error fetching user receipts:', error);
        return throwError(() => new Error('Failed to fetch receipts. Please try again.'));
      })
    );
  }

  /**
   * Get recent receipts for a user (sorted by date)
   * @param userId User ID
   * @returns Observable with array of receipts sorted by date
   */
  getRecentUserReceipts(userId: string): Observable<Receipt[]> {
    console.log(`Fetching recent receipts for user ID: ${userId}`);
    return this.http.get<Receipt[]>(`${this.apiUrl}/user/${userId}/recent`).pipe(
      tap(receipts => console.log('Received recent receipts from API:', receipts)),
      catchError(error => {
        console.error('Error fetching recent receipts:', error);
        return throwError(() => new Error('Failed to fetch recent receipts. Please try again.'));
      })
    );
  }

  /**
   * Get receipt by ID
   * @param receiptId Receipt ID
   * @returns Observable with receipt details
   */
  getReceiptById(receiptId: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.apiUrl}/${receiptId}`).pipe(
      tap(receipt => console.log(`Received receipt by ID ${receiptId}:`, receipt)),
      catchError(error => {
        console.error('Error fetching receipt:', error);
        return throwError(() => new Error('Failed to fetch receipt. Please try again.'));
      })
    );
  }

  /**
   * Save a new receipt
   * @param receiptData Receipt data object
   * @returns Observable with saved receipt and points awarded
   */
  saveReceipt(receiptData: any): Observable<{receipt: Receipt, pointsAwarded: number}> {
    console.log('Saving receipt:', receiptData);
    return this.http.post<{receipt: Receipt, pointsAwarded: number}>(this.apiUrl, receiptData).pipe(
      tap(response => console.log('Receipt saved successfully:', response)),
      catchError(error => {
        console.error('Error saving receipt:', error);
        return throwError(() => new Error('Failed to save receipt. Please try again.'));
      })
    );
  }

  /**
   * Delete a receipt
   * @param receiptId Receipt ID
   * @returns Observable with success/failure
   */
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

  /**
   * Check system status (MongoDB connection)
   * @returns Observable with system status information
   */
  checkSystemStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system/check`).pipe(
      tap(status => console.log('System status:', status)),
      catchError(error => {
        console.error('Error checking system status:', error);
        return of({ status: 'error', message: 'Failed to connect to server' });
      })
    );
  }

  /**
   * Get promotions related to a receipt
   * @param receiptId Receipt ID
   * @returns Observable with array of promotions
   */
  getReceiptPromotions(receiptId: string): Observable<any[]> {
    // Note: This endpoint doesn't exist in the provided controller, but keeping it
    // in case it's implemented elsewhere or planned for future implementation
    return this.http.get<any[]>(`${environment.apiUrl}/promotions/receipt/${receiptId}`).pipe(
      tap(promotions => console.log(`Received promotions for receipt ${receiptId}:`, promotions)),
      catchError(error => {
        console.error('Error fetching receipt promotions:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Upload a receipt from form data (for file uploads)
   * @param formData Form data containing receipt image and metadata
   * @returns Observable with saved receipt
   */
  uploadReceiptWithFormData(formData: FormData): Observable<{receipt: Receipt, pointsAwarded: number}> {
    return this.http.post<{receipt: Receipt, pointsAwarded: number}>(this.apiUrl, formData).pipe(
      tap(response => console.log('Receipt upload response:', response)),
      catchError(error => {
        console.error('Error uploading receipt:', error);
        return throwError(() => new Error('Failed to upload receipt. Please try again.'));
      })
    );
  }
}