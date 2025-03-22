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
  
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    public cameraService: CameraService // Make public so it can be accessed from template
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

  // Camera functionality methods
  triggerFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    } else {
      console.error("File input element not found");
    }
  }

  onFileSelected(event: any): void {
    this.cameraService.onFileSelected(event);
  }
}