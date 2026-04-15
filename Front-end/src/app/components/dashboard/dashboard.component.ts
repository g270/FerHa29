import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Product, User } from '../../models/models';
import { AuthService, ProductService } from '../../services/index';

@Component({
  selector: 'app-dashboard',
  styleUrls: ['./dashboard.component.css'],
  template: `
    <section class="business-profile">
      <div class="banner"></div>
      <div class="profile-header">
        <div class="avatar">
          <img [src]="user?.sellerProfile?.logoUrl || 'https://placehold.co/240x240?text=MC'" alt="Logo" />
        </div>
        <div class="profile-info">
          <h1>{{ user?.sellerProfile?.businessName || (user?.firstName + ' ' + user?.lastName) }}</h1>
          <div class="trust-info">
            <span class="badge">{{ getYearsInMercaclick(user?.createdAt) }} años en Mercaclick</span>
            <span class="badge">⭐ {{ user?.sellerProfile?.rating || '5.0' }}</span>
            <span class="badge">📍 {{ user?.address || 'Ubicación no registrada' }}</span>
          </div>
        </div>
      </div>
      <div class="tabs">
        <button [class.active]="activeTab === 'productos'" (click)="activeTab = 'productos'">Productos</button>
        <button [class.active]="activeTab === 'servicios'" (click)="activeTab = 'servicios'">Servicios</button>
        <button [class.active]="activeTab === 'resenas'" (click)="activeTab = 'resenas'">Reseñas</button>
      </div>
      <div class="tab-content">
        <div *ngIf="activeTab === 'productos'">
          <div class="tab-toolbar" *ngIf="isSeller">
            <div>
              <h2>Panel de publicaciones</h2>
              <p>Gestiona el estado, las ofertas y el inventario visible de tu tienda dentro de Mercaclick.</p>
            </div>
            <button type="button" class="btn-primary" (click)="goToCreateProduct()">Nueva publicación</button>
          </div>

          <div *ngIf="productsLoading" class="state">Cargando publicaciones...</div>

          <div class="product-summary" *ngIf="!productsLoading && sellerProducts.length > 0">
            <article class="summary-tile card">
              <span>Total publicadas</span>
              <strong>{{ sellerProducts.length }}</strong>
            </article>
            <article class="summary-tile card">
              <span>Activas</span>
              <strong>{{ getActiveCount() }}</strong>
            </article>
            <article class="summary-tile card warning-tile">
              <span>Borradores</span>
              <strong>{{ getDraftCount() }}</strong>
            </article>
            <article class="summary-tile card accent-tile">
              <span>Con oferta</span>
              <strong>{{ getOfferCount() }}</strong>
            </article>
          </div>

          <div class="product-list" *ngIf="!productsLoading && sellerProducts.length > 0">
            <article class="product-item card" *ngFor="let product of sellerProducts" [class.inactive-product]="product.isActive === false" [class.low-stock-product]="product.stock === 0">
              <img [src]="product.imageUrl || 'https://placehold.co/600x400?text=Mercaclick'" [alt]="product.name" />
              <div class="product-copy">
                <div class="product-heading">
                  <h3>{{ product.name }}</h3>
                  <span class="status-pill" [class.draft]="product.isActive === false" [class.live]="product.isActive !== false">
                    {{ product.isActive === false ? 'Borrador' : 'Activa' }}
                  </span>
                </div>
                <p>{{ product.description }}</p>
                <div class="product-meta">
                  <span class="badge">$ {{ getDisplayPrice(product) | number:'1.2-2' }}</span>
                  <span class="meta-chip offer-chip" *ngIf="product.offerPrice && product.offerPrice < product.price">Oferta desde $ {{ product.offerPrice | number:'1.2-2' }}</span>
                  <span class="meta-chip" *ngIf="product.offerPrice && product.offerPrice < product.price">Antes: $ {{ product.price | number:'1.2-2' }}</span>
                  <span class="meta-chip">{{ getCategoryName(product) }}</span>
                  <span class="meta-chip" [class.alert-chip]="product.stock === 0">{{ product.stock === 0 ? 'Sin stock' : 'Stock: ' + product.stock }}</span>
                  <span class="meta-chip">⭐ {{ product.rating }}</span>
                </div>
                <div class="product-actions">
                  <button type="button" class="btn-ghost" (click)="editProduct(product.id)">Editar</button>
                  <button type="button" class="btn-secondary danger-btn" (click)="removeProduct(product)" [disabled]="removingProductId === product.id">
                    {{ removingProductId === product.id ? 'Eliminando...' : 'Eliminar' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <p class="state success" *ngIf="productMessage">{{ productMessage }}</p>
          <p class="state error" *ngIf="productError">{{ productError }}</p>

          <div class="empty-panel card" *ngIf="!productsLoading && sellerProducts.length === 0">
            <p>Aún no tienes publicaciones asociadas a esta cuenta.</p>
            <button type="button" class="btn-secondary" (click)="goToCreateProduct()">Crear primera publicación</button>
          </div>
        </div>
        <div *ngIf="activeTab === 'servicios'">
          <div class="empty-panel card">
            <p>La sección de servicios está lista para conectarse cuando el backend distinga productos y servicios.</p>
          </div>
        </div>
        <div *ngIf="activeTab === 'resenas'">
          <div class="empty-panel card">
            <p>Las reseñas del negocio se mostrarán aquí cuando la API exponga el historial de opiniones.</p>
          </div>
        </div>
      </div>
      <div *ngIf="loading" class="state">Cargando perfil...</div>
      <div *ngIf="error" class="state error">{{ error }}</div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  loading = true;
  productsLoading = false;
  error = '';
  sellerProducts: Product[] = [];
  productMessage = '';
  productError = '';
  removingProductId: string | null = null;

  // Tabs para la vista de negocio
  activeTab: 'productos' | 'servicios' | 'resenas' = 'productos';

  // Calcular años en Mercaclick
  getYearsInMercaclick(dateStr?: string): number {
    if (!dateStr) return 1;
    const created = new Date(dateStr);
    const now = new Date();
    return Math.max(1, now.getFullYear() - created.getFullYear());
  }

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        this.loadSellerProducts();
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error('Error cargando perfil', err);
        this.error = 'No se pudo cargar el perfil';
        this.loading = false;
      }
    });
  }

  get isSeller(): boolean {
    return this.user?.userType === 'seller' || this.user?.userType === 'admin';
  }

  goToCreateProduct(): void {
    this.router.navigate(['/seller/products/new']);
  }

  editProduct(productId: string): void {
    this.router.navigate(['/seller/products', productId, 'edit']);
  }

  removeProduct(product: Product): void {
    if (!product.id || this.removingProductId) {
      return;
    }

    const confirmed = window.confirm(`¿Deseas eliminar la publicación "${product.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    this.productMessage = '';
    this.productError = '';
    this.removingProductId = product.id;

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.sellerProducts = this.sellerProducts.filter((item) => item.id !== product.id);
        this.productMessage = 'La publicación fue eliminada correctamente.';
        this.removingProductId = null;
      },
      error: (err: unknown) => {
        console.error('Error eliminando producto', err);
        this.productError = 'No se pudo eliminar la publicación. Intenta nuevamente.';
        this.removingProductId = null;
      }
    });
  }

  getCategoryName(product: Product): string {
    return product.category?.name || 'Sin categoría';
  }

  getDisplayPrice(product: Product): number {
    return product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  }

  getActiveCount(): number {
    return this.sellerProducts.filter((product) => product.isActive !== false).length;
  }

  getDraftCount(): number {
    return this.sellerProducts.filter((product) => product.isActive === false).length;
  }

  getOfferCount(): number {
    return this.sellerProducts.filter((product) => Boolean(product.offerPrice && product.offerPrice < product.price)).length;
  }

  private loadSellerProducts(): void {
    if (!this.user?.id || !this.isSeller) {
      this.sellerProducts = [];
      return;
    }

    this.productsLoading = true;
    this.productMessage = '';
    this.productError = '';
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.sellerProducts = products.filter((product) => product.sellerId === this.user?.sellerProfile?.id);
        this.productsLoading = false;
      },
      error: () => {
        this.productsLoading = false;
      }
    });
  }
}
