# PaperWorth

<div align="center">
  <img src="https://paperworth.sgp1.digitaloceanspaces.com/logo.png" alt="PaperWorth Logo" width="200"/>
  <h3>Turn your receipts into savings and insights</h3>
</div>

## 📱 Live Demo

Frontend: [https://paperworth.vercel.app](https://paperworth.vercel.app)  
Backend API: [https://compassionate-recreation-production-7031.up.railway.app](https://compassionate-recreation-production-7031.up.railway.app)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technical Architecture](#technical-architecture-overview)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🔍 Overview

PaperWorth is a comprehensive personal finance management application that helps users track expenses, manage budgets, and discover promotions by simply scanning their receipts. The application utilizes OCR technology to extract information from receipts, categorizes expenses automatically, and rewards users with points that can be redeemed for various rewards.

## ✨ Features

- **Receipt Scanning**: Capture receipts using your phone's camera
- **Expense Tracking**: Automatically categorize and track your spending
- **Budget Management**: Set monthly budgets and monitor your spending habits
- **Promotions**: Discover and save relevant promotions based on your shopping habits
- **Rewards System**: Earn points for every scanned receipt and redeem them for rewards
- **Responsive Design**: Optimized for both mobile and desktop experiences
- **Offline Support**: PWA capabilities for offline access
- **User Authentication**: Secure login with email/password or Google account

## 🏗️ Technical Architecture Overview

### Application Purpose

PaperWorth is a personal finance management application that allows users to:
- Scan receipts using OCR technology
- Track expenses and manage budgets
- Discover and save promotions related to their purchases
- Earn points from scanning receipts and redeem them for rewards

### Technology Stack

#### Frontend
- **Framework**: Angular 19.2.2 (latest version)
- **UI Component Libraries**: Angular Material 19.2.3
- **PWA Support**: Service Workers for offline capabilities
- **Authentication**: Firebase Authentication (Email/Password and Google login)
- **State Management**: Component-level state management
- **HTTP Interceptors**: Token-based authentication via interceptors

#### Backend
- **Framework**: Spring Boot 3.4.3 with Java 23
- **Authentication**: Firebase Authentication integration
- **OCR Processing**: Google Cloud Vision API
- **Security**: Custom Firebase authentication filter
- **Cross-Origin**: Configured CORS for multiple origins

#### Databases
- **SQL Database**: MySQL for user management
- **NoSQL Database**: MongoDB for receipts, budgets, promotions, and rewards

#### Deployment
- **Frontend**: Vercel static hosting
- **Backend**: Railway platform
- **Image Storage**: Digital Ocean Spaces
- **Database Hosting**: Cloud-hosted MongoDB and MySQL

### Key Features & Implementation Details

#### Receipt Processing
- Users upload receipt images via the mobile or web interface
- Images are preprocessed (resized, grayscale conversion) for better OCR results
- Google Cloud Vision API extracts text from receipt images
- Custom algorithms parse the text to identify key information:
  - Merchant name
  - Total amount
  - Date of purchase
- Automatic category detection based on merchant name

#### Budget Management
- Monthly budgets with category-based allocation
- Real-time expense tracking against budget limits
- Visualization of spending patterns and trends
- Default budget categories with configurable allocations

#### Rewards System
- Points awarded for scanning receipts (based on purchase amount)
- Multiple reward categories including vouchers and merchandise
- Welcome bonus for new users
- User tier system (Bronze, Silver, Gold, Platinum) based on points
- Redemption tracking and history

#### Promotions
- Matching of promotions based on receipt merchants and categories
- Saving favorite promotions for later use
- Expiry tracking and notifications
- Personalized promotion recommendations

### Mobile Optimization
- Responsive design for different screen sizes
- PWA installation support
- Camera integration for receipt scanning
- Touch-optimized UI elements
- Safe area handling for notched phones

### Security Considerations
- Secure Firebase integration with Google Authentication
- Environment variable management for API keys
- Separation of frontend/backend concerns
- Proper error handling and input validation

### Frontend Components
The Angular application consists of these main components:
- Authentication (Login/Signup)
- Home Page with receipt scanning
- Expense Tracker with budget visualization
- Past Receipts management
- Promotions browser
- Rewards center
- Budget settings
- Saved Promotions management

### Backend Services
The Spring Boot application provides these key services:
- User management and authentication
- OCR processing and text extraction
- Receipt data management
- Budget calculation and tracking
- Promotion matching algorithm
- Rewards and points management

### Data Flow
1. User scans a receipt via the mobile or web interface
2. Image is sent to the backend for OCR processing
3. Backend extracts information and categorizes the receipt
4. Receipt data is stored in MongoDB
5. Budget is updated based on the receipt amount
6. Points are awarded to the user based on the purchase
7. Matching promotions are identified and presented to the user
8. User can save promotions or redeem rewards with earned points

### Deployment Strategy
- Frontend and backend are deployed separately for better scalability
- Environment-specific configurations for dev/prod environments
- Cloud-hosted databases for reliability and scalability
- Image storage in Digital Ocean Spaces for cost-efficiency

## 📸 Screenshots

<div align="center">
  <img src="https://paperworth.sgp1.digitaloceanspaces.com/screenshots/home.png" alt="Home Screen" width="200"/>
  <img src="https://paperworth.sgp1.digitaloceanspaces.com/screenshots/scan.png" alt="Scan Receipt" width="200"/>
  <img src="https://paperworth.sgp1.digitaloceanspaces.com/screenshots/budget.png" alt="Budget" width="200"/>
  <img src="https://paperworth.sgp1.digitaloceanspaces.com/screenshots/rewards.png" alt="Rewards" width="200"/>
</div>

## 🚀 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Angular CLI](https://angular.io/cli) (v19 or higher)
- [Java](https://www.oracle.com/java/technologies/downloads/) (JDK 23)
- [Maven](https://maven.apache.org/)
- [Firebase Account](https://firebase.google.com/)
- [Google Cloud Vision API Key](https://cloud.google.com/vision)
- [MongoDB](https://www.mongodb.com/) (for development)
- [MySQL](https://www.mysql.com/) (for development)

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/paperworth.git
cd paperworth/final_project_angular

# Install dependencies
npm install

# Set up environment variables
cp src/environments/environment.example.ts src/environments/environment.ts
# Edit the environment.ts file with your API URLs and Firebase config

# Start the development server
ng serve
```

### Backend Setup

```bash
# Navigate to the backend directory
cd ../final_project_spring

# Set up environment variables
cp src/main/resources/application-example.properties src/main/resources/application-local.properties
# Edit the properties file with your database credentials and API keys

# Build the application
mvn clean package

# Run the application
java -jar target/final_project-0.0.1-SNAPSHOT.jar
```

## 💻 Usage

1. **Sign Up/Login**: Create an account or log in with your Google account
2. **Scan Receipt**: Click the camera button to scan a receipt
3. **View Expenses**: Check your expense breakdown in the Expense Tracker
4. **Manage Budget**: Configure your monthly budget allocations
5. **Discover Promotions**: Browse and save relevant promotions
6. **Earn Rewards**: Collect points and redeem them for rewards

## 📁 Project Structure

```
paperworth/
├── final_project_angular/        # Frontend Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/       # Angular components
│   │   │   ├── guards/           # Route guards
│   │   │   ├── interceptors/     # HTTP interceptors
│   │   │   ├── services/         # Services for API communication
│   │   │   └── model.ts          # Data models
│   │   ├── environments/         # Environment configurations
│   │   └── assets/               # Static assets
│   └── ...
│
└── final_project_spring/         # Backend Spring Boot application
    ├── src/
    │   ├── main/
    │   │   ├── java/sg/nus/iss/final_project/
    │   │   │   ├── controller/   # REST controllers
    │   │   │   ├── model/        # Data models
    │   │   │   ├── repo/         # Repository interfaces
    │   │   │   ├── service/      # Business logic services
    │   │   │   ├── config/       # Configuration classes
    │   │   │   └── filter/       # Security filters
    │   │   └── resources/        # Application properties
    │   └── ...
    └── ...
```

## 📚 API Documentation

The backend API is documented using Swagger. You can access the documentation at:
[https://compassionate-recreation-production-7031.up.railway.app/swagger-ui.html](https://compassionate-recreation-production-7031.up.railway.app/swagger-ui.html)

Key API endpoints:

- `/api/users` - User management
- `/api/receipts` - Receipt management
- `/api/budgets` - Budget management
- `/api/promotions` - Promotions
- `/api/rewards` - Rewards management
- `/api/ocr/scan` - OCR processing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with yours truly</p>
</div>