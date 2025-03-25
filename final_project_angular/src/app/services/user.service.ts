// src/app/services/user.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { User } from '../model';

/**
 * Service responsible for user authentication and management
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;
  private readonly storageKey = 'currentUser';

  constructor(private http: HttpClient) {}

  /**
   * Authenticates a user with provided credentials
   * @param credentials User login credentials (email/password)
   * @returns Observable with login response
   */
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => console.log('Login response:', response)),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  /**
   * Registers a new user
   * @param user User registration data
   * @returns Observable with registration response
   */
  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user).pipe(
      tap(response => console.log('Register response:', response)),
      catchError(error => {
        console.error('Register error:', error);
        throw error;
      })
    );
  }

  /**
   * Gets current user details from API or localStorage
   * @returns Observable with user information
   */
  getCurrentUser(): Observable<User> {
    const currentUser = this.getUserFromStorage();
    
    if (!currentUser.id) {
      return of(this.createGuestUser());
    }
    
    return this.http.get<User>(`${this.apiUrl}/me?userId=${currentUser.id}`).pipe(
      tap(user => console.log('Retrieved user details:', user)),
      catchError(() => {
        // Return the localStorage user as fallback
        return of(currentUser as User);
      })
    );
  }

  /**
   * Logs out the current user
   */
  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
  
  /**
   * Debugs localStorage contents
   */
  debugLocalStorage(): void {
    console.log('Debugging localStorage:');
    const keys = Object.keys(localStorage);
    console.log('LocalStorage keys:', keys);
    
    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        console.log(`Key: ${key}, Value:`, value);
        
        if (value && (key === this.storageKey || key.includes('user'))) {
          try {
            const parsed = JSON.parse(value);
            console.log(`Parsed ${key}:`, parsed);
          } catch (e) {
            console.log(`Could not parse ${key} as JSON`);
          }
        }
      } catch (e) {
        console.error(`Error accessing key ${key}:`, e);
      }
    }
  }
  
  /**
   * Returns a mock user for testing
   * @returns Mock user object
   */
  getMockUser(): User {
    return {
      id: "999",
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Saves a mock user to localStorage for testing
   */
  saveMockUserToLocalStorage(): void {
    const mockUser = this.getMockUser();
    localStorage.setItem(this.storageKey, JSON.stringify(mockUser));
    console.log('Saved mock user to localStorage:', mockUser);
  }

  /**
   * Retrieves the current user from localStorage
   * @returns User object from storage or empty object
   */
  private getUserFromStorage(): Partial<User> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return {};
    }
  }

  /**
   * Creates a guest user object
   * @returns Guest user
   */
  private createGuestUser(): User {
    return {
      id: "0",
      name: 'Guest User',
      email: 'guest@example.com',
      createdAt: new Date().toISOString()
    };
  }
}