import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile
} from 'firebase/auth';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { firebaseConfig } from '../firebase-config';

interface UserData {
  id: string;
  name: string;
  email: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  private currentUserSubject = new BehaviorSubject<UserData | null>(null);
  public currentUser$: Observable<UserData | null> = this.currentUserSubject.asObservable();
  private isProcessingRedirect = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Load user from localStorage if available
    this.loadStoredUser();
    
    // Listen to auth state changes
    this.setupAuthStateListener();
    
    // Handle redirect result on component init
    this.handleRedirectResult();
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  private setupAuthStateListener(): void {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        // User is signed in
        this.getUserData(user);
      } else {
        // User is signed out
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
      }
    });
  }

  // Handle redirect sign-in result
  private async handleRedirectResult(): Promise<void> {
    try {
      // Set flag to avoid infinite loops
      if (this.isProcessingRedirect) return;
      this.isProcessingRedirect = true;

      const result = await getRedirectResult(this.auth);
      if (result && result.user) {
        try {
          await this.getUserData(result.user);
          console.log('Redirect sign-in successful');
          this.router.navigate(['/homepage']);
        } catch (error) {
          console.error('Error processing user data after redirect:', error);
        }
      }
      this.isProcessingRedirect = false;
    } catch (error: any) {
      console.error('Redirect Sign-In Error:', error.code, error.message);
      this.isProcessingRedirect = false;
    }
  }

  // Sign in with email and password
  async signInWithEmailandPassword(email: string, password: string): Promise<UserData> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.getUserData(credential.user);
  }

  // Sign in with Google - improved to better handle popup vs redirect
  async signInWithGoogle(): Promise<UserData | null> {
    const provider = new GoogleAuthProvider();
    
    // Add these settings to help with popup issues
    provider.setCustomParameters({
      prompt: 'select_account',
      // Add login_hint if you have the user's email already
      // Adding extra options to improve popup behavior
      'display': 'popup'
    });
    
    // Use sessionStorage to track attempted auth method
    sessionStorage.setItem('auth_method_attempted', 'popup');
    
    console.log('Attempting Google sign-in with popup...');
    
    try {
      // Always try popup first
      const result = await signInWithPopup(this.auth, provider);
      console.log('Popup sign-in successful');
      return await this.getUserData(result.user);
    } catch (error: any) {
      console.error('Google Sign-In Error Details:', {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      // If popup was blocked or there was a COOP issue, use redirect
      // This should be a last resort as it navigates away from the page
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/cancelled-popup-request' ||
          error.message?.includes('Cross-Origin-Opener-Policy')) {
        
        console.log('Popup issue detected, falling back to redirect...');
        // Store the fallback intent in sessionStorage
        sessionStorage.setItem('auth_method_attempted', 'redirect');
        
        // Only use redirect as a last resort - it will navigate away
        await signInWithRedirect(this.auth, provider);
        return null; // The redirect will happen, so this return isn't reached
      }
      
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
    // Clear any auth method tracking
    sessionStorage.removeItem('auth_method_attempted');
    this.router.navigate(['/login']);
  }

  // Get current user
  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Get user data from backend or create new user if not exists
  private async getUserData(firebaseUser: FirebaseUser, displayName?: string): Promise<UserData> {
    if (!firebaseUser) throw new Error('No Firebase user');

    // Use the provided displayName first, fall back to Firebase user's displayName, then default
    const name = displayName || firebaseUser.displayName || 'User';
    console.log('getUserData using name:', name);

    // Prepare user data from Firebase auth
    const userData: UserData = {
      id: firebaseUser.uid,
      name: name,  // Use the name from above
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date().toISOString()
    };

    try {
      // Add a log to see what's being sent to backend
      console.log('Sending to backend:', {
        firebaseId: userData.id,
        email: userData.email,
        name: name
      });

      // Send the explicit name to your backend
      const backendUser = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/users/firebase-auth`, {
          firebaseId: userData.id,
          email: userData.email,
          name: name  // Make sure the name is properly sent
        })
      );
      
      console.log('Received from backend:', backendUser);
      
      // Create a merged user object but prioritize our frontend name
      const user = { 
        ...userData,
        id: backendUser.id,
        // Only add fields from backendUser that you need
        createdAt: backendUser.createdAt || userData.createdAt,
        // Most importantly, keep our frontend name if the backend returns "User"
        name: (backendUser.name === "User" && name !== "User") ? name : backendUser.name
      };
      
      console.log('Final user object after merge:', user);
      
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
      
      return user;
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
      this.currentUserSubject.next(userData);
      
      return userData;
    }
  }

  async signUpWithEmailandPassword(email: string, password: string, displayName?: string): Promise<UserData> {
    try {
      console.log('Creating user with displayName:', displayName);

      // First, create the user with Firebase Authentication
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // If a display name was provided, update the user profile
      if (displayName && credential.user) {
        console.log('Updating profile with displayName:', displayName);
        await updateProfile(credential.user, { displayName });
        
        // Wait for the profile update to complete
        console.log('Profile update completed');
      }
      
      // Process and return the user data
      // The key fix: Always pass the displayName parameter to getUserData
      // This ensures it uses our form's name value directly and doesn't wait for Firebase
      return this.getUserData(credential.user, displayName);
    } catch (error: any) {
      console.error('Email/Password Sign-Up Error:', error.code, error.message);
      throw error;
    }
  }
}