import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-past-receipts',
  standalone: false,
  templateUrl: './past-receipts.component.html',
  styleUrls: ['./past-receipts.component.css']
})
export class PastReceiptsComponent implements OnInit {
  receipts: any[] = [];
  selectedReceipt: any = null;
  searchTerm: string = '';
  isLoading: boolean = true;
  error: string = '';
  isClosing: boolean = false;
  errorType: 'general' | 'network' | 'server' = 'general';
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  notificationTimer: any = null;
  
  // Filters
  filters = {
    dateRange: 'all',
    category: 'all',
    hasPromotion: false
  };
  
  // Categories for filter
  categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'groceries', name: 'Groceries' },
    { id: 'dining', name: 'Dining' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'cafes', name: 'Cafes' },
    { id: 'shopping', name: 'Shopping' },
    { id: 'retail', name: 'Retail' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'others', name: 'Others' }
  ];
  
  // Date ranges for filter
  dateRanges = [
    { id: 'all', name: 'All Time' },
    { id: 'this-week', name: 'This Week' },
    { id: 'this-month', name: 'This Month' },
    { id: 'last-month', name: 'Last Month' }
  ];

  constructor(
    private router: Router,
    private receiptService: ReceiptService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    // Check localStorage for current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
      // If no user in localStorage, redirect to login
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserReceipts();
  }
  
  loadUserReceipts() {
    this.isLoading = true;
    this.error = '';
    
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('Current user for receipt loading:', currentUser);
    
    if (!currentUser || !currentUser.id) {
      this.error = 'User not logged in';
      this.errorType = 'general';
      this.isLoading = false;
      return;
    }
    
    const userId = currentUser.id;
    this.receiptService.getUserReceipts(userId)
      .subscribe({
        next: (data) => {
          console.log('Receipts loaded:', data);
          
          if (!data || data.length === 0) {
            console.log('No receipts found for this user.');
            this.receipts = [];
            this.isLoading = false;
            return;
          }
          
          // Transform the data for display
          this.receipts = data.map(receipt => {
            // If dateOfPurchase is missing, use a fallback date
            const purchaseDate = receipt.dateOfPurchase || new Date().toISOString();
            
            return {
              id: receipt.id,
              merchantName: receipt.merchantName || 'Unknown Merchant',
              category: receipt.category || 'Others',
              dateOfPurchase: purchaseDate, // This is the actual receipt date
              totalAmount: receipt.totalExpense || 0, // Use totalExpense as that's what the backend returns
              hasPromotion: false, // Will be set later if applicable
              items: receipt.items ? this.parseItems(receipt.items) : [],
              imageUrl: receipt.imageUrl // Store the image URL
            };
          });
          
          this.isLoading = false;
          console.log('Transformed receipts:', this.receipts);
        },
        error: (error) => {
          console.error('Error loading receipts:', error);
          console.error('Error details:', JSON.stringify(error));
          this.handleError(error);
          this.isLoading = false;
        }
      });
  }
  
  parseItems(items: any[]): any[] {
    // Parse items based on what format your backend returns
    if (!items || !Array.isArray(items)) return [];
    
    // If items are already in the correct format, return as-is
    if (items.length > 0 && typeof items[0] === 'object' && 'name' in items[0]) {
      return items;
    }
    
    // If items are strings, convert to objects
    return items.map((item, index) => {
      if (typeof item === 'string') {
        return {
          name: item,
          quantity: 1,
          price: 0
        };
      }
      return item;
    });
  }
  
  viewReceiptDetails(receipt: any) {
    // Lock scroll on body when modal opens
    document.body.style.overflow = 'hidden';
    
    // Make a deep copy of the receipt to avoid modifying the original
    this.selectedReceipt = JSON.parse(JSON.stringify(receipt));
    console.log('Viewing receipt details:', this.selectedReceipt);
    
    // Check if the receipt has promotions by calling the promotions API
    if (receipt.id) {
      this.receiptService.getReceiptPromotions(receipt.id)
        .subscribe({
          next: (promotions) => {
            console.log('Receipt promotions:', promotions);
            // Update hasPromotion flag based on API response
            this.selectedReceipt.hasPromotion = promotions && promotions.length > 0;
            // You could also store the promotions in the receipt object if needed
            this.selectedReceipt.promotions = promotions;
          },
          error: (error) => {
            console.error('Error loading promotions for receipt:', error);
          }
        });
    }
  }
  
  closeReceiptDetails() {
    // First set closing state to trigger animation
    this.isClosing = true;
    
    // Then actually remove the modal after animation duration
    setTimeout(() => {
      this.selectedReceipt = null;
      this.isClosing = false;
      // Restore scroll on body when modal closes
      document.body.style.overflow = '';
    }, 300); // Duration should match your CSS animation
  }

  deleteReceipt(receipt: any) {
    if (confirm('Are you sure you want to delete this receipt?')) {
      this.receiptService.deleteReceipt(receipt.id).subscribe({
        next: () => {
          // Remove from local array
          this.receipts = this.receipts.filter(r => r.id !== receipt.id);
          
          // Close modal if open
          if (this.selectedReceipt && this.selectedReceipt.id === receipt.id) {
            this.closeReceiptDetails();
          }
          
          // Show success notification
          this.successNotificationMessage = 'Receipt deleted successfully!';
          this.showNotification();
        },
        error: (error) => {
          alert('Failed to delete receipt. Please try again.');
          console.error('Error deleting receipt:', error);
        }
      });
    }
  }

  // Show notification with timer
  showNotification() {
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;

    // Clear any existing timer
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }

    // Create timer that decreases the progress bar
    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;
      
      if (this.notificationTimeRemaining <= 0) {
        this.closeNotification();
      }
    }, 100); // Update every 100ms, will take ~5 seconds to complete
  }

  // Close the notification
  closeNotification() {
    this.showSuccessNotification = false;
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }
  
  // Get filtered receipts
  get filteredReceipts() {
    return this.receipts.filter(receipt => {
      // Filter by search term
      if (this.searchTerm && !receipt.merchantName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by promotion
      if (this.filters.hasPromotion && !receipt.hasPromotion) {
        return false;
      }
      
      // Filter by category
      if (this.filters.category !== 'all') {
        const receiptCategory = receipt.category?.toLowerCase().replace(/\s+/g, '') || 'others';
        const filterCategory = this.filters.category.toLowerCase();
        
        if (receiptCategory !== filterCategory) {
          return false;
        }
      }
      
      // Filter by date range - using dateOfPurchase
      if (this.filters.dateRange !== 'all') {
        const receiptDate = new Date(receipt.dateOfPurchase);
        const today = new Date();
        
        if (this.filters.dateRange === 'this-week') {
          // This week logic
          const firstDayOfWeek = new Date(today);
          firstDayOfWeek.setDate(today.getDate() - today.getDay());
          firstDayOfWeek.setHours(0, 0, 0, 0);
          
          if (receiptDate < firstDayOfWeek) {
            return false;
          }
        } else if (this.filters.dateRange === 'this-month') {
          // This month logic
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          if (receiptDate < firstDayOfMonth) {
            return false;
          }
        } else if (this.filters.dateRange === 'last-month') {
          // Last month logic
          const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const firstDayOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          if (receiptDate < firstDayOfLastMonth || receiptDate >= firstDayOfThisMonth) {
            return false;
          }
        }
      }
      
      return true;
    });
  }
  
  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
  
  // Format date
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }
  
  // Get time from date
  formatTime(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  }

  // Error handling with type
  handleError(error: any) {
    console.error('Error in handleError method:', error);
    this.error = error.message || 'An unexpected error occurred';
    
    if (!navigator.onLine || error.status === 0) {
      this.errorType = 'network';
      this.error = 'Network connection error. Please check your internet connection and try again.';
    } else if (error.status >= 500) {
      this.errorType = 'server';
      this.error = 'Server error. Our team is working on it. Please try again later.';
    } else {
      this.errorType = 'general';
    }
    
    console.log(`Error type set to: ${this.errorType}, message: ${this.error}`);
  }
}