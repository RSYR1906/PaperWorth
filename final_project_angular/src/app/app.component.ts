// app.component.ts
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FirebaseAuthService } from './services/firebase-auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'PaperWorth';
  isMobile: boolean = false;
  
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private router: Router
  ) {
    // Listen for authentication state changes
    this.firebaseAuthService.currentUser$.subscribe(() => {
      // Handle any UI updates needed when auth state changes
    });
    
    // Close sidenav when navigating on mobile
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile && this.sidenav?.opened) {
        this.sidenav.close();
      }
    });
  }

  ngOnInit(): void {
    // Check screen size on initialization
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 600;
  }

  isAuthenticated(): boolean {
    return this.firebaseAuthService.isAuthenticated();
  }

  logout(): void {
    this.firebaseAuthService.signOut()
      .then(() => {
        console.log("User logged out successfully");
        this.router.navigate(['/login']);
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  }
  
  /**
   * Check if the current route is an authentication route (login or signup)
   * to conditionally show/hide the navigation bar
   */
  isAuthRoute(): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes('/login') || currentUrl.includes('/signup');
  }

  triggerFileInput() {
    const fileInput = this.fileInput.nativeElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: any) {
    // Handle the selected file
    const file = event.target.files[0];
    if (file) {
      // Use your existing logic to process the file
      console.log('File selected:', file.name);
      // Reset file input
      event.target.value = '';
    }
  }
}