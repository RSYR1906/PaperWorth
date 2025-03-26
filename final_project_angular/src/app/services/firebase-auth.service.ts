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
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { firebaseConfig } from '../firebaseConfig';


if (!environment.production) {
  const auth = getAuth();
  auth.useDeviceLanguage();
  console.log('Firebase auth debugging enabled');
}

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
  public readonly currentUser$: Observable<UserData | null> = this.currentUserSubject.asObservable();
  public readonly authReady$: Observable<boolean> = this.authReadySubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.setupAuthStateListener();
    this.handleRedirectResult();
  }

  getCurrentUser(): UserData | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
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

  async signInWithEmailandPassword(email: string, password: string): Promise<UserData> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.syncUserWithBackend(credential.user);
  }

  async signInWithGoogle(): Promise<UserData | null> {
    try {
      const platform = Capacitor.getPlatform();
      console.log(`Running on platform: ${platform}`);
  
      if (platform === 'android' || platform === 'ios') {
        await FirebaseAuthentication.signOut();
        
        console.log('Starting native Google sign-in with Firebase Authentication plugin');
        
        const result = await FirebaseAuthentication.signInWithGoogle();
        console.log('Native sign-in completed, result:', JSON.stringify(result));
        
        if (!result || !result.user) {
          throw new Error('Google login failed - missing user data');
        }
        
        const userData: UserData = {
          id: result.user.uid,
          name: result.user.displayName || 'User',
          email: result.user.email,
          photoURL: result.user.photoUrl,
          emailVerified: result.user.emailVerified,
          createdAt: new Date().toISOString()
        };
        
        return this.syncUserWithBackend(this.auth.currentUser!);
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

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.saveUser(null);
    sessionStorage.removeItem('auth_method_attempted');
    this.router.navigate(['/login']);
  }

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

  private loadStoredUser(): UserData | null {
    try {
      const storedUser = localStorage.getItem(this.storageKey);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error loading stored user:', error);
      return null;
    }
  }

  private saveUser(user: UserData | null): void {
    if (user) {
      localStorage.setItem(this.storageKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.storageKey);
    }
    this.currentUserSubject.next(user);
  }

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