// src/app/services/user.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { User } from '../model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Base URL of your Spring Boot backend
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  // Login method to authenticate user
  login(credentials: any): Observable<any> {
    console.log('Attempting login with credentials:', credentials);
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => console.log('Login response:', response)),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  // Register method to create new users
  register(user: any): Observable<any> {
    console.log('Registering user:', user);
    return this.http.post(`${this.apiUrl}/register`, user).pipe(
      tap(response => console.log('Register response:', response)),
      catchError(error => {
        console.error('Register error:', error);
        throw error;
      })
    );
  }

  // Get current user details method
  getCurrentUser(): Observable<User> {
    // Get the current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('Current user from localStorage:', currentUser);
    
    // If no userId, return an error Observable
    if (!currentUser.id) {
      console.warn('No user ID found in localStorage');
      return of({
        id: 0,
        name: 'Guest User',
        email: 'guest@example.com',
        createdAt: new Date().toISOString()
      } as User);
    }
    
    // Otherwise fetch the user details from the backend
    return this.http.get<User>(`${this.apiUrl}/me?userId=${currentUser.id}`).pipe(
      tap(user => console.log('Retrieved user details:', user)),
      catchError(error => {
        console.error('Error getting current user:', error);
        // Return the localStorage user as fallback
        return of(currentUser as User);
      })
    );
  }

  // Logout method to clear session
  logout(): void {
    console.log('Logging out user');
    localStorage.removeItem('currentUser');
    // You could also call an endpoint on your server if needed
  }
  
  // Debug localStorage to check what's stored
  debugLocalStorage(): void {
    console.log('Debugging localStorage:');
    const keys = Object.keys(localStorage);
    console.log('LocalStorage keys:', keys);
    
    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        console.log(`Key: ${key}, Value:`, value);
        
        if (value && (key === 'currentUser' || key.includes('user'))) {
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
  
  // Mock user for testing
  getMockUser(): User {
    return {
      id: 999,
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date().toISOString()
    };
  }
  
  // Save mock user to localStorage for testing
  saveMockUserToLocalStorage(): void {
    const mockUser = this.getMockUser();
    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    console.log('Saved mock user to localStorage:', mockUser);
  }
}