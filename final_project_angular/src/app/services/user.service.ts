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

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => console.log('Login response:', response)),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user).pipe(
      tap(response => console.log('Register response:', response)),
      catchError(error => {
        console.error('Register error:', error);
        throw error;
      })
    );
  }

  getCurrentUser(): Observable<User> {
    const currentUser = this.getUserFromStorage();
    return this.http.get<User>(`${this.apiUrl}/me?userId=${currentUser.id}`).pipe(
      tap(user => console.log('Retrieved user details:', user)),
      catchError(() => {
        // Return the localStorage user as fallback
        return of(currentUser as User);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
  
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
  
  getMockUser(): User {
    return {
      id: "999",
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date().toISOString()
    };
  }

  private getUserFromStorage(): Partial<User> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return {};
    }
  }
}