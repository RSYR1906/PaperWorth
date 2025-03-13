import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
    return from(this.firebaseAuthService.getIdToken())
      .pipe(
        switchMap(token => {
          if (token) {
            const cloned = request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return next.handle(cloned);
          }
          return next.handle(request);
        })
      );
  }
}