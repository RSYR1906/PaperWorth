import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private router: Router,
    private firebaseAuthService: FirebaseAuthService,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get f() { return this.loginForm.controls; }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  
    if (this.loginForm.invalid) return;
  
    this.isLoading = true;
    this.errorMessage = '';
  
    try {
      const email = this.f['email'].value;
      const password = this.f['password'].value;
      const user = await this.firebaseAuthService.signInWithEmailandPassword(email, password);
      
      console.log('Login successful:', user);
      this.router.navigate(['/homepage']);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.isLoading = false;
    }
  }

  loginWithGoogle() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.firebaseAuthService.signInWithGoogle()
      .then((user) => {
        console.log('Google login successful:', user);
        this.router.navigate(['/homepage']);
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Google login error:', error);
        this.errorMessage = 'An error occurred during Google login. Please try again.';
        this.isLoading = false;
      });
  }

  handleLoginError(error: any) {
    console.error('Login error:', error);
  
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'Invalid email or password',
      'auth/wrong-password': 'Invalid email or password',
      'auth/too-many-requests': 'Too many failed login attempts. Please try again later.'
    };
  
    this.errorMessage = errorMessages[error.code] || 'An error occurred during login. Please try again.';
  }
}
