// src/app/services/firebase-auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { firebaseConfig } from '../firebase-config';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private app = initializeApp(firebaseConfig);
  private auth = getAuth(this.app);
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$: Observable<any> = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Check if user data exists in local storage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }

    // Listen to auth state changes from Firebase
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

  // Sign in with email and password
  signInWithEmailPassword(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password)
      .then((result) => {
        return this.getUserData(result.user);
      });
  }

  // Sign in with Google
  signInWithGoogle(): Promise<any> {
    const provider = new GoogleAuthProvider();
    
    // Check if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use redirect for mobile devices
      return signInWithRedirect(this.auth, provider)
        .then(() => {
          // This won't be reached immediately as the page redirects
          return null;
        });
    } else {
      // Use popup for desktop
      return signInWithPopup(this.auth, provider)
        .then((result) => {
          return this.getUserData(result.user);
        })
        .catch((error) => {
          if (error.code === 'auth/popup-blocked') {
            alert('Popup was blocked by the browser. Please allow popups for this site or try again using a different authentication method.');
          }
          throw error;  // re-throw the error so it can be caught by the component
        });
    }
  }
  
  // Sign up with email and password
  signUpWithEmailPassword(email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(this.auth, email, password)
      .then((result) => {
        return this.getUserData(result.user);
      });
  }

  // Sign out
  signOut(): Promise<void> {
    return signOut(this.auth).then(() => {
      this.currentUserSubject.next(null);
      localStorage.removeItem('currentUser');
      this.router.navigate(['/login']);
    });
  }

  // Get current user
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Get user data from backend or create new user if not exists
  private getUserData(firebaseUser: FirebaseUser): Promise<any> {
    if (!firebaseUser) return Promise.resolve(null);

    // Prepare user data from Firebase auth
    const userData = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'User',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date().toISOString()
    };

    // Check if user exists in your backend or create new one
    return this.http.post(`${environment.apiUrl}/users/firebase-auth`, {
      firebaseId: userData.id,
      email: userData.email,
      name: userData.name
    }).toPromise()
      .then((backendUser: any) => {
        // Combine Firebase user data with backend user data
        const user = { ...userData, ...backendUser };
        
        // Store in local storage and update subject
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        
        return user;
      })
      .catch((error) => {
        console.error('Error syncing user with backend:', error);
        
        // Even if backend sync fails, still set the Firebase user data
        localStorage.setItem('currentUser', JSON.stringify(userData));
        this.currentUserSubject.next(userData);
        
        return userData;
      });
  }
}