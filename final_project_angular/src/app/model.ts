// src/app/model.ts

// User Management Models
export interface User {
  id: string;
  name: string;
  email: string;
  firebaseId?: string;      // Optional as it may not be returned to the client
  createdAt: string;        // ISO date string
}

// Receipt Management Models
export interface Receipt {
  id: string;
  userId: string;
  merchantName: string;
  dateOfPurchase: string;        // ISO date string
  totalExpense: number;          // Standardized from totalAmount
  category: string;
  imageUrl?: string;             // Optional
  items?: ReceiptItem[];         // Optional
  scanDate?: string;             // Optional, ISO date string
  
  // Additional properties for frontend use
  additionalFields?: {
      fullText?: string;         // Complete OCR text
      [key: string]: any;        // Any other fields
  };
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

// Budget Management Models
export interface Budget {
  id?: string;
  userId: string;
  monthYear: string;              // Format: YYYY-MM
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  transactions: number;
}

// Promotion Management Models
export interface Promotion {
  id: string;
  merchant: string;
  description: string;
  expiry: string;               // Format matches backend (YYYY-MM-DD)
  imageUrl?: string;            // Optional
  location?: string;            // Optional
  code?: string;                // Optional
  conditions?: string;          // Optional
  category: string;
  promotionId?: number;         // Optional, for backwards compatibility
  
  // Additional fields for frontend use
  savedAt?: string;             // ISO date string, when user saved this promotion
}

export interface SavedPromotion {
  id: string;
  userId: string;
  promotionId: string;
  savedAt: string;             // ISO date string
}

// Rewards Management Models
export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  category: string;             // "VOUCHER", "ELECTRONICS", etc.
  isAvailable: boolean;
  quantity: number;
  merchantName?: string;        // Optional, for vouchers
  termsConditions?: string;     // Optional
  expiryDate?: string;          // Optional, ISO date string
}

export interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  redeemedDate: string;         // ISO date string
  status: string;               // "PENDING", "FULFILLED", "CANCELLED"
  redemptionCode?: string;      // Optional
  deliveryInfo?: string;        // Optional
  expiryDate?: string;          // Optional, ISO date string
}

export interface UserPoints {
  id: string;
  userId: number;
  totalPoints: number;
  availablePoints: number;
  spentPoints: number;
  lastUpdated: string;           // ISO date string
}

export interface PointTransaction {
  id: string;
  userId: number;
  points: number;
  transactionType: string;        // "EARNED", "SPENT"
  source: string;                 // "RECEIPT_SCAN", "REWARD_REDEMPTION", etc.
  referenceId: string;
  transactionDate: string;        // ISO date string
  description: string;
}