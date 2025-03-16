import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment.prod';
import { FirebaseAuthService } from './services/firebase-auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'PaperWorth';
  
  // Camera functionality variables
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  extractedData: any = null;
  ocrText = '';
  isProcessing = false;
  showFullText = false;
  processingMessage: string = '';
  
  private apiUrl = `${environment.apiUrl}`;
  private subscriptions = new Subscription();

  constructor(
    private http: HttpClient,
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Subscribe to router events to determine current route
    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          // Additional initialization if needed
        })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  isAuthRoute(): boolean {
    const currentRoute = this.router.url;
    return currentRoute.includes('/login') || 
           currentRoute.includes('/register') || 
           currentRoute.includes('/forgot-password');
  }

  isAuthenticated(): boolean {
    return this.firebaseAuthService.isAuthenticated();
  }

  logout() {
    this.firebaseAuthService.signOut()
      .then(() => {
        console.log("User logged out");
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  }

  // Camera functionality methods moved from HomePage
  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    fileInput?.click();
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      if (!this.isFileSizeAcceptable(file)) {
        this.snackBar.open('File size exceeds the 5MB limit', 'Close', { duration: 3000 });
        return;
      }
      
      const validExtensions = ['jpg', 'jpeg', 'png', 'heic', 'pdf'];
      const fileExt = this.getFileExtension(file.name);
      if (!validExtensions.includes(fileExt)) {
        this.snackBar.open('Invalid file type. Please upload an image or PDF', 'Close', { duration: 3000 });
        return;
      }
      
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result;
      reader.readAsDataURL(file);
      this.ocrText = '';
      this.extractedData = null;
      
      // Automatically upload the image after selection
      this.uploadImage();
    }
  }

  uploadImage(): void {
    if (!this.selectedFile) {
      this.snackBar.open('No file selected!', 'Close', { duration: 3000 });
      return;
    }
    
    this.isProcessing = true;
    this.processingMessage = "Processing your receipt...";
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<any>(`${this.apiUrl}/ocr/scan`, formData).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
          this.extractedData = response;
          this.ocrText = response.fullText || "No additional text extracted.";
          
          // Navigate to the appropriate component for saving the receipt
          // This will depend on your app structure, but typically would go to homepage
          // or a dedicated receipt saving page
          this.router.navigate(['/homepage'], { 
            state: { 
              extractedData: this.extractedData,
              imagePreview: this.imagePreview,
              ocrText: this.ocrText
            } 
          });
        } else {
          this.ocrText = "Error processing image. Please try again.";
          this.snackBar.open('Could not extract receipt details. Please try again.', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('Error processing receipt:', error);
        this.isProcessing = false;
        this.processingMessage = "";
        this.ocrText = "Error processing image. Please try again.";
        this.snackBar.open('Error processing receipt. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  toggleFullText() {
    this.showFullText = !this.showFullText;
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

  resetScanner(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrText = '';
    this.extractedData = null;
    this.showFullText = false;
  }
}