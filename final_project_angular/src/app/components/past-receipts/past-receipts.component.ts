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
  
  // Show mock data flag - SET THIS TO TRUE TO FORCE MOCK DATA
  useMockData: boolean = true;
  
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
    // Debug localStorage to check current user
    this.userService.debugLocalStorage();
    
    // If no user in localStorage, create a mock user for testing
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id && this.useMockData) {
      console.log('No user in localStorage, creating mock user');
      this.userService.saveMockUserToLocalStorage();
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
      
      if (this.useMockData) {
        console.log('Using mock data because user is not logged in');
        this.loadMockReceipts();
      } else {
        this.receipts = [];
      }
      return;
    }
    
    // If we're forcing mock data, skip the API call
    if (this.useMockData) {
      console.log('Using mock data (forced)');
      setTimeout(() => {
        this.loadMockReceipts();
        this.isLoading = false;
      }, 1000); // Simulate network delay
      return;
    }
    
    const userId = currentUser.id;
    this.receiptService.getUserReceipts(userId)
      .subscribe({
        next: (data) => {
          console.log('Receipts loaded:', data);
          
          if (!data || data.length === 0) {
            console.log('No receipts found, loading mock data');
            this.loadMockReceipts();
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
              totalAmount: receipt.totalExpense || 0,
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
          this.handleError(error);
          this.isLoading = false;
          
          // Add mock receipts since the backend might not be working
          this.loadMockReceipts();
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
  
  loadMockReceipts() {
    console.log('Loading mock receipts');
    this.receipts = [
      {
        id: '1',
        merchantName: 'Cold Storage',
        category: 'Groceries',
        dateOfPurchase: '2025-03-10T13:45:00',
        totalAmount: 87.50,
        hasPromotion: true,
        items: [
          { name: 'Milk', quantity: 2, price: 6.50 },
          { name: 'Bread', quantity: 1, price: 3.20 },
          { name: 'Eggs', quantity: 1, price: 4.80 }
        ]
      },
      {
        id: '2',
        merchantName: 'Starbucks',
        category: 'Cafes',
        dateOfPurchase: '2025-03-05T09:15:00',
        totalAmount: 15.80,
        hasPromotion: true,
        items: [
          { name: 'Caffè Latte', quantity: 1, price: 6.50 },
          { name: 'Chocolate Croissant', quantity: 1, price: 4.90 }
        ]
      },
      {
        id: '3',
        merchantName: 'McDonald\'s',
        category: 'Fast Food',
        dateOfPurchase: '2025-03-15T12:30:00',
        totalAmount: 22.50,
        hasPromotion: false,
        items: [
          { name: 'Big Mac', quantity: 2, price: 12.00 },
          { name: 'Fries', quantity: 2, price: 7.00 },
          { name: 'Coca Cola', quantity: 2, price: 3.50 }
        ]
      },
      {
        id: '4',
        merchantName: 'NTUC FairPrice',
        category: 'Groceries',
        dateOfPurchase: '2025-03-18T10:15:00',
        totalAmount: 63.75,
        hasPromotion: false,
        items: [
          { name: 'Rice', quantity: 1, price: 15.90 },
          { name: 'Vegetables', quantity: 1, price: 8.50 },
          { name: 'Chicken', quantity: 1, price: 12.80 },
          { name: 'Fruit', quantity: 1, price: 7.60 }
        ]
      },
      {
        id: '5',
        merchantName: 'Guardian Pharmacy',
        category: 'Healthcare',
        dateOfPurchase: '2025-03-20T15:30:00',
        totalAmount: 32.40,
        hasPromotion: true,
        items: [
          { name: 'Vitamins', quantity: 1, price: 18.90 },
          { name: 'Bandages', quantity: 1, price: 5.50 },
          { name: 'Hand Sanitizer', quantity: 1, price: 8.00 }
        ]
      }
    ];
    
    console.log('Loaded mock receipts:', this.receipts);
  }
  
  viewReceiptDetails(receipt: any) {
    // Lock scroll on body when modal opens
    document.body.style.overflow = 'hidden';
    
    this.selectedReceipt = receipt;
    console.log('Viewing receipt details:', receipt);
    
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
      // If using mock data, just remove from local array
      if (this.useMockData) {
        this.receipts = this.receipts.filter(r => r.id !== receipt.id);
        this.closeReceiptDetails();
        return;
      }
      
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
          console.error('Error deleting receipt:', error);
        }
      });
    }
  }
  
  // Get filtered receipts
  get filteredReceipts() {
    // Add debugging to troubleshoot filtering issues
    console.log('Filtering receipts. Total receipts:', this.receipts.length);
    console.log('Current filters:', this.filters);
    console.log('Search term:', this.searchTerm);
    
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
        console.log(`Comparing category: ${receiptCategory} vs ${filterCategory}`);
        
        if (receiptCategory !== filterCategory) {
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