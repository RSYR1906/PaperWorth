// src/app/components/signup/signup.component.ts
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
  isLoading: boolean = false;
  errorMessage: string = '';
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private firebaseAuthService: FirebaseAuthService
  ) {
    this.signupForm = this.formBuilder.group({
      name: ['',[Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      agreeTerms: [false, Validators.requiredTrue]
    }, { validator: this.passwordMatchValidator });
  }

  // Custom validator to check if password and confirm password match
  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      g.get('confirmPassword')?.setErrors({ 'mismatch': true });
    } else {
      return null;
    }
    return null;
  }

  // Toggle password visibility
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
  
  // Toggle confirm password visibility
  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  // Convenience getter for easy access to form fields
  get f() { return this.signupForm.controls; }

  // Handle form submission
  onSubmit() {
    // Mark all fields as touched to trigger validation
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });

    if (this.signupForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const name = this.signupForm.value.name;
    const email = this.signupForm.value.email;
    const password = this.signupForm.value.password;

    // Register user with Firebase
    this.firebaseAuthService.signUpWithEmailPassword(email, password, name)
      .then((user) => {
        console.log('Registration successful:', user);
        localStorage.setItem('registrationSuccess', 'true');
        this.router.navigate(['/homepage']);
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Registration error:', error);
        
        if (error.code === 'auth/email-already-in-use') {
          this.errorMessage = 'Email already in use. Please try another email address.';
        } else if (error.code === 'auth/weak-password') {
          this.errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
        
        this.isLoading = false;
      });
  }

  signUpWithGoogle() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.firebaseAuthService.signInWithGoogle()
      .then((user) => {
        console.log('Google signup successful:', user);
        this.router.navigate(['/homepage']);
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Google signup error:', error);
        this.errorMessage = 'An error occurred during Google signup. Please try again.';
        this.isLoading = false;
      });
  }

  // Navigate to login page
  goToLogin() {
    this.router.navigate(['/login']);
  }
}