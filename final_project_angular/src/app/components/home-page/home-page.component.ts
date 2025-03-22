import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { HomeStore } from './home.store';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  providers: [HomeStore]
})
export class HomePageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  constructor(
    public store: HomeStore,
    private router: Router, 
    private firebaseAuthService: FirebaseAuthService
  ) {}

  ngOnInit(): void {
    // Initialize data
    this.store.loadUserData();
    this.store.loadUserReceiptHistory();
    this.store.loadSavedPromotions();
    
    // Check for router state data (camera service integration)
    this.store.checkRouterState();
    
    // Start monitoring router events for camera data
    this.store.monitorRouterEvents();
    
    // Start notification timer when notification appears
    this.store.showSuccessNotification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(show => {
        if (show) {
          this.store.startNotificationTimer();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.cleanup();
  }
  
  // File handling
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.store.setSelectedFile({
          file,
          preview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImage(): void {
    const file = this.store.extract(this.store.selectedFile$);
    if (file) {
      this.store.processOcr(file);
    } else {
      console.error("No file selected!");
    }
  }

  saveReceipt(): void {
    this.store.saveReceipt();
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    fileInput?.click();
  }

  // Promotion handling
  toggleShowMoreSavedPromotions(): void {
    this.store.toggleShowMoreSavedPromotions();
  }

  viewPromotionDetails(promotion: any): void {
    this.store.viewPromotionDetails(promotion);
  }

  closePromotionDetails(): void {
    this.store.closePromotionDetails();
  }

  savePromotion(promotion: any): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.store.savePromotion(promotion);
  }

  removeSavedPromotion(promotionId: string): void {
    this.store.removePromotion(promotionId);
  }

  // UI controls
  toggleFullText(): void {
    this.store.toggleFullText();
  }

  closeSuccessNotification(): void {
    this.store.closeNotification();
  }
  
  openCamera(): void {
    this.store.openCamera();
  }

  // Auth
  logout(): void {
    this.firebaseAuthService.signOut()
      .then(() => {
        console.log("User logged out");
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  }

  // Helper methods
  private getCurrentUser() {
    return this.firebaseAuthService.getCurrentUser() || JSON.parse(localStorage.getItem('currentUser') || '{}');
  }
}