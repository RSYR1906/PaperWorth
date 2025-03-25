import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment.prod';

export interface OcrResult {
  extractedData: any;
  ocrText: string;
}

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private apiUrl = environment.apiUrl;

  public selectedFileSubject = new BehaviorSubject<File | null>(null);
  public imagePreviewSubject = new BehaviorSubject<string | ArrayBuffer | null>(null);
  public extractedDataSubject = new BehaviorSubject<any>(null);
  public ocrTextSubject = new BehaviorSubject<string>('');

  private isProcessingSubject = new BehaviorSubject<boolean>(false);
  private showFullTextSubject = new BehaviorSubject<boolean>(false);
  private processingMessageSubject = new BehaviorSubject<string>('');
  private errorMessageSubject = new BehaviorSubject<string | null>(null);
  private shouldRedirectToHomeSubject = new BehaviorSubject<boolean>(false);

  private imageSelectedSource = new Subject<{ file: File | null, preview: string | ArrayBuffer | null }>();
  private ocrProcessedSource = new Subject<OcrResult | null>();
  private triggerCameraSubject = new Subject<void>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  get selectedFile$(): Observable<File | null> {
    return this.selectedFileSubject.asObservable();
  }

  get imagePreview$(): Observable<string | ArrayBuffer | null> {
    return this.imagePreviewSubject.asObservable();
  }

  get extractedData$(): Observable<any> {
    return this.extractedDataSubject.asObservable();
  }

  get ocrText$(): Observable<string> {
    return this.ocrTextSubject.asObservable();
  }

  get isProcessing$(): Observable<boolean> {
    return this.isProcessingSubject.asObservable();
  }

  get showFullText$(): Observable<boolean> {
    return this.showFullTextSubject.asObservable();
  }

  get processingMessage$(): Observable<string> {
    return this.processingMessageSubject.asObservable();
  }

  get errorMessage$(): Observable<string | null> {
    return this.errorMessageSubject.asObservable();
  }

  get shouldRedirectToHome$(): Observable<boolean> {
    return this.shouldRedirectToHomeSubject.asObservable();
  }

  get triggerCamera$(): Observable<void> {
    return this.triggerCameraSubject.asObservable();
  }

  get imageSelected$(): Observable<{ file: File | null, preview: string | ArrayBuffer | null }> {
    return this.imageSelectedSource.asObservable();
  }

  get ocrProcessed$(): Observable<OcrResult | null> {
    return this.ocrProcessedSource.asObservable();
  }

  get isProcessing(): boolean {
    return this.isProcessingSubject.getValue();
  }

  set isProcessing(value: boolean) {
    this.isProcessingSubject.next(value);
  }

  get processingMessage(): string {
    return this.processingMessageSubject.getValue();
  }

  set processingMessage(value: string) {
    this.processingMessageSubject.next(value);
  }

  get extractedData(): any {
    return this.extractedDataSubject.getValue();
  }

  get ocrText(): string {
    return this.ocrTextSubject.getValue();
  }

  get imagePreview(): string | ArrayBuffer | null {
    return this.imagePreviewSubject.getValue();
  }

  triggerCamera(): void {
    this.triggerCameraSubject.next();
  }

  setError(message: string | null): void {
    this.errorMessageSubject.next(message);
    if (message) {
      this.snackBar.open(message, 'Close', { duration: 5000 });
    }
  }

  redirectToHomepageIfNeeded(): void {
    const shouldRedirect = this.shouldRedirectToHomeSubject.getValue();
    if (shouldRedirect && this.extractedData) {
      const navigationData = {
        extractedData: this.extractedData,
        imagePreview: this.imagePreview,
        ocrText: this.ocrText
      };
      this.shouldRedirectToHomeSubject.next(false);
      this.router.navigate(['/homepage'], { state: navigationData });
    }
  }

  setShouldRedirectToHome(value: boolean): void {
    this.shouldRedirectToHomeSubject.next(value);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files?.[0];
    if (!file) return this.setError('No file selected');

    if (!this.isFileSizeAcceptable(file)) return this.setError('File size exceeds the 5MB limit');

    const validExtensions = ['jpg', 'jpeg', 'png', 'heic', 'pdf'];
    const fileExt = this.getFileExtension(file.name);
    if (!validExtensions.includes(fileExt)) return this.setError('Invalid file type. Please upload an image or PDF');

    this.setError(null);
    this.selectedFileSubject.next(file);

    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result;
      this.imagePreviewSubject.next(preview);
      this.imageSelectedSource.next({ file, preview });
    };
    reader.onerror = () => this.setError('Error reading file');
    reader.readAsDataURL(file);

    this.ocrTextSubject.next('');
    this.extractedDataSubject.next(null);

    const currentRoute = this.router.url;
    this.setShouldRedirectToHome(currentRoute !== '/homepage');
    this.uploadImage();
  }

  uploadImage(): void {
    const file = this.selectedFileSubject.getValue();
    if (!file) return this.setError('No file selected!');

    this.isProcessingSubject.next(true);
    this.processingMessageSubject.next("Processing your receipt...");
    this.errorMessageSubject.next(null);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(`${this.apiUrl}/ocr/scan`, formData)
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (response) => {
          this.isProcessingSubject.next(false);
          if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
            this.extractedDataSubject.next(response);
            this.ocrTextSubject.next(response.fullText || "No additional text extracted.");
            this.ocrProcessedSource.next({ extractedData: response, ocrText: response.fullText || "No additional text extracted." });
            this.redirectToHomepageIfNeeded();
          } else {
            this.ocrTextSubject.next(response?.fullText || "No text extracted");
            this.setError('Could not extract receipt details. Please try again with a clearer image.');
            this.ocrProcessedSource.next(null);
          }
        },
        error: (error) => {
          this.isProcessingSubject.next(false);
          this.processingMessageSubject.next("");
          this.ocrTextSubject.next("Error processing image. Please try again.");
          const errorMessage = error.error?.message || 'Error processing receipt. Please try again.';
          this.setError(errorMessage);
          this.ocrProcessedSource.next(null);
        }
      });
  }

  uploadBase64Image(base64Image: string): void {
    if (!base64Image) return this.setError('No image data provided!');

    this.isProcessingSubject.next(true);
    this.processingMessageSubject.next("Processing your receipt...");
    this.errorMessageSubject.next(null);

    const formattedBase64 = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    this.imagePreviewSubject.next(formattedBase64);

    const currentRoute = this.router.url;
    this.setShouldRedirectToHome(currentRoute !== '/homepage');

    this.http.post<any>(`${this.apiUrl}/ocr/scan/base64`, { base64Image })
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (response) => {
          this.isProcessingSubject.next(false);
          if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
            this.extractedDataSubject.next(response);
            this.ocrTextSubject.next(response.fullText || "No additional text extracted.");
            this.ocrProcessedSource.next({ extractedData: response, ocrText: response.fullText || "No additional text extracted." });
            this.redirectToHomepageIfNeeded();
          } else {
            this.ocrTextSubject.next(response?.fullText || "No text extracted");
            this.setError('Could not extract receipt details. Please try again with a clearer image.');
            this.ocrProcessedSource.next(null);
          }
        },
        error: (error) => {
          this.isProcessingSubject.next(false);
          this.processingMessageSubject.next("");
          this.ocrTextSubject.next("Error processing image. Please try again.");
          const errorMessage = error.error?.message || 'Error processing receipt. Please try again.';
          this.setError(errorMessage);
          this.ocrProcessedSource.next(null);
        }
      });
  }

  saveReceipt(userId: string): Observable<any> {
    const extractedData = this.extractedDataSubject.getValue();
    const imagePreview = this.imagePreviewSubject.getValue();

    if (!extractedData || !extractedData.merchantName || !extractedData.totalAmount || !extractedData.dateOfPurchase) {
      this.setError("Incomplete receipt data. Please try again.");
      return throwError(() => new Error('Incomplete receipt data'));
    }

    this.isProcessingSubject.next(true);
    this.processingMessageSubject.next("Saving your receipt...");

    const category = extractedData.category || this.determineCategoryFromMerchant(extractedData.merchantName);

    const receiptData = {
      userId,
      merchantName: extractedData.merchantName,
      totalAmount: extractedData.totalAmount,
      dateOfPurchase: extractedData.dateOfPurchase,
      category,
      imageUrl: imagePreview,
      additionalFields: {
        fullText: extractedData.fullText || this.ocrTextSubject.getValue(),
        ...Object.entries(extractedData)
          .filter(([key]) => !['merchantName', 'totalAmount', 'dateOfPurchase', 'category', 'fullText'].includes(key))
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
      }
    };

    return this.http.post(`${this.apiUrl}/receipts`, receiptData).pipe(catchError(this.handleError));
  }

  resetScanner(): void {
    this.selectedFileSubject.next(null);
    this.imagePreviewSubject.next(null);
    this.ocrTextSubject.next('');
    this.extractedDataSubject.next(null);
    this.showFullTextSubject.next(false);
    this.isProcessingSubject.next(false);
    this.processingMessageSubject.next('');
    this.errorMessageSubject.next(null);
  }

  toggleFullText(): void {
    this.showFullTextSubject.next(!this.showFullTextSubject.getValue());
  }

  isFileSizeAcceptable(file: File): boolean {
    const maxSizeInMB = 5;
    return file.size / (1024 * 1024) <= maxSizeInMB;
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  determineCategoryFromMerchant(merchantName: string): string {
    if (!merchantName) return 'Others';
    merchantName = merchantName.toLowerCase();

    if (['cold storage', 'fairprice', 'ntuc', 'giant', 'sheng siong'].some(store => merchantName.includes(store))) return 'Groceries';
    if (['mcdonald', 'burger king', 'kfc', 'subway', 'jollibee'].some(ff => merchantName.includes(ff))) return 'Fast Food';
    if (['starbucks', 'coffee bean', 'toast box', 'ya kun', 'cafe'].some(cafe => merchantName.includes(cafe))) return 'Cafes';
    if (['uniqlo', 'zara', 'h&m', 'cotton on'].some(retail => merchantName.includes(retail))) return 'Retail';
    if (['guardian', 'watsons', 'unity', 'pharmacy'].some(health => merchantName.includes(health))) return 'Health & Beauty';

    return 'Others';
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 0) errorMessage = 'Network error. Please check your internet connection.';
      else if (error.status === 413) errorMessage = 'The file is too large. Please try a smaller image.';
      else if (error.status === 415) errorMessage = 'Unsupported file format. Please use JPG, PNG or PDF.';
      else if (error.status >= 500) errorMessage = 'Server error. Please try again later.';
      if (error.error?.message) errorMessage = error.error.message;
    }

    console.error('Error processing receipt:', error);
    return throwError(() => new Error(errorMessage));
  }
}
