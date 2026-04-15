import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CatalogComponent } from './components/catalog/catalog.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { CartComponent } from './components/cart/cart.component';
import { OrdersComponent } from './components/orders/orders.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { SellerProductFormComponent } from './components/seller-product-form/seller-product-form.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { SellerProfileComponent } from './components/seller-profile/seller-profile.component';
import { ServiceRequestFormComponent } from './components/service-request-form/service-request-form.component';
import { ServiceRequestsComponent } from './components/service-requests/service-requests.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    CatalogComponent,
    ProductDetailComponent,
    CartComponent,
    OrdersComponent,
    DashboardComponent,
    LoginComponent,
    RegisterComponent,
    SellerProductFormComponent,
    OrderConfirmationComponent,
    SellerProfileComponent,
    ServiceRequestFormComponent,
    ServiceRequestsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
