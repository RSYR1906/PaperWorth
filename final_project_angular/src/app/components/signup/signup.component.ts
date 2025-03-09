import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
    private http: HttpClient
  ) {
    this.signupForm = this.formBuilder.group({
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

    // Prepare user data (excluding confirmPassword and agreeTerms)
    const userData = {
      name: this.signupForm.value.name,
      email: this.signupForm.value.email,
      password: this.signupForm.value.password
    };

    // In a real app, connect with your backend API
    // This is a placeholder for the actual API call
    setTimeout(() => {
      // For demo purposes, simulate successful registration
      console.log('User registered:', userData);
      localStorage.setItem('registrationSuccess', 'true');
      this.router.navigate(['/login']);
      this.isLoading = false;
      
      // In a real app, you would call your backend
      /*
      this.http.post('http://localhost:8080/api/users/register', userData)
        .subscribe(
          (response) => {
            console.log('Registration successful:', response);
            localStorage.setItem('registrationSuccess', 'true');
            this.router.navigate(['/login']);
            this.isLoading = false;
          },
          (error) => {
            console.error('Registration error:', error);
            if (error.status === 409) {
              this.errorMessage = 'Email already in use. Please use a different email address.';
            } else {
              this.errorMessage = 'Registration failed. Please try again.';
            }
            this.isLoading = false;
          }
        );
      */
    }, 1000);
  }

signUpWithGoogle() {
    console.log("Google signup clicked");
    alert("Google singup integration coming soon!");
  }

  // Navigate to login page
  goToLogin() {
    this.router.navigate(['/login']);
  }
}