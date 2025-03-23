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
  
  // Camera functionality variables
  // These are exposed to allow direct manipulation in components
  public selectedFileSubject = new BehaviorSubject<File | null>(null);
  public imagePreviewSubject = new BehaviorSubject<string | ArrayBuffer | null>(null);
  public extractedDataSubject = new BehaviorSubject<any>(null);
  public ocrTextSubject = new BehaviorSubject<string>('');
  
  private isProcessingSubject = new BehaviorSubject<boolean>(false);
  private showFullTextSubject = new BehaviorSubject<boolean>(false);
  private processingMessageSubject = new BehaviorSubject<string>('');
  private errorMessageSubject = new BehaviorSubject<string | null>(null);
  private shouldRedirectToHomeSubject = new BehaviorSubject<boolean>(false);
  
  // Observable to emit when image is selected and processed
  private imageSelectedSource = new Subject<{file: File | null, preview: string | ArrayBuffer | null}>();
  private ocrProcessedSource = new Subject<OcrResult | null>();
  
  // Subject to notify app component to open the camera
  private triggerCameraSubject = new Subject<void>();
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}
  
  // Observable getters
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
  
  // Observable that app component subscribes to
  get triggerCamera$(): Observable<void> {
    return this.triggerCameraSubject.asObservable();
  }
  
  get imageSelected$(): Observable<{file: File | null, preview: string | ArrayBuffer | null}> {
    return this.imageSelectedSource.asObservable();
  }
  
  get ocrProcessed$(): Observable<OcrResult | null> {
    return this.ocrProcessedSource.asObservable();
  }
  
  // Direct getters (for backward compatibility)
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
  
  // Method to trigger camera from any component
  triggerCamera(): void {
    this.triggerCameraSubject.next();
  }
  
  setError(message: string | null): void {
    this.errorMessageSubject.next(message);
    if (message) {
      this.snackBar.open(message, 'Close', { duration: 5000 });
    }
  }
  
  // Redirect to homepage if needed - call this after successful processing
  redirectToHomepageIfNeeded(): void {
    const shouldRedirect = this.shouldRedirectToHomeSubject.getValue();
    if (shouldRedirect && this.extractedData) {
      // Prepare navigation data
      const navigationData = {
        extractedData: this.extractedData,
        imagePreview: this.imagePreview,
        ocrText: this.ocrText
      };
      
      // Reset the flag immediately to prevent multiple redirects
      this.shouldRedirectToHomeSubject.next(false);
      
      // Navigate to home page with the processed data
      this.router.navigate(['/homepage'], { 
        state: navigationData
      });
    }
  }
  
  // Set whether redirection is needed
  setShouldRedirectToHome(value: boolean): void {
    this.shouldRedirectToHomeSubject.next(value);
  }
  
  // Handle file selection
  onFileSelected(event: any): void {
    const file: File = event.target.files?.[0];
    if (!file) {
      this.setError('No file selected');
      return;
    }
    
    if (!this.isFileSizeAcceptable(file)) {
      this.setError('File size exceeds the 5MB limit');
      return;
    }
    
    const validExtensions = ['jpg', 'jpeg', 'png', 'heic', 'pdf'];
    const fileExt = this.getFileExtension(file.name);
    if (!validExtensions.includes(fileExt)) {
      this.setError('Invalid file type. Please upload an image or PDF');
      return;
    }
    
    // Clear any previous error
    this.setError(null);
    
    // Set the selected file
    this.selectedFileSubject.next(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result;
      this.imagePreviewSubject.next(preview);
      
      // Emit the file and preview for other components
      this.imageSelectedSource.next({
        file,
        preview
      });
    };
    
    reader.onerror = () => {
      this.setError('Error reading file');
    };
    
    reader.readAsDataURL(file);
    this.ocrTextSubject.next('');
    this.extractedDataSubject.next(null);
    
    // Check if we're on the homepage already
    const currentRoute = this.router.url;
    this.setShouldRedirectToHome(currentRoute !== '/homepage');
    
    // Automatically upload the image after selection
    this.uploadImage();
  }

  uploadImage(): void {
    const file = this.selectedFileSubject.getValue();
    if (!file) {
      this.setError('No file selected!');
      return;
    }
    
    this.isProcessingSubject.next(true);
    this.processingMessageSubject.next("Processing your receipt...");
    this.errorMessageSubject.next(null);
    
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(`${this.apiUrl}/ocr/scan`, formData)
      .pipe(
        catchError(this.handleError)
      )
      .subscribe({
        next: (response) => {
          this.isProcessingSubject.next(false);
          if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
            this.extractedDataSubject.next(response);
            this.ocrTextSubject.next(response.fullText || "No additional text extracted.");
            
            // Emit the OCR result
            this.ocrProcessedSource.next({
              extractedData: response,
              ocrText: response.fullText || "No additional text extracted."
            });
            
            // Redirect to homepage if we're not already there
            this.redirectToHomepageIfNeeded();
          } else {
            this.ocrTextSubject.next(response?.fullText || "No text extracted");
            this.setError('Could not extract receipt details. Please try again with a clearer image.');
            
            // Emit null result to indicate failure
            this.ocrProcessedSource.next(null);
          }
        },
        error: (error) => {
          this.isProcessingSubject.next(false);
          this.processingMessageSubject.next("");
          this.ocrTextSubject.next("Error processing image. Please try again.");
          
          // Extract error message from response if available
          const errorMessage = error.error?.message || 'Error processing receipt. Please try again.';
          this.setError(errorMessage);
          
          // Emit null result to indicate failure
          this.ocrProcessedSource.next(null);
        }
      });
  }

  uploadBase64Image(base64Image: string): void {
    if (!base64Image) {
      this.setError('No image data provided!');
      return;
    }
    
    this.isProcessingSubject.next(true);
    this.processingMessageSubject.next("Processing your receipt...");
    this.errorMessageSubject.next(null);
    
    // Store the base64 image as preview
    const formattedBase64 = base64Image.startsWith('data:') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;
      
    this.imagePreviewSubject.next(formattedBase64);
    
    // Check if we're on the homepage already
    const currentRoute = this.router.url;
    this.setShouldRedirectToHome(currentRoute !== '/homepage');
    
    // Send the base64 data to the backend
    this.http.post<any>(`${this.apiUrl}/ocr/scan/base64`, { 
      base64Image: base64Image 
    })
    .pipe(
      catchError(this.handleError)
    )
    .subscribe({
      next: (response) => {
        this.isProcessingSubject.next(false);
        if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
          this.extractedDataSubject.next(response);
          this.ocrTextSubject.next(response.fullText || "No additional text extracted.");
          
          // Emit the OCR result
          this.ocrProcessedSource.next({
            extractedData: response,
            ocrText: response.fullText || "No additional text extracted."
          });
          
          // Redirect to homepage if we're not already there
          this.redirectToHomepageIfNeeded();
        } else {
          this.ocrTextSubject.next(response?.fullText || "No text extracted");
          this.setError('Could not extract receipt details. Please try again with a clearer image.');
          
          // Emit null result to indicate failure
          this.ocrProcessedSource.next(null);
        }
      },
      error: (error) => {
        this.isProcessingSubject.next(false);
        this.processingMessageSubject.next("");
        this.ocrTextSubject.next("Error processing image. Please try again.");
        
        // Extract error message from response if available
        const errorMessage = error.error?.message || 'Error processing receipt. Please try again.';
        this.setError(errorMessage);
        
        // Emit null result to indicate failure
        this.ocrProcessedSource.next(null);
      }
    });
  }

  /**
   * Save a processed receipt to the backend
   */
  saveReceipt(userId: string): Observable<any> {
    const extractedData = this.extractedDataSubject.getValue();
    const imagePreview = this.imagePreviewSubject.getValue();
    
    if (!extractedData || !extractedData.merchantName || !extractedData.totalAmount || !extractedData.dateOfPurchase) {
      this.setError("Incomplete receipt data. Please try again.");
      return throwError(() => new Error('Incomplete receipt data'));
    }
    
    this.isProcessingSubject.next(true);
    this.processingMessageSubject.next("Saving your receipt...");
    
    // Determine category based on merchant name if not present
    const category = extractedData.category || this.determineCategoryFromMerchant(extractedData.merchantName);
    
    // Create receipt object
    const receiptData = {
      userId: userId,
      merchantName: extractedData.merchantName,
      totalAmount: extractedData.totalAmount,
      dateOfPurchase: extractedData.dateOfPurchase,
      category: category,
      imageUrl: imagePreview, // Store the image preview URL
      additionalFields: {
        fullText: extractedData.fullText || this.ocrTextSubject.getValue(),
        // Include any other fields from extracted data
        ...Object.entries(extractedData)
          .filter(([key]) => !['merchantName', 'totalAmount', 'dateOfPurchase', 'category', 'fullText'].includes(key))
          .reduce((obj, [key, value]) => ({...obj, [key]: value}), {})
      }
    };
    
    return this.http.post(`${this.apiUrl}/receipts`, receiptData).pipe(
      catchError(this.handleError)
    );
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
    // Don't reset the redirect flag here, as it might be needed elsewhere
  }
  
  toggleFullText(): void {
    const currentValue = this.showFullTextSubject.getValue();
    this.showFullTextSubject.next(!currentValue);
  }
  
  // Helper methods
  isFileSizeAcceptable(file: File): boolean {
    const maxSizeInMB = 5;
    const fileSizeInMB = file.size / (1024 * 1024);
    return fileSizeInMB <= maxSizeInMB;
  }
  
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  /**
   * Determines category based on merchant name
   */
  determineCategoryFromMerchant(merchantName: string): string {
    if (!merchantName) return 'Others';
    
    merchantName = merchantName.toLowerCase();
    
    // Grocery stores
    if (merchantName.includes('cold storage') || 
        merchantName.includes('fairprice') || 
        merchantName.includes('ntuc') || 
        merchantName.includes('giant') || 
        merchantName.includes('sheng siong')) {
      return 'Groceries';
    }
    
    // Fast food
    if (merchantName.includes('mcdonald') || 
        merchantName.includes('burger king') || 
        merchantName.includes('kfc') || 
        merchantName.includes('subway') ||
        merchantName.includes('jollibee')) {
      return 'Fast Food';
    }
    
    // Cafes
    if (merchantName.includes('starbucks') || 
        merchantName.includes('coffee bean') || 
        merchantName.includes('toast box') ||
        merchantName.includes('ya kun') ||
        merchantName.includes('cafe')) {
      return 'Cafes';
    }
    
    // Retail
    if (merchantName.includes('uniqlo') || 
        merchantName.includes('zara') || 
        merchantName.includes('h&m') ||
        merchantName.includes('cotton on')) {
      return 'Retail';
    }
    
    // Healthcare
    if (merchantName.includes('guardian') || 
        merchantName.includes('watsons') || 
        merchantName.includes('unity') ||
        merchantName.includes('pharmacy')) {
      return 'Health & Beauty';
    }
    
    // Default to "Others" if no match
    return 'Others';
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.status === 413) {
        errorMessage = 'The file is too large. Please try a smaller image.';
      } else if (error.status === 415) {
        errorMessage = 'Unsupported file format. Please use JPG, PNG or PDF.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      // Use server message if available
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }
    
    console.error('Error processing receipt:', error);
    return throwError(() => new Error(errorMessage));
  }
}