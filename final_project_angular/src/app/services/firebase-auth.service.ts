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

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Load user from localStorage if available
    this.loadStoredUser();
    
    // Listen to auth state changes
    this.setupAuthStateListener();
    
    // Handle redirect sign-in
    this.handleRedirectSignIn();
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
  private async handleRedirectSignIn(): Promise<void> {
    try {
      const result = await getRedirectResult(this.auth);
      if (result && result.user) {
        try {
          const userData = await this.getUserData(result.user);
          console.log('Redirect sign-in successful:', userData);
        } catch (error) {
          console.error('Error processing user data after redirect:', error);
        }
      }
    } catch (error: any) {
      console.error('Redirect Sign-In Error:', error.code, error.message);
    }
  }

  // Sign in with email and password
  async signInWithEmailPassword(email: string, password: string): Promise<UserData> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.getUserData(credential.user);
  }

  // Sign in with Google - simplified version
  async signInWithGoogle(): Promise<UserData | null> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return await this.getUserData(result.user);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error.code, error.message);
      throw error;
    }
  }
  
  // Sign up with email and password
  async signUpWithEmailPassword(email: string, password: string, displayName?: string): Promise<UserData> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName });
    }
    
    return this.getUserData(credential.user, displayName);
  }

  // Sign out
  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
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
  
    // Prepare user data from Firebase auth
    const userData: UserData = {
      id: firebaseUser.uid,
      name: displayName || firebaseUser.displayName || 'User',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date().toISOString()
    };
  
    try {
      // Use firstValueFrom instead of toPromise()
      const backendUser = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/users/firebase-auth`, {
          firebaseId: userData.id,
          email: userData.email,
          name: userData.name
        })
      );
      
      // Combine Firebase user data with backend user data
      const user = { ...userData, ...backendUser };
      
      // Store in local storage and update subject
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
      
      return user;
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      
      // Even if backend sync fails, still set the Firebase user data
      localStorage.setItem('currentUser', JSON.stringify(userData));
      this.currentUserSubject.next(userData);
      
      return userData;
    }
  }
}