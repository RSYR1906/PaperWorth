import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent {
  userName = "Demo"; // Mock user
  monthlyExpenses = 1248.75; // Mock monthly expenses
  extractedData: any = null;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  ocrText: string = '';
  isProcessing: boolean = false;
  showFullText: boolean = false;

  promotionsByCategory = [
    {
      name: "Fast Food",
      deals: [
        { description: "McDonald's - $6.50 McSpicy Meal", expiry: "March 30, 2025", imageUrl: "promotions/mcdonalds.jpg" },
        { description: "KFC - 2-for-1 Zinger Burgers", expiry: "April 10, 2025", imageUrl: "promotions/kfc.jpg" }
      ]
    },
    {
      name: "Groceries",
      deals: [
        { description: "Giant - Myojo Instant Noodles Assorted", expiry: "March 28, 2025", imageUrl: "promotions/giant.jpg" }
      ]
    }
  ];
  
  constructor(private http: HttpClient, private router: Router) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.selectedFile = file;

      // Show image preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
      
      // Clear previous OCR results
      this.ocrText = '';
      this.extractedData = null;
    }
  }

  uploadImage() {
    if (!this.selectedFile) {
      console.error("No file selected!");
      return;
    }
  
    this.isProcessing = true;
  
    const formData = new FormData();
    formData.append('file', this.selectedFile);
  
    // Upload image to OCR backend
    this.http.post<any>('http://localhost:8080/api/ocr/scan', formData)
      .subscribe(
        (response) => {
          this.isProcessing = false;
          
          // Ensure extractedData is only set from API response
          if (response && response.merchantName && response.totalAmount && response.date) {
            this.extractedData = response;
            this.ocrText = response.fullText || "No additional text extracted.";
          } else {
            console.error("Invalid response format:", response);
            this.ocrText = "Error processing image. Please try again.";
          }
        },
        (error) => {
          this.isProcessing = false;
          console.error('Error processing image:', error);
          this.ocrText = "Error processing image. Please try again.";
        }
      );
  }
  
  saveReceipt() {
    if (!this.extractedData || !this.extractedData.merchantName || !this.extractedData.totalAmount || !this.extractedData.date) {
      alert("Incomplete receipt data. Please try again.");
      return;
    }
  
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const receiptData = {
      userId: currentUser.id || '1',
      merchantName: this.extractedData.merchantName,
      totalAmount: this.extractedData.totalAmount,
      date: this.extractedData.date
    };
  
    this.http.post('http://localhost:8080/api/receipts', receiptData)
      .subscribe(
        (response) => {
          console.log('Receipt saved:', response);
          this.router.navigate(['/promotions'], { queryParams: { receiptId: (response as any).id } });
        },
        (error) => {
          console.error('Error saving receipt:', error);
          alert('Failed to save receipt. Please try again.');
        }
      );
  }

  resetScanner(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.ocrText = '';
    this.extractedData = null;
    this.showFullText = false;
  }

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    fileInput?.click();
  }

  toggleFullText() {
    this.showFullText = !this.showFullText;
  }

  logout() {
    // Clear user session
    localStorage.removeItem('currentUser');
    console.log("User logged out");
    this.router.navigate(['']);
  }
  
  // Helper method to format currency values
  formatCurrency(value: number): string {
    return value.toFixed(2);
  }
  
  // Helper method to get first name only
  get userFirstName(): string {
    return this.userName.split(' ')[0];
  }
  
  // Calculate if file size is acceptable
  isFileSizeAcceptable(file: File): boolean {
    const maxSizeInMB = 5;
    const fileSizeInMB = file.size / (1024 * 1024);
    return fileSizeInMB <= maxSizeInMB;
  }
  
  // Get file extension
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
}