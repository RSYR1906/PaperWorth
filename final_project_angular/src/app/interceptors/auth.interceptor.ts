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

    // Check if this is a multipart form request (file upload)
    const isMultipartRequest = request.body instanceof FormData;
    
    if (isMultipartRequest) {
      console.log('Detected multipart request to:', request.url);
    }

    // Convert Promise to Observable
    return from(this.firebaseAuthService.getIdToken()).pipe(
      tap(token => console.log('Firebase token available:', !!token)),
      switchMap(token => {
        if (token) {
          console.log('Adding auth header to request to:', request.url);
          
          let clonedRequest: HttpRequest<any>;
          
          if (isMultipartRequest) {
            // For multipart requests, only add Authorization header without touching Content-Type
            clonedRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            console.log('Preserving multipart format for request');
          } else {
            // For JSON requests, set all headers
            clonedRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
          }
          
          return next.handle(clonedRequest);
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