// src/app/models/user.model.ts
export interface User {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  }


// src/app/models/receipt.model.ts
export interface Receipt {
  id: string;                     // Unique identifier for the receipt
  userId: string;                 // User who owns this receipt
  merchantName: string;           // Name of merchant/store (from OCR)
  totalExpense: number;            // Total expense amount (from OCR)
  dateOfPurchase: string;         // Date of purchase (from OCR)
  scanDate: string;               // When the receipt was scanned
  category: string;               // Category determined from merchant name
  
  // Optional fields
  imageUrl?: string;              // URL to stored receipt image
  items?: ReceiptItem[];          // List of purchased items
  hasPromotions?: boolean;        // Whether the receipt has promotions
  
  // Additional metadata
  additionalFields?: {            // Container for any other data
    fullText?: string;            // Complete OCR text
    [key: string]: any;           // Any other fields
  };
}

export interface ReceiptItem {
  name: string;                   // Item name
  price: number;                  // Item price
  quantity: number;               // Quantity purchased
}

// src/app/models/promotion.model.ts
export interface Promotion {
    id: string;
    merchantName: string;
    description: string;
    expiryDate: string;
    status: string;
    category: string;
    location: string;
  }