import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../../services/firebase-auth.service';

@Component({
  selector: 'app-signup',
  standalone: false,
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private firebaseAuthService: FirebaseAuthService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      agreeTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value 
      ? null 
      : g.get('confirmPassword')?.setErrors({ mismatch: true });
  }

  get f() { return this.signupForm.controls; }

  togglePasswordVisibility() { this.passwordVisible = !this.passwordVisible; }

  toggleConfirmPasswordVisibility() { this.confirmPasswordVisible = !this.confirmPasswordVisible; }

  async onSubmit() {
    this.markFormTouched();

    if (this.signupForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { name, email, password } = this.signupForm.value;
      console.log('Signup name:', name);
      const user = await this.firebaseAuthService.signUpWithEmailandPassword(email, password, name);

      console.log('Registration successful:', user);
      localStorage.setItem('registrationSuccess', 'true');
      this.router.navigate(['/homepage']);
    } catch (error) {
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  async signUpWithGoogle() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const user = await this.firebaseAuthService.signInWithGoogle();
      console.log('Google signup successful:', user);
      this.router.navigate(['/homepage']);
    } catch (error) {
      this.handleAuthError(error);
    } finally {
      this.isLoading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private markFormTouched() {
    Object.values(this.signupForm.controls).forEach(control => control.markAsTouched());
  }

  private handleAuthError(error: any) {
    console.error('Authentication error:', error);

    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Email already in use. Please try another email address.',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password.'
    };

    this.errorMessage = errorMessages[error.code] || 'Registration failed. Please try again.';
  }
}