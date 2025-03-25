import { NgModule, isDevMode } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BudgetSettingsComponent } from './components/budget-settings/budget-settings.component';
import { ExpenseTrackerComponent } from './components/expense-tracker/expense-tracker.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { LoginComponent } from './components/login/login.component';
import { PastReceiptsComponent } from './components/past-receipts/past-receipts.component';
import { PromotionsComponent } from './components/promotions/promotions.component';
import { RewardsComponent } from './components/rewards/rewards.component';
import { SavedPromotionsComponent } from './components/saved-promotions/saved-promotions.component';
import { SignupComponent } from './components/signup/signup.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { MaterialModule } from './material.module';
import { BudgetService } from './services/budget.service';
import { CameraService } from './services/camera.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { PromotionService } from './services/promotions.service';
import { ReceiptProcessingService } from './services/receipt-processing.service';
import { ReceiptService } from './services/receipt.service';
import { RewardsService } from './services/rewards.service';
import { SavedPromotionsService } from './services/saved-promotions.service';
import { UserService } from './services/user.service';
import { HomePageStore } from './stores/homepage.store';


@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    LoginComponent,
    ExpenseTrackerComponent,
    PastReceiptsComponent,
    PromotionsComponent,
    SignupComponent,
    BudgetSettingsComponent,
    RewardsComponent,
    SavedPromotionsComponent
    ],
  imports: [
    BrowserModule,
    HttpClientModule,FormsModule,AppRoutingModule,ReactiveFormsModule,MaterialModule, ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: !isDevMode(),
  // Register the ServiceWorker as soon as the application is stable
  // or after 30 seconds (whichever comes first).
  registrationStrategy: 'registerWhenStable:30000'
})],
  providers: [
    PromotionService,
    ReceiptService,
    UserService,
    FirebaseAuthService,
    RewardsService,
    BudgetService,
    SavedPromotionsService,
    CameraService,
    ReceiptProcessingService,
    HomePageStore,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})

export class AppModule { }