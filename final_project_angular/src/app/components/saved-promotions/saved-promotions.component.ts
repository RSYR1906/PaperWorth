import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment.prod';
import { CameraService } from '../../services/camera.service'; // Import the camera service
import { FirebaseAuthService } from '../../services/firebase-auth.service';

@Component({
  selector: 'app-saved-promotions',
  standalone: false,
  templateUrl: './saved-promotions.component.html',
  styleUrls: ['./saved-promotions.component.css']
})
export class SavedPromotionsComponent implements OnInit, OnDestroy {
  savedPromotions: any[] = [];
  isLoading = false;
  selectedPromotion: any = null;
  errorMessage: string = '';
  private fileSelectionSubscription: Subscription | undefined;
  
  private apiUrl = `${environment.apiUrl}/promotions`;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    private cameraService: CameraService // Inject camera service
  ) { }

  ngOnInit(): void {
    this.loadSavedPromotions();
    
    // Subscribe to file selection events from the camera service
    this.fileSelectionSubscription = this.cameraService.fileSelected$.subscribe(file => {
      // Redirect to home component for processing
      this.redirectToHomeWithCamera();
    });
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from camera service to prevent memory leaks
    if (this.fileSelectionSubscription) {
      this.fileSelectionSubscription.unsubscribe();
    }
  }
  
  // Method to handle camera button click
  openCamera(): void {
    this.cameraService.triggerFileInput();
  }

  // Method to handle file selection
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // Notify the camera service about the file selection
      this.cameraService.notifyFileSelected(file);
      
      // Redirect to the home component for processing
      this.redirectToHomeWithCamera();
    }
  }

  // Method to redirect to home component for camera processing
  redirectToHomeWithCamera(): void {
    this.router.navigate(['/home'], { queryParams: { camera: 'open' } });
  }
  
  // Load saved promotions for the current user
  loadSavedPromotions(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.isLoading = true;
    
    // Get saved promotions from the user's saved list
    this.http.get<any[]>(`${this.apiUrl}/saved/${currentUser.id}`)
      .subscribe({
        next: (promotions) => {
          this.savedPromotions = promotions;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading saved promotions:', error);
          this.errorMessage = 'Failed to load saved promotions. Please try again.';
          this.isLoading = false;
        }
      });
  }
  
  // Get current user
  private getCurrentUser(): any {
    return this.firebaseAuthService.getCurrentUser() || 
           JSON.parse(localStorage.getItem('currentUser') || '{}');
  }
  
  // View promotion details
  viewPromotionDetails(promotion: any): void {
    this.selectedPromotion = promotion;
  }
  
  // Close promotion details modal
  closePromotionDetails(): void {
    this.selectedPromotion = null;
  }
  
  // Remove promotion from saved list
  removePromotion(promotionId: string): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser?.id) return;
    
    // Confirm before removing
    if (!confirm('Are you sure you want to remove this promotion from your saved list?')) {
      return;
    }
    
    // Remove from API
    this.http.delete(`${this.apiUrl}/saved/${currentUser.id}/${promotionId}`)
      .subscribe({
        next: () => {
          // Remove from local array
          this.savedPromotions = this.savedPromotions.filter(promo => promo.id !== promotionId);
          
          // Close modal if it's the one being deleted
          if (this.selectedPromotion && this.selectedPromotion.id === promotionId) {
            this.selectedPromotion = null;
          }
        },
        error: (error) => {
          console.error('Error removing promotion:', error);
          alert('Failed to remove promotion. Please try again.');
          
          // For demo, remove from local array anyway
          this.savedPromotions = this.savedPromotions.filter(promo => promo.id !== promotionId);
        }
      });
  }
  
  // Copy promo code to clipboard
  copyPromoCode(code: string): void {
    navigator.clipboard.writeText(code)
      .then(() => {
        alert(`Promo code ${code} copied to clipboard!`);
      })
      .catch(err => {
        console.error('Failed to copy promo code:', err);
        alert(`Promo code: ${code} (please copy manually)`);
      });
  }
  
  // Check if a promotion is expiring soon (within 7 days)
  isExpiringSoon(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const differenceInDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return differenceInDays >= 0 && differenceInDays <= 7;
  }
  
  // Check if a promotion has expired
  hasExpired(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  }
  
  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Get time elapsed since promotion was saved
  getTimeElapsed(savedAt: string): string {
    const savedDate = new Date(savedAt);
    const now = new Date();
    const differenceInSeconds = Math.floor((now.getTime() - savedDate.getTime()) / 1000);
    
    if (differenceInSeconds < 60) {
      return 'Just now';
    } else if (differenceInSeconds < 3600) {
      const minutes = Math.floor(differenceInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (differenceInSeconds < 86400) {
      const hours = Math.floor(differenceInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(differenceInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }
}