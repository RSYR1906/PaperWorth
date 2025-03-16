import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';

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
    private receiptService: ReceiptService
  ) { }

  ngOnInit(): void {
    this.loadUserReceipts();
  }
  
  loadUserReceipts() {
    this.isLoading = true;
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser || !currentUser.id) {
      this.error = 'User not logged in';
      this.isLoading = false;
      this.receipts = [];
      return;
    }
    
    const userId = currentUser.id;
    this.receiptService.getUserReceipts(userId)
      .subscribe({
        next: (data) => {
          console.log('Receipts loaded:', data);
          
          // Transform the data for display
          this.receipts = data.map(receipt => {
            // If dateOfPurchase is missing, use a fallback date
            const purchaseDate = receipt.dateOfPurchase || new Date().toISOString();
            
            return {
              id: receipt.id,
              merchantName: receipt.merchantName,
              category: receipt.category || 'Others',
              dateOfPurchase: purchaseDate, // This is the actual receipt date
              totalAmount: receipt.totalExpense || 0,
              hasPromotion: false, // Will be set later if applicable
              items: receipt.items ? this.parseItems(receipt.items) : [],
              imageUrl: receipt.imageUrl // Store the image URL
            };
          });
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading receipts:', error);
          this.error = 'Failed to load receipts. Please try again later.';
          this.isLoading = false;
          
          // Provide demo data if backend fails
          this.loadDemoReceipts();
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
  
  loadDemoReceipts() {
    // Fallback to demo data if API fails
    this.receipts = [
      // {
      //   id: '1',
      //   merchantName: 'Cold Storage',
      //   category: 'Groceries',
      //   scanDate: '2025-03-01T13:45:00',
      //   totalAmount: 87.50,
      //   hasPromotion: true,
      //   items: [
      //     { name: 'Milk', quantity: 2, price: 6.50 },
      //     { name: 'Bread', quantity: 1, price: 3.20 },
      //     { name: 'Eggs', quantity: 1, price: 4.80 }
      //   ]
      // },
      // {
      //   id: '2',
      //   merchantName: 'Starbucks',
      //   category: 'Cafes',
      //   scanDate: '2025-02-28T09:15:00',
      //   totalAmount: 15.80,
      //   hasPromotion: true,
      //   items: [
      //     { name: 'Caffè Latte', quantity: 1, price: 6.50 },
      //     { name: 'Chocolate Croissant', quantity: 1, price: 4.90 }
      //   ]
      // }
    ];
  }
  
  viewReceiptDetails(receipt: any) {
    // Lock scroll on body when modal opens
    document.body.style.overflow = 'hidden';
    
    this.selectedReceipt = receipt;
    
    // Check if the receipt has promotions by calling the promotions API
    if (receipt.id) {
      this.receiptService.getReceiptPromotions(receipt.id)
        .subscribe({
          next: (promotions) => {
            console.log('Receipt promotions:', promotions);
            // Update hasPromotion flag based on API response
            receipt.hasPromotion = promotions && promotions.length > 0;
            // You could also store the promotions in the receipt object if needed
            receipt.promotions = promotions;
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
        },
        error: (error) => {
          alert('Failed to delete receipt. Please try again.');
        }
      });
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
      const receiptCategory = receipt.category.toLowerCase().replace(/\s+/g, '');
      if (receiptCategory !== this.filters.category.toLowerCase()) {
        return false;
      }
    }
    
    // Filter by date range - now using dateOfPurchase instead of scanDate
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  }
  
  // Get time from date
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  // Add to your component class
errorType: 'general' | 'network' | 'server' = 'general';

// Update your error handling method
handleError(error: any) {
  this.error = error.message || 'An unexpected error occurred';
  
  if (!navigator.onLine || error.status === 0) {
    this.errorType = 'network';
  } else if (error.status >= 500) {
    this.errorType = 'server';
  } else {
    this.errorType = 'general';
  }
}
}