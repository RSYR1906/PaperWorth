import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { MessageService } from 'primeng/api';


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
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
    // Mark all fields as touched to trigger validation display
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });

    console.log("Form status:", this.loginForm.status);
    console.log("Form errors:", this.loginForm.errors);
    console.log("Username errors:", this.f['username'].errors);
    console.log("Password errors:", this.f['password'].errors);

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    // Set loading state
    this.isLoading = true;
    this.errorMessage = '';

    const username = this.f['username'].value;
    const password = this.f['password'].value;

    // Check for demo/test credentials first
    if (username === "demo@example.com" && password === "demo123") {
      // Create a mock user response
      const mockUserResponse = {
        id: 1,
        name: "Demo User",
        email: "demo@example.com",
        createdAt: new Date().toISOString()
      };
      
      // Simulate a brief loading time for realism
      setTimeout(() => {
        // Store mock user data
        localStorage.setItem('currentUser', JSON.stringify(mockUserResponse));
        
        // Navigate to homepage
        this.router.navigate(['/homepage']);
        
        this.isLoading = false;
      }, 800);
      
      return;
    }

    // Regular authentication flow with backend
    const credentials = {
      email: username,
      password: password
    };

    this.userService.login(credentials).subscribe(
      (response) => {
        console.log('Login successful:', response);
        localStorage.setItem('currentUser', JSON.stringify(response));
        this.router.navigate(['/homepage']);
        this.isLoading = false;
      },
      (error) => {
        console.error('Login error:', error);
        
        if (error.status === 401) {
          this.errorMessage = 'Invalid username or password';
        } else {
          this.errorMessage = 'An error occurred during login. Please try again.';
        }
        
        this.isLoading = false;
      }
    );
  }

  // Demo login button handler
  loginAsDemo() {
    this.loginForm.setValue({
      username: "demo@example.com",
      password: "demo123"
    });
    this.login();
  }

  loginWithGoogle() {
    console.log("Google login clicked");
    alert("Google login integration coming soon!");
  }
}