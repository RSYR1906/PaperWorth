// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BudgetSettingsComponent } from './components/budget-settings/budget-settings.component';
import { ExpenseTrackerComponent } from './components/expense-tracker/expense-tracker.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { LoginComponent } from './components/login/login.component';
import { PastReceiptsComponent } from './components/past-receipts/past-receipts.component';
import { PromotionsComponent } from './components/promotions/promotions.component';
import { RewardsComponent } from './components/rewards/rewards.component';
import { SavedPromotionsComponent } from './components/saved-promotions/saved-promotions.component'; // Add this line
import { SignupComponent } from './components/signup/signup.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { 
    path: 'homepage', 
    component: HomePageComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'promotions', 
    component: PromotionsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'past-receipts', 
    component: PastReceiptsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'expense-tracker', 
    component: ExpenseTrackerComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'budget-settings', 
    component: BudgetSettingsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'rewards', 
    component: RewardsComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'saved-promotions', 
    component: SavedPromotionsComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/homepage' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }