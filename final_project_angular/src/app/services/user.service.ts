// src/app/services/user.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Base URL of your Spring Boot backend
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) { }

  // Login method to authenticate user
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  // Register method to create new users
  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  // Get current user details method
  getCurrentUser(): Observable<User> {
    // Get the current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // If no userId, return an error Observable
    if (!currentUser.id) {
      return new Observable(observer => {
        observer.error('User not logged in');
        observer.complete();
      });
    }
    
    // Otherwise fetch the user details from the backend
    return this.http.get<User>(`${this.apiUrl}/me?userId=${currentUser.id}`);
  }

  // Logout method to clear session
  logout(): void {
    localStorage.removeItem('currentUser');
    // You could also call an endpoint on your server if needed
  }
}