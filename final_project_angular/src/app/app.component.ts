// src/app/app.component.ts
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CameraService } from './services/camera.service';
import { FirebaseAuthService } from './services/firebase-auth.service';

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
    public cameraService: CameraService
  ) {}

  ngOnInit() {
    // Subscribe to router events
    this.subscriptions.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          // Reset camera service when navigating to a new route
          if (!this.isReceiptProcessingRoute()) {
            this.cameraService.resetScanner();
          }
        })
    );
    
    // Subscribe to camera trigger events
    this.subscriptions.add(
      this.cameraService.triggerCamera$.subscribe(() => {
        this.triggerFileInput();
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

  // Camera functionality methods
  triggerFileInput() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    } else {
      console.error("File input element not found or not yet initialized");
      // Fallback for when the ViewChild is not available
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
}