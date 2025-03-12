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
  merchant: string;
  description: string;
  category: string;
  expiry: string;
  location?: string;
  code?: string;
  conditions?: string;
  imageUrl?: string;
  }

  // src/app/model.ts - Add the following interfaces

// Reward model
export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  quantity: number;
  merchantName?: string;
  termsConditions?: string;
  expiryDate?: string;
}

// User Points model
export interface UserPoints {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  lastUpdated: string;
}

// User Reward model (for redemption history)
export interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  redeemedDate: string;
  status: string;
  redemptionCode?: string;
  deliveryInfo?: string;
  expiryDate?: string;
}

// Point Transaction model
export interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  transactionType: string;
  source: string;
  referenceId: string;
  transactionDate: string;
  description: string;
}