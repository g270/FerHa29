import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AuthService, CartService, NotificationService } from './services/index';
import { User } from './models/models';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Mercaclick';
  isAuthenticated = false;
  currentUser: User | null = null;
  cartCount = 0;
  unreadNotifications = 0;

  private authSubscription?: Subscription;
  private cartSubscription?: Subscription;
  private notificationsSubscription?: Subscription;
  private notificationsPollingSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.currentUser = this.authService.getCurrentUser();
    this.authSubscription = this.authService.authState$.subscribe((state) => {
      this.isAuthenticated = state;
      this.currentUser = this.authService.getCurrentUser();

       if (state) {
        this.refreshNotifications();
        this.startNotificationPolling();
      } else {
        this.stopNotificationPolling();
        this.notificationService.clear();
      }
    });
    this.cartSubscription = this.cartService.cartCount$.subscribe((count) => {
      this.cartCount = count;
    });
    this.notificationsSubscription = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadNotifications = count;
    });

    if (this.isAuthenticated) {
      this.refreshNotifications();
      this.startNotificationPolling();
    }
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.cartSubscription?.unsubscribe();
    this.notificationsSubscription?.unsubscribe();
    this.stopNotificationPolling();
  }

  logout(): void {
    this.stopNotificationPolling();
    this.notificationService.clear();
    this.authService.logout();
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  get isSeller(): boolean {
    return this.currentUser?.userType === 'seller' || this.currentUser?.userType === 'admin';
  }

  get isClient(): boolean {
    return this.currentUser?.userType === 'client';
  }

  private refreshNotifications(): void {
    this.notificationService.getNotifications(15).subscribe({
      error: () => {
        this.unreadNotifications = 0;
      }
    });
  }

  private startNotificationPolling(): void {
    this.stopNotificationPolling();
    this.notificationsPollingSubscription = interval(30000).subscribe(() => {
      if (this.isAuthenticated) {
        this.refreshNotifications();
      }
    });
  }

  private stopNotificationPolling(): void {
    this.notificationsPollingSubscription?.unsubscribe();
    this.notificationsPollingSubscription = undefined;
  }
}
