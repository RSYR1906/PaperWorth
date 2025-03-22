// src/app/services/camera.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private apiUrl = environment.apiUrl;
  
  // Camera functionality variables
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  extractedData: any = null;
  ocrText = '';
  isProcessing = false;
  showFullText = false;
  processingMessage: string = '';
  
  // Subject to notify app component to open the camera
  private triggerCameraSubject = new Subject<void>();
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}
  
  // Observable that components can subscribe to
  get triggerCamera$(): Observable<void> {
    return this.triggerCameraSubject.asObservable();
  }
  
  // Method to trigger camera from any component
  triggerCamera(): void {
    this.triggerCameraSubject.next();
  }
  
  // Handle file selection
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
          
          // Navigate to the homepage with the extracted data
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

  uploadBase64Image(base64Image: string): void {
    if (!base64Image) {
      this.snackBar.open('No image data provided!', 'Close', { duration: 3000 });
      return;
    }
    
    this.isProcessing = true;
    this.processingMessage = "Processing your receipt...";
    
    // Store the base64 image as preview
    this.imagePreview = base64Image.startsWith('data:') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;
    
    // Send the base64 data to the new endpoint
    this.http.post<any>(`${this.apiUrl}/ocr/scan/base64`, { 
      base64Image: base64Image 
    }).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response?.merchantName && response?.totalAmount && response?.dateOfPurchase) {
          this.extractedData = response;
          this.ocrText = response.fullText || "No additional text extracted.";
          
          // Navigate to the homepage with the extracted data
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

  /**
   * Capture image from device camera and process it
   */
  captureAndProcessImage(): void {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    
    // Handle file selection
    input.onchange = (event) => this.onFileSelected(event);
    
    // Trigger the file input
    input.click();
  }

  resetScanner(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrText = '';
    this.extractedData = null;
    this.showFullText = false;
    this.isProcessing = false;
    this.processingMessage = '';
  }
  
  toggleFullText(): void {
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
}