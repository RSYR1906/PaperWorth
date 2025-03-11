// src/app/app.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from './services/firebase-auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'PaperWorth';
  
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private router: Router
  ) {}

  isAuthenticated(): boolean {
    return this.firebaseAuthService.isAuthenticated();
  }

  logout(): void {
    this.firebaseAuthService.signOut()
      .then(() => {
        console.log("User logged out successfully");
        this.router.navigate(['/login']);
      })
      .catch(error => {
        console.error("Logout error:", error);
      });
  }
}