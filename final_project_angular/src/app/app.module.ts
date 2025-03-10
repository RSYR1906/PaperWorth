import { NgModule, isDevMode } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BudgetSettingsComponent } from './components/budget-settings/budget-settings.component';
import { ExpenseTrackerComponent } from './components/expense-tracker/expense-tracker.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { LoginComponent } from './components/login/login.component';
import { PastReceiptsComponent } from './components/past-receipts/past-receipts.component';
import { PromotionsComponent } from './components/promotions/promotions.component';
import { SignupComponent } from './components/signup/signup.component';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { PromotionService } from './services/promotions.service';
import { ReceiptService } from './services/receipt.service';
import { UserService } from './services/user.service';


@NgModule({
  declarations: [
    AppComponent,HomePageComponent,
    LoginComponent,
    ExpenseTrackerComponent,
    PastReceiptsComponent,
    PromotionsComponent,
    SignupComponent,
    BudgetSettingsComponent
    ],
  imports: [
    BrowserModule,
    HttpClientModule,FormsModule,AppRoutingModule,ReactiveFormsModule, ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: !isDevMode(),
  // Register the ServiceWorker as soon as the application is stable
  // or after 30 seconds (whichever comes first).
  registrationStrategy: 'registerWhenStable:30000'
})],
  providers: [PromotionService,ReceiptService,UserService,FirebaseAuthService],
  bootstrap: [AppComponent]
})

export class AppModule { }