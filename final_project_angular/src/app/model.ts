// src/app/models/user.model.ts
export interface User {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  }


// src/app/models/receipt.model.ts
export interface Receipt {
    id: string;
    userId: string;
    merchantName: string;
    totalAmount: number;
    scanDate: string;
    imageUrl: string;
    additionalFields?: any;
  }

// src/app/models/promotion.model.ts
export interface Promotion {
    id: string;
    merchant: string;
    description: string;
    expiryDate: string;
    status: string;
    category: string;
    location: string;
  }