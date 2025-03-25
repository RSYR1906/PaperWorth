import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Observable } from 'rxjs';
import { FirebaseAuthService } from '../services/firebase-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  
  private auth = getAuth(); // Firebase Auth instance

  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    
    return new Observable<boolean | UrlTree>((observer) => {
      // Listen for auth state changes asynchronously
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        if (user) {
          observer.next(true);  // User is authenticated
        } else {
          // Redirect to login page with return URL
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          observer.next(false);
        }
        observer.complete();  // Complete the observable
      });

      // Cleanup subscription when done
      return { unsubscribe };
    });
  }
}