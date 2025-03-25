import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { initializeApp } from 'firebase/app';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  private readonly authReadySubject = new BehaviorSubject<boolean>(false);
  private readonly storageKey = 'currentUser';
  private isProcessingRedirect = false;

  /**
   * Observable for current user data
   */
  public readonly currentUser$: Observable<UserData | null> = this.currentUserSubject.asObservable();
  public readonly authReady$: Observable<boolean> = this.authReadySubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.setupAuthStateListener();
    this.handleRedirectResult();
  }

  /**
   * Gets the current authenticated user
   */
  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  /**
   * Checks if a user is currently authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Gets the Firebase ID token
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
   * Email/password sign in
   */
  async signInWithEmailandPassword(email: string, password: string): Promise<UserData> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.syncUserWithBackend(credential.user);
  }

  /**
   * Google sign-in
   */
  async signInWithGoogle(): Promise<UserData | null> {
    try {
      const platform = Capacitor.getPlatform();
  
      if (platform === 'ios' || platform === 'android') {
        const result = await FirebaseAuthentication.signInWithGoogle();
  
        if (!result.credential?.idToken) {
          throw new Error('Google login failed - missing idToken');
        }
  
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCredential = await signInWithCredential(this.auth, credential);
  
        return this.syncUserWithBackend(userCredential.user);
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(this.auth, provider);
        return this.syncUserWithBackend(result.user);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * Sign up with email/password
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
   * Sign out
   */
  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.saveUser(null);
    sessionStorage.removeItem('auth_method_attempted');
    this.router.navigate(['/login']);
  }

  /**
   * Redirect sign-in result
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
   * Load user from localStorage
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
   * Save user to localStorage
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
   * Firebase auth state listener
   */
  private setupAuthStateListener(): void {
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.syncUserWithBackend(user);
      } else {
        this.saveUser(null);
      }
      this.authReadySubject.next(true);
    });
  }

  /**
   * Sync Firebase user with backend
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