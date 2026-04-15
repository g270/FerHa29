import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { AppNotification, AuthResponse, CartItem, Category, CreateOrderPayload, CreateServiceRequestPayload, NotificationResponse, Order, Product, Seller, ServiceRequest, UpdateServiceRequestPayload, User } from '../models/models';

const API_URL = 'http://localhost:3001/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'mercaclick_token';
  private readonly userKey = 'mercaclick_user';
  private readonly authStateSubject = new BehaviorSubject<boolean>(this.hasToken());

  authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    userType: 'client' | 'seller';
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/users/register`, payload).pipe(
      tap((response) => this.setSession(response.token, response.user))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/users/login`, { email, password }).pipe(
      tap((response) => this.setSession(response.token, response.user))
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${API_URL}/users/profile`).pipe(
      tap((user) => localStorage.setItem(this.userKey, JSON.stringify(user)))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.authStateSubject.next(false);
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    const user = localStorage.getItem(this.userKey);
    return user ? (JSON.parse(user) as User) : null;
  }

  getDisplayName(): Observable<string> {
    return this.getProfile().pipe(
      map((user) => {
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
        return fullName || user.email;
      })
    );
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.authStateSubject.next(true);
  }

  private hasToken(): boolean {
    return Boolean(localStorage.getItem(this.tokenKey));
  }
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_URL}/products`);
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${API_URL}/products/${id}`);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${API_URL}/products`, product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${API_URL}/products/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/products/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  constructor(private http: HttpClient) {}

  getSellers(): Observable<Seller[]> {
    return this.http.get<Seller[]>(`${API_URL}/sellers`);
  }

  getSellerById(id: string): Observable<Seller> {
    return this.http.get<Seller>(`${API_URL}/sellers/${id}`);
  }

  getSellerProducts(id: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_URL}/sellers/${id}/products`);
  }

  updateSeller(id: string, seller: Partial<Seller>): Observable<Seller> {
    return this.http.put<Seller>(`${API_URL}/sellers/${id}`, seller);
  }
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${API_URL}/categories`);
  }
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${API_URL}/orders`);
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${API_URL}/orders/${id}`);
  }

  createOrder(order: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${API_URL}/orders`, order);
  }

  updateOrderStatus(id: string, status: Order['status']): Observable<Order> {
    return this.http.put<Order>(`${API_URL}/orders/${id}/status`, { status });
  }
}

@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  constructor(private http: HttpClient) {}

  getServiceRequests(): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(`${API_URL}/service-requests`);
  }

  createServiceRequest(payload: CreateServiceRequestPayload): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${API_URL}/service-requests`, payload);
  }

  updateServiceRequestStatus(id: string, payload: UpdateServiceRequestPayload): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${API_URL}/service-requests/${id}/status`, payload);
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(limit = 25): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${API_URL}/notifications?limit=${limit}`).pipe(
      tap((response) => this.setNotificationState(response))
    );
  }

  markAsRead(id: string): Observable<AppNotification> {
    return this.http.put<AppNotification>(`${API_URL}/notifications/${id}/read`, {}).pipe(
      tap((notification) => {
        const updatedItems = this.notificationsSubject.value.map((item) =>
          item.id === notification.id ? notification : item
        );
        this.notificationsSubject.next(updatedItems);
        this.unreadCountSubject.next(updatedItems.filter((item) => !item.isRead).length);
      })
    );
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${API_URL}/notifications/read-all`, {}).pipe(
      tap(() => {
        const updatedItems = this.notificationsSubject.value.map((item) => ({ ...item, isRead: true }));
        this.notificationsSubject.next(updatedItems);
        this.unreadCountSubject.next(0);
      })
    );
  }

  clear(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  private setNotificationState(response: NotificationResponse): void {
    this.notificationsSubject.next(response.items);
    this.unreadCountSubject.next(response.unreadCount);
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartKey = 'mercaclick_cart';
  private readonly cartCountSubject = new BehaviorSubject<number>(this.getStoredCartCount());

  cartCount$ = this.cartCountSubject.asObservable();

  getCart(): CartItem[] {
    const cart = localStorage.getItem(this.cartKey);
    return cart ? (JSON.parse(cart) as CartItem[]) : [];
  }

  addToCart(productId: string, quantity: number): void {
    const cart = this.getCart();
    const existing = cart.find((item) => item.productId === productId);

    if (existing) {
      existing.quantity += quantity;
      if (existing.quantity < 1) {
        existing.quantity = 1;
      }
    } else {
      cart.push({ productId, quantity: Math.max(1, quantity) });
    }

    localStorage.setItem(this.cartKey, JSON.stringify(cart));
    this.emitCartCount(cart);
  }

  updateQuantity(productId: string, quantity: number): void {
    const cart = this.getCart().map((item) =>
      item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    );
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
    this.emitCartCount(cart);
  }

  removeFromCart(productId: string): void {
    const cart = this.getCart().filter((item) => item.productId !== productId);
    localStorage.setItem(this.cartKey, JSON.stringify(cart));
    this.emitCartCount(cart);
  }

  clearCart(): void {
    localStorage.removeItem(this.cartKey);
    this.cartCountSubject.next(0);
  }

  private emitCartCount(cart: CartItem[]): void {
    this.cartCountSubject.next(cart.reduce((total, item) => total + Math.max(1, item.quantity), 0));
  }

  private getStoredCartCount(): number {
    try {
      const cart = localStorage.getItem(this.cartKey);
      if (!cart) {
        return 0;
      }

      return (JSON.parse(cart) as CartItem[]).reduce((total, item) => total + Math.max(1, item.quantity), 0);
    } catch {
      return 0;
    }
  }
}
