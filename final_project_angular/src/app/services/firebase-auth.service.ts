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
  private currentUserSubject = new BehaviorSubject<UserData | null>(this.loadStoredUser());
  public currentUser$: Observable<UserData | null> = this.currentUserSubject.asObservable();
  private isProcessingRedirect = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.setupAuthStateListener();
    this.handleRedirectResult();
  }

  /** Load stored user from localStorage */
  private loadStoredUser(): UserData | null {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  }

  /** Saves user data to localStorage */
  private saveUser(user: UserData | null): void {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(user);
  }

  /** Listens for Firebase auth state changes */
  private setupAuthStateListener(): void {
    this.auth.onAuthStateChanged(user => user ? this.syncUserWithBackend(user) : this.saveUser(null));
  }

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

  /** Handles Google redirect sign-in */
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

  /** Sign in with email/password */
  async signInWithEmailandPassword(email: string, password: string): Promise<UserData> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.syncUserWithBackend(credential.user);
  }

  /** Sign in with Google */
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

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.saveUser(null);
    sessionStorage.removeItem('auth_method_attempted');
    this.router.navigate(['/login']);
  }

  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

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
          idToken: idToken // Send the ID token to the backend
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

  /** Sign up with email/password */
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
}