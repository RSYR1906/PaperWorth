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
import { environment } from '../../environments/environment.prod';
import { firebaseConfig } from '../firebase-config';

/**
 * Interface defining user data structure
 */
interface UserData {
  id: string;
  name: string;
  email: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Service for handling Firebase authentication
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private readonly app = initializeApp(firebaseConfig);
  private readonly auth = getAuth(this.app);
  private readonly currentUserSubject = new BehaviorSubject<UserData | null>(this.loadStoredUser());
  private readonly storageKey = 'currentUser';
  private isProcessingRedirect = false;
  
  /**
   * Observable for current user data
   */
  public readonly currentUser$: Observable<UserData | null> = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.setupAuthStateListener();
    this.handleRedirectResult();
  }

  /**
   * Gets the current authenticated user
   * @returns Current user data or null if not authenticated
   */
  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  /**
   * Checks if a user is currently authenticated
   * @returns Boolean indicating authentication status
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Gets the Firebase ID token for authenticated requests
   * @returns Promise with the ID token or null
   */
  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  /**
   * Signs in a user with email and password
   * @param email User's email
   * @param password User's password
   * @returns Promise with user data
   */
  async signInWithEmailandPassword(email: string, password: string): Promise<UserData> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.syncUserWithBackend(credential.user);
  }

  /**
   * Signs in a user with Google authentication
   * @returns Promise with user data or null
   */
  async signInWithGoogle(): Promise<UserData | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account', display: 'popup' });

    try {
      const result = await signInWithPopup(this.auth, provider);
      return this.syncUserWithBackend(result.user);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);

      if (error.code === 'auth/popup-blocked' || error.message?.includes('Cross-Origin-Opener-Policy')) {
        await signInWithRedirect(this.auth, provider);
      }
      return null;
    }
  }

  /**
   * Signs up a new user with email and password
   * @param email User's email
   * @param password User's password
   * @param displayName Optional display name
   * @returns Promise with user data
   */
  async signUpWithEmailandPassword(email: string, password: string, displayName?: string): Promise<UserData> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      return this.syncUserWithBackend(credential.user, displayName);
    } catch (error: any) {
      console.error('Sign-Up Error:', error);
      throw error;
    }
  }

  /**
   * Signs out the current user
   * @returns Promise that resolves when sign out is complete
   */
  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.saveUser(null);
    sessionStorage.removeItem('auth_method_attempted');
    this.router.navigate(['/login']);
  }

  /**
   * Handles Firebase redirect authentication result
   */
  private async handleRedirectResult(): Promise<void> {
    if (this.isProcessingRedirect) return;
    this.isProcessingRedirect = true;

    try {
      const result = await getRedirectResult(this.auth);
      if (result?.user) {
        await this.syncUserWithBackend(result.user);
        this.router.navigate(['/homepage']);
      }
    } catch (error) {
      console.error('Redirect Sign-In Error:', error);
    } finally {
      this.isProcessingRedirect = false;
    }
  }

  /**
   * Loads the stored user from localStorage
   * @returns User data or null
   */
  private loadStoredUser(): UserData | null {
    try {
      const storedUser = localStorage.getItem(this.storageKey);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error loading stored user:', error);
      return null;
    }
  }

  /**
   * Saves user data to localStorage
   * @param user User data or null
   */
  private saveUser(user: UserData | null): void {
    if (user) {
      localStorage.setItem(this.storageKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.storageKey);
    }
    this.currentUserSubject.next(user);
  }

  /**
   * Sets up the Firebase auth state change listener
   */
  private setupAuthStateListener(): void {
    this.auth.onAuthStateChanged(user => user ? this.syncUserWithBackend(user) : this.saveUser(null));
  }

  /**
   * Synchronizes Firebase user with backend system
   * @param firebaseUser Firebase user object
   * @param displayName Optional display name
   * @returns Promise with synchronized user data
   */
  private async syncUserWithBackend(firebaseUser: FirebaseUser, displayName?: string): Promise<UserData> {
    if (!firebaseUser) throw new Error('No Firebase user');
  
    const idToken = await firebaseUser.getIdToken();
    
    const userData: UserData = {
      id: firebaseUser.uid,
      name: displayName || firebaseUser.displayName || 'User',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date().toISOString()
    };
  
    try {
      const backendUser = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/users/firebase-auth`, {
          firebaseId: userData.id,
          email: userData.email,
          name: userData.name,
          idToken: idToken
        })
      );
  
      const mergedUser: UserData = {
        ...userData,
        id: backendUser.id,
        createdAt: backendUser.createdAt || userData.createdAt,
        name: backendUser.name !== 'User' ? backendUser.name : userData.name
      };
  
      this.saveUser(mergedUser);
      return mergedUser;
    } catch (error) {
      console.error('Backend Sync Error:', error);
      this.saveUser(userData);
      return userData;
    }
  }
}