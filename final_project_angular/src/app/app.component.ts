// src/app/app.component.ts
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment.prod';
import { firebaseConfig } from './firebaseConfig';
import { CameraService } from './services/camera.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { ReceiptProcessingService } from './services/receipt-processing.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'PaperWorth';
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    public cameraService: CameraService,
    public receiptProcessingService: ReceiptProcessingService
  ) {}

  ngOnInit() {
    console.log('Application starting...');
    console.log('Environment:', environment);
    console.log('Platform:', Capacitor.getPlatform());

    try {
      const app = initializeApp(firebaseConfig);
      console.log('Firebase app initialized');
      
      // For web platform, ensure auth is properly set up
      if (Capacitor.getPlatform() === 'web') {
        console.log('Setting up web authentication...');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
    
    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          if (!this.isReceiptProcessingRoute()) {
            this.cameraService.resetScanner();
          }
        })
    );
    
    this.subscriptions.add(
      this.cameraService.triggerCamera$.subscribe(() => {
        this.triggerFileInput();
      })
    );
    
    this.subscriptions.add(
      this.cameraService.ocrProcessed$.subscribe(result => {
        if (result) {
          console.log('OCR processing result received', result);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  isAuthRoute(): boolean {
    const currentRoute = this.router.url;
    return currentRoute.includes('/login') || 
           currentRoute.includes('/signup') || 
           currentRoute.includes('/forgot-password');
  }

  isReceiptProcessingRoute(): boolean {
    const currentNavigation = this.router.getCurrentNavigation();
    return this.router.url.includes('/homepage') && 
           Object.keys(currentNavigation?.extras?.state || {}).length > 0;
  }

  isAuthenticated(): boolean {
    return this.firebaseAuthService.isAuthenticated();
  }

  logout() {
    this.firebaseAuthService.signOut()
      .then(() => {
        console.log("User logged out");
        this.router.navigate(['/login']);
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  }

  triggerFileInput() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    } else {
      console.error("File input element not found or not yet initialized");
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (event) => this.onFileSelected(event);
      input.click();
    }
  }

  onFileSelected(event: any): void {
    if (event && event.target && event.target.files && event.target.files.length > 0) {
      this.cameraService.onFileSelected(event);
    } else {
      console.warn("No file selected or event is invalid");
    }
  }
  
  cancelReceiptProcessing(): void {
    this.receiptProcessingService.cancelReceiptProcessing();
  }
  
  confirmAndSaveReceipt(): void {
    const currentUser = this.firebaseAuthService.getCurrentUser() || 
                       JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.receiptProcessingService.confirmAndSaveReceipt(currentUser.id);
  }
}