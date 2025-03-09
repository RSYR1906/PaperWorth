// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BudgetSettingsComponent } from './components/budget-settings/budget-settings.component';
import { ExpenseTrackerComponent } from './components/expense-tracker/expense-tracker.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { LoginComponent } from './components/login/login.component';
import { PastReceiptsComponent } from './components/past-receipts/past-receipts.component';
import { PromotionsComponent } from './components/promotions/promotions.component';
import { SignupComponent } from './components/signup/signup.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'homepage', component: HomePageComponent },
  { path: 'promotions', component: PromotionsComponent },
  { path: 'past-receipts', component: PastReceiptsComponent },
  { path: 'expense-tracker', component: ExpenseTrackerComponent },
  { path: 'budget-settings', component: BudgetSettingsComponent },
  { path: '**', redirectTo: '/homepage' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }