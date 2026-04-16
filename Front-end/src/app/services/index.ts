import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, map, of, shareReplay, tap } from 'rxjs';
import { AppNotification, AuthResponse, CartItem, Category, CreateOrderPayload, CreateServiceRequestPayload, NotificationResponse, Order, Product, Seller, ServiceRequest, UpdateServiceRequestPayload, User } from '../models/models';

const API_URL = 'http://localhost:3001/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'mercaclick_token';
  private readonly userKey = 'mercaclick_user';
  private readonly profileCacheTtlMs = 15000;
  private readonly authStateSubject = new BehaviorSubject<boolean>(this.hasToken());

  private profileLoaded = false;
  private lastProfileFetchAt = 0;
  private cachedProfile: User | null = null;
  private pendingProfileRequest?: Observable<User>;

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

  getProfile(forceRefresh = false): Observable<User> {
    const cacheIsFresh = this.profileLoaded && (Date.now() - this.lastProfileFetchAt) < this.profileCacheTtlMs;

    if (!forceRefresh && cacheIsFresh && this.cachedProfile) {
      return of({ ...this.cachedProfile, sellerProfile: this.cachedProfile.sellerProfile ? { ...this.cachedProfile.sellerProfile } : null });
    }

    if (!forceRefresh && this.pendingProfileRequest) {
      return this.pendingProfileRequest.pipe(
        map((user) => ({
          ...user,
          sellerProfile: user.sellerProfile ? { ...user.sellerProfile } : null
        }))
      );
    }

    const request = this.http.get<User>(`${API_URL}/users/profile`).pipe(
      tap((user) => this.setCachedProfile(user)),
      finalize(() => {
        if (this.pendingProfileRequest === request) {
          this.pendingProfileRequest = undefined;
        }
      }),
      shareReplay(1)
    );

    this.pendingProfileRequest = request;
    return request;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.cachedProfile = null;
    this.profileLoaded = false;
    this.lastProfileFetchAt = 0;
    this.pendingProfileRequest = undefined;
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
    this.cachedProfile = user;
    this.profileLoaded = true;
    this.lastProfileFetchAt = Date.now();
    this.pendingProfileRequest = undefined;
    this.authStateSubject.next(true);
  }

  private setCachedProfile(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.cachedProfile = user;
    this.profileLoaded = true;
    this.lastProfileFetchAt = Date.now();
  }

  private hasToken(): boolean {
    return Boolean(localStorage.getItem(this.tokenKey));
  }
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly cacheTtlMs = 15000;

  private productsLoaded = false;
  private lastProductsFetchAt = 0;
  private cachedProducts: Product[] = [];
  private pendingProductsRequest?: Observable<Product[]>;

  constructor(private http: HttpClient) {}

  getProducts(forceRefresh = false): Observable<Product[]> {
    const cacheIsFresh = this.productsLoaded && (Date.now() - this.lastProductsFetchAt) < this.cacheTtlMs;

    if (!forceRefresh && cacheIsFresh) {
      return of(this.cachedProducts.map((product) => ({ ...product })));
    }

    if (!forceRefresh && this.pendingProductsRequest) {
      return this.pendingProductsRequest.pipe(
        map((products) => products.map((product) => ({ ...product })))
      );
    }

    const request = this.http.get<Product[]>(`${API_URL}/products`).pipe(
      tap((products) => this.setProductsCache(products)),
      finalize(() => {
        if (this.pendingProductsRequest === request) {
          this.pendingProductsRequest = undefined;
        }
      }),
      shareReplay(1)
    );

    this.pendingProductsRequest = request;
    return request;
  }

  getCachedProducts(): Product[] | null {
    if (!this.productsLoaded) {
      return null;
    }

    return this.cachedProducts.map((product) => ({ ...product }));
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${API_URL}/products/${id}`);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${API_URL}/products`, product).pipe(
      tap(() => this.invalidateProductsCache())
    );
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${API_URL}/products/${id}`, product).pipe(
      tap((updatedProduct) => {
        if (!this.productsLoaded) {
          return;
        }

        this.cachedProducts = this.cachedProducts.map((item) =>
          item.id === updatedProduct.id ? updatedProduct : item
        );
        this.lastProductsFetchAt = Date.now();
      })
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/products/${id}`).pipe(
      tap(() => {
        if (!this.productsLoaded) {
          return;
        }

        this.cachedProducts = this.cachedProducts.filter((product) => product.id !== id);
        this.lastProductsFetchAt = Date.now();
      })
    );
  }

  private setProductsCache(products: Product[]): void {
    this.cachedProducts = products;
    this.productsLoaded = true;
    this.lastProductsFetchAt = Date.now();
  }

  private invalidateProductsCache(): void {
    this.productsLoaded = false;
    this.lastProductsFetchAt = 0;
    this.pendingProductsRequest = undefined;
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
  private readonly cacheTtlMs = 15000;

  private serviceRequestsLoaded = false;
  private lastServiceRequestsFetchAt = 0;
  private cachedServiceRequests: ServiceRequest[] = [];
  private pendingServiceRequestsRequest?: Observable<ServiceRequest[]>;

  constructor(private http: HttpClient) {}

  getServiceRequests(forceRefresh = false): Observable<ServiceRequest[]> {
    const cacheIsFresh = this.serviceRequestsLoaded && (Date.now() - this.lastServiceRequestsFetchAt) < this.cacheTtlMs;

    if (!forceRefresh && cacheIsFresh) {
      return of(this.cachedServiceRequests.map((request) => ({ ...request })));
    }

    if (!forceRefresh && this.pendingServiceRequestsRequest) {
      return this.pendingServiceRequestsRequest.pipe(
        map((requests) => requests.map((request) => ({ ...request })))
      );
    }

    const request = this.http.get<ServiceRequest[]>(`${API_URL}/service-requests`).pipe(
      tap((serviceRequests) => this.setServiceRequestsCache(serviceRequests)),
      finalize(() => {
        if (this.pendingServiceRequestsRequest === request) {
          this.pendingServiceRequestsRequest = undefined;
        }
      }),
      shareReplay(1)
    );

    this.pendingServiceRequestsRequest = request;
    return request;
  }

  getCachedServiceRequests(): ServiceRequest[] | null {
    if (!this.serviceRequestsLoaded) {
      return null;
    }

    return this.cachedServiceRequests.map((request) => ({ ...request }));
  }

  createServiceRequest(payload: CreateServiceRequestPayload): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${API_URL}/service-requests`, payload).pipe(
      tap(() => this.invalidateServiceRequestsCache())
    );
  }

  updateServiceRequestStatus(id: string, payload: UpdateServiceRequestPayload): Observable<ServiceRequest> {
    return this.http.put<ServiceRequest>(`${API_URL}/service-requests/${id}/status`, payload).pipe(
      tap((updatedRequest) => {
        if (!this.serviceRequestsLoaded) {
          return;
        }

        this.cachedServiceRequests = this.cachedServiceRequests.map((request) =>
          request.id === updatedRequest.id ? updatedRequest : request
        );
        this.lastServiceRequestsFetchAt = Date.now();
      })
    );
  }

  private setServiceRequestsCache(serviceRequests: ServiceRequest[]): void {
    this.cachedServiceRequests = serviceRequests;
    this.serviceRequestsLoaded = true;
    this.lastServiceRequestsFetchAt = Date.now();
  }

  private invalidateServiceRequestsCache(): void {
    this.serviceRequestsLoaded = false;
    this.lastServiceRequestsFetchAt = 0;
    this.pendingServiceRequestsRequest = undefined;
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly cacheTtlMs = 15000;

  private notificationsLoaded = false;
  private lastNotificationsFetchAt = 0;
  private pendingNotificationsRequest?: Observable<NotificationResponse>;

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(limit = 25, forceRefresh = false): Observable<NotificationResponse> {
    const cachedResponse = this.getCachedResponse(limit);
    const cacheIsFresh = cachedResponse && (Date.now() - this.lastNotificationsFetchAt) < this.cacheTtlMs;

    if (!forceRefresh && cacheIsFresh) {
      return of(cachedResponse);
    }

    if (!forceRefresh && this.pendingNotificationsRequest) {
      return this.pendingNotificationsRequest.pipe(
        map((response) => this.cloneNotificationResponse(response, limit))
      );
    }

    const request = this.http.get<NotificationResponse>(`${API_URL}/notifications?limit=${limit}`).pipe(
      tap((response) => this.setNotificationState(response)),
      finalize(() => {
        if (this.pendingNotificationsRequest === request) {
          this.pendingNotificationsRequest = undefined;
        }
      }),
      shareReplay(1)
    );

    this.pendingNotificationsRequest = request;
    return request;
  }

  getCachedResponse(limit = 25): NotificationResponse | null {
    if (!this.notificationsLoaded) {
      return null;
    }

    return this.cloneNotificationResponse({
      items: this.notificationsSubject.value,
      unreadCount: this.unreadCountSubject.value
    }, limit);
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
    this.notificationsLoaded = false;
    this.lastNotificationsFetchAt = 0;
    this.pendingNotificationsRequest = undefined;
  }

  private setNotificationState(response: NotificationResponse): void {
    this.notificationsSubject.next(response.items);
    this.unreadCountSubject.next(response.unreadCount);
    this.notificationsLoaded = true;
    this.lastNotificationsFetchAt = Date.now();
  }

  private cloneNotificationResponse(response: NotificationResponse, limit: number): NotificationResponse {
    return {
      items: response.items.slice(0, limit),
      unreadCount: response.unreadCount
    };
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
