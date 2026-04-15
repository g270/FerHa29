import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componentes (a crear)
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
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ServiceRequestFormComponent } from './components/service-request-form/service-request-form.component';
import { ServiceRequestsComponent } from './components/service-requests/service-requests.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', component: CatalogComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'seller/:id', component: SellerProfileComponent },
  { path: 'services/request/:id', component: ServiceRequestFormComponent, canActivate: [AuthGuard] },
  { path: 'service-requests', component: ServiceRequestsComponent, canActivate: [AuthGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: 'cart', component: CartComponent },
  { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard] },
  { path: 'orders/:id/confirmation', component: OrderConfirmationComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'seller/products/new', component: SellerProductFormComponent, canActivate: [AuthGuard] },
  { path: 'seller/products/:id/edit', component: SellerProductFormComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
