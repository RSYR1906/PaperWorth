import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-past-receipts',
  standalone: false,
  templateUrl: './past-receipts.component.html',
  styleUrls: ['./past-receipts.component.css']
})
export class PastReceiptsComponent implements OnInit {
  receipts = [
    {
      id: '1',
      merchantName: 'Cold Storage',
      category: 'Groceries',
      scanDate: '2025-03-01T13:45:00',
      totalAmount: 87.50,
      hasPromotion: true,
      items: [
        { name: 'Milk', quantity: 2, price: 6.50 },
        { name: 'Bread', quantity: 1, price: 3.20 },
        { name: 'Eggs', quantity: 1, price: 4.80 },
        { name: 'Chicken', quantity: 1, price: 12.90 },
        { name: 'Vegetables', quantity: 3, price: 15.60 },
        { name: 'Fruits', quantity: 2, price: 18.40 },
        { name: 'Cereal', quantity: 1, price: 7.90 },
        { name: 'Yogurt', quantity: 4, price: 10.20 },
        { name: 'Snacks', quantity: 2, price: 8.00 }
      ]
    },
    {
      id: '2',
      merchantName: 'Starbucks',
      category: 'Dining',
      scanDate: '2025-02-28T09:15:00',
      totalAmount: 15.80,
      hasPromotion: true,
      items: [
        { name: 'Caffè Latte', quantity: 1, price: 6.50 },
        { name: 'Chocolate Croissant', quantity: 1, price: 4.90 },
        { name: 'Bottled Water', quantity: 1, price: 3.50 },
        { name: 'Extra Shot', quantity: 1, price: 0.90 }
      ]
    },
    {
      id: '3',
      merchantName: 'McDonald\'s',
      category: 'Dining',
      scanDate: '2025-02-27T19:30:00',
      totalAmount: 22.40,
      hasPromotion: true,
      items: [
        { name: 'McSpicy Meal', quantity: 1, price: 9.90 },
        { name: 'McChicken Meal', quantity: 1, price: 7.90 },
        { name: 'Apple Pie', quantity: 1, price: 1.80 },
        { name: 'Ice Cream Cone', quantity: 1, price: 0.80 },
        { name: 'Bottled Water', quantity: 1, price: 2.00 }
      ]
    },
    {
      id: '4',
      merchantName: 'Uniqlo',
      category: 'Shopping',
      scanDate: '2025-02-25T14:20:00',
      totalAmount: 159.90,
      hasPromotion: true,
      items: [
        { name: 'T-Shirt', quantity: 3, price: 19.90 },
        { name: 'Jeans', quantity: 1, price: 49.90 },
        { name: 'Socks (3 Pack)', quantity: 1, price: 12.90 },
        { name: 'Jacket', quantity: 1, price: 59.90 }
      ]
    },
    {
      id: '5',
      merchantName: 'Guardian Pharmacy',
      category: 'Healthcare',
      scanDate: '2025-02-22T11:10:00',
      totalAmount: 42.25,
      hasPromotion: false,
      items: [
        { name: 'Multivitamins', quantity: 1, price: 15.90 },
        { name: 'Hand Sanitizer', quantity: 2, price: 6.80 },
        { name: 'Face Mask (Pack)', quantity: 1, price: 9.90 },
        { name: 'Shampoo', quantity: 1, price: 8.95 }
      ]
    },
    {
      id: '6',
      merchantName: 'Fairprice',
      category: 'Groceries',
      scanDate: '2025-02-20T16:45:00',
      totalAmount: 68.45,
      hasPromotion: false,
      items: [
        { name: 'Rice (5kg)', quantity: 1, price: 15.90 },
        { name: 'Cooking Oil', quantity: 1, price: 8.50 },
        { name: 'Toilet Paper', quantity: 1, price: 12.90 },
        { name: 'Laundry Detergent', quantity: 1, price: 14.80 },
        { name: 'Pasta', quantity: 2, price: 4.60 },
        { name: 'Pasta Sauce', quantity: 1, price: 3.95 },
        { name: 'Eggs', quantity: 1, price: 4.80 },
        { name: 'Salt', quantity: 1, price: 1.20 },
        { name: 'Sugar', quantity: 1, price: 1.80 }
      ]
    },
    {
      id: '7',
      merchantName: 'Watsons',
      category: 'Healthcare',
      scanDate: '2025-02-18T10:30:00',
      totalAmount: 31.55,
      hasPromotion: false,
      items: [
        { name: 'Facial Cleanser', quantity: 1, price: 12.90 },
        { name: 'Toothpaste', quantity: 2, price: 7.80 },
        { name: 'Toothbrush', quantity: 1, price: 4.95 },
        { name: 'Dental Floss', quantity: 1, price: 5.90 }
      ]
    }
  ];
  
  selectedReceipt: any = null;
  searchTerm: string = '';
  
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
    { id: 'shopping', name: 'Shopping' },
    { id: 'healthcare', name: 'Healthcare' }
  ];
  
  // Date ranges for filter
  dateRanges = [
    { id: 'all', name: 'All Time' },
    { id: 'this-week', name: 'This Week' },
    { id: 'this-month', name: 'This Month' },
    { id: 'last-month', name: 'Last Month' }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    // In a real app, you would fetch data from a service
  }
  
  logout() {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
  
  viewReceiptDetails(receipt: any) {
    this.selectedReceipt = receipt;
  }
  
  closeReceiptDetails() {
    this.selectedReceipt = null;
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
      if (this.filters.category !== 'all' && 
          receipt.category.toLowerCase() !== this.filters.category.toLowerCase()) {
        return false;
      }
      
      // Filter by date range
      if (this.filters.dateRange !== 'all') {
        const receiptDate = new Date(receipt.scanDate);
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
}