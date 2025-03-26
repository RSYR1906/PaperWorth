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
  searchTerm = '';
  isLoading = true;
  error = '';
  isClosing = false;
  errorType: 'general' | 'network' | 'server' = 'general';
  showSuccessNotification = false;
  successNotificationMessage = '';
  notificationTimeRemaining = 100;
  notificationTimer: any = null;

  filters = {
    dateRange: 'all',
    category: 'all',
    hasPromotion: false
  };

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
  ) {}

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserReceipts();
  }

  loadUserReceipts(): void {
    this.isLoading = true;
    this.error = '';

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser?.id) {
      this.error = 'User not logged in';
      this.errorType = 'general';
      this.isLoading = false;
      return;
    }

    this.receiptService.getUserReceipts(currentUser.id).subscribe({
      next: (data) => {
        this.receipts = (data || []).map(receipt => ({
          id: receipt.id,
          merchantName: receipt.merchantName || 'Unknown Merchant',
          category: receipt.category || 'Others',
          dateOfPurchase: receipt.dateOfPurchase || new Date().toISOString(),
          totalAmount: receipt.totalExpense || 0,
          hasPromotion: false,
          items: receipt.items ? this.parseItems(receipt.items) : [],
          imageUrl: receipt.imageUrl
        }));
        this.isLoading = false;
      },
      error: (error) => {
        this.handleError(error);
        this.isLoading = false;
      }
    });
  }

  parseItems(items: any[]): any[] {
    if (!items || !Array.isArray(items)) return [];
    if (items.length && typeof items[0] === 'object' && 'name' in items[0]) return items;
    return items.map(item => typeof item === 'string' ? { name: item, quantity: 1, price: 0 } : item);
  }

  viewReceiptDetails(receipt: any): void {
    document.body.style.overflow = 'hidden';
    this.selectedReceipt = JSON.parse(JSON.stringify(receipt));
    this.receiptService.getReceiptPromotions(receipt.id).subscribe({
      next: (promotions) => {
        this.selectedReceipt.hasPromotion = promotions?.length > 0;
        this.selectedReceipt.promotions = promotions;
      },
      error: (err) => console.error('Error loading promotions for receipt:', err)
    });
  }

  closeReceiptDetails(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.selectedReceipt = null;
      this.isClosing = false;
      document.body.style.overflow = '';
    }, 300);
  }

  deleteReceipt(receipt: any): void {
    if (!confirm('Are you sure you want to delete this receipt?')) return;
    this.receiptService.deleteReceipt(receipt.id).subscribe({
      next: () => {
        this.receipts = this.receipts.filter(r => r.id !== receipt.id);
        if (this.selectedReceipt?.id === receipt.id) this.closeReceiptDetails();
        this.successNotificationMessage = 'Receipt deleted successfully!';
        this.showNotification();
      },
      error: (err) => {
        alert('Failed to delete receipt. Please try again.');
        console.error('Error deleting receipt:', err);
      }
    });
  }

  showNotification(): void {
    this.showSuccessNotification = true;
    this.notificationTimeRemaining = 100;
    if (this.notificationTimer) clearInterval(this.notificationTimer);
    this.notificationTimer = setInterval(() => {
      this.notificationTimeRemaining -= 2;
      if (this.notificationTimeRemaining <= 0) this.closeNotification();
    }, 100);
  }

  closeNotification(): void {
    this.showSuccessNotification = false;
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }

  get filteredReceipts(): any[] {
    return this.receipts.filter(receipt => {
      const matchesSearch = !this.searchTerm || receipt.merchantName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesPromotion = !this.filters.hasPromotion || receipt.hasPromotion;
      const matchesCategory = this.filters.category === 'all' ||
        (receipt.category?.toLowerCase().replace(/\s+/g, '') === this.filters.category.toLowerCase());
      const matchesDate = this.filterByDate(receipt.dateOfPurchase);
      return matchesSearch && matchesPromotion && matchesCategory && matchesDate;
    });
  }

  private filterByDate(dateStr: string): boolean {
    if (this.filters.dateRange === 'all') return true;
    const receiptDate = new Date(dateStr);
    const today = new Date();
    if (this.filters.dateRange === 'this-week') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      firstDay.setHours(0, 0, 0, 0);
      return receiptDate >= firstDay;
    }
    if (this.filters.dateRange === 'this-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return receiptDate >= firstDay;
    }
    if (this.filters.dateRange === 'last-month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 1);
      return receiptDate >= first && receiptDate < last;
    }
    return true;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  }

  formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  handleError(error: any): void {
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
  }
}