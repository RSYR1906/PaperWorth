import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { FirebaseAuthService } from '../services/firebase-auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private firebaseAuthService: FirebaseAuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't intercept auth requests
    if (request.url.includes('firebase-auth')) {
      return next.handle(request);
    }

    // Convert Promise to Observable
    return from(this.firebaseAuthService.getIdToken()).pipe(
      tap(token => console.log('Firebase token available:', !!token)),
      switchMap(token => {
        if (token) {
          console.log('Adding auth header to request to:', request.url);
          const cloned = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          return next.handle(cloned);
        }
        console.log('No token available, proceeding without auth header to:', request.url);
        return next.handle(request);
      }),
      catchError(error => {
        console.error('Error in auth interceptor:', error);
        return throwError(() => error);
      })
    );
  }
}