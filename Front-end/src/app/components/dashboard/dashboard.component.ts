import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Product, Seller, User } from '../../models/models';
import { AuthService, ProductService, SellerService } from '../../services/index';

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
        <button [class.active]="activeTab === 'negocio'" (click)="activeTab = 'negocio'">Negocio</button>
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
        <div *ngIf="activeTab === 'negocio'">
          <div class="business-grid" *ngIf="isSeller && businessForm">
            <section class="card business-card business-overview">
              <h2>Perfil comercial</h2>
              <p class="business-copy">Configura cómo se presenta tu negocio ante los clientes: entregas, local físico, horarios y detalles del establecimiento.</p>
              <div class="business-badges">
                <span class="meta-chip highlight-chip" [class.active-chip]="businessForm.hasHomeDelivery">{{ businessForm.hasHomeDelivery ? 'Entrega a domicilio activa' : 'Sin entrega a domicilio' }}</span>
                <span class="meta-chip highlight-chip" [class.active-chip]="businessForm.hasPhysicalStore">{{ businessForm.hasPhysicalStore ? 'Cuenta con local físico' : 'Sin local físico declarado' }}</span>
              </div>
              <div class="business-facts">
                <article>
                  <span>Dirección comercial</span>
                  <strong>{{ businessForm.businessAddress || 'Aún no registrada' }}</strong>
                </article>
                <article>
                  <span>Horario de atención</span>
                  <strong>{{ businessForm.businessHours || 'Aún no definido' }}</strong>
                </article>
              </div>
            </section>

            <form class="card business-card business-form" (ngSubmit)="saveBusinessProfile()">
              <div class="business-form-header">
                <div>
                  <h2>Datos del negocio</h2>
                  <p>Estos datos ayudarán a mostrar si el proveedor hace entregas, atiende en local y en qué horario opera.</p>
                </div>
                <button type="submit" class="btn-primary" [disabled]="savingBusinessProfile || !user?.sellerProfile?.id">
                  {{ savingBusinessProfile ? 'Guardando...' : 'Guardar perfil' }}
                </button>
              </div>

              <div class="business-form-grid">
                <label>
                  <span>Nombre del negocio</span>
                  <input type="text" name="businessName" [(ngModel)]="businessForm.businessName" />
                </label>

                <label>
                  <span>Logo o imagen del negocio</span>
                  <input type="url" name="logoUrl" [(ngModel)]="businessForm.logoUrl" placeholder="https://ejemplo.com/logo.jpg" />
                </label>

                <label class="full-width">
                  <span>Descripción comercial</span>
                  <textarea name="description" rows="4" [(ngModel)]="businessForm.description"></textarea>
                </label>

                <label>
                  <span>Dirección del local o punto comercial</span>
                  <input type="text" name="businessAddress" [(ngModel)]="businessForm.businessAddress" placeholder="Sucursal, colonia, referencias" />
                </label>

                <label>
                  <span>Horario de servicio</span>
                  <input type="text" name="businessHours" [(ngModel)]="businessForm.businessHours" placeholder="Lun-Vie 9:00 a 18:00" />
                </label>

                <label class="full-width">
                  <span>Detalle adicional del negocio</span>
                  <textarea name="businessNotes" rows="4" [(ngModel)]="businessForm.businessNotes" placeholder="Ejemplo: trabajamos sobre pedido, entregas en zona centro, atención por cita"></textarea>
                </label>
              </div>

              <div class="business-switches">
                <button type="button" class="toggle-pill" [class.enabled]="businessForm.hasHomeDelivery" (click)="businessForm.hasHomeDelivery = !businessForm.hasHomeDelivery">
                  {{ businessForm.hasHomeDelivery ? 'Sí ofrece envío a domicilio' : 'No ofrece envío a domicilio' }}
                </button>
                <button type="button" class="toggle-pill" [class.enabled]="businessForm.hasPhysicalStore" (click)="businessForm.hasPhysicalStore = !businessForm.hasPhysicalStore">
                  {{ businessForm.hasPhysicalStore ? 'Sí cuenta con local físico' : 'No cuenta con local físico' }}
                </button>
              </div>
            </form>
          </div>

          <div class="empty-panel card" *ngIf="!isSeller">
            <p>Este espacio de negocio está disponible para cuentas de proveedor.</p>
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
  businessForm: Seller | null = null;
  savingBusinessProfile = false;
  businessMessage = '';
  businessError = '';

  // Tabs para la vista de negocio
  activeTab: 'productos' | 'negocio' | 'resenas' = 'productos';

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
    private sellerService: SellerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        this.syncBusinessForm();
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

  saveBusinessProfile(): void {
    if (!this.user?.sellerProfile?.id || !this.businessForm || this.savingBusinessProfile) {
      return;
    }

    this.savingBusinessProfile = true;
    this.businessMessage = '';
    this.businessError = '';

    this.sellerService.updateSeller(this.user.sellerProfile.id, {
      businessName: this.businessForm.businessName,
      description: this.businessForm.description,
      logoUrl: this.businessForm.logoUrl,
      hasHomeDelivery: this.businessForm.hasHomeDelivery,
      hasPhysicalStore: this.businessForm.hasPhysicalStore,
      businessAddress: this.businessForm.businessAddress,
      businessHours: this.businessForm.businessHours,
      businessNotes: this.businessForm.businessNotes
    }).subscribe({
      next: (sellerProfile) => {
        this.user = {
          ...this.user!,
          sellerProfile: {
            ...this.user!.sellerProfile!,
            ...sellerProfile
          }
        };
        this.syncBusinessForm();
        this.businessMessage = 'El perfil comercial del negocio se actualizó correctamente.';
        this.savingBusinessProfile = false;
        this.authService.getProfile().subscribe({
          next: (profile) => {
            this.user = profile;
            this.syncBusinessForm();
          },
          error: () => undefined
        });
      },
      error: (err: unknown) => {
        console.error('Error actualizando perfil de negocio', err);
        this.businessError = 'No se pudo guardar el perfil del negocio. Intenta nuevamente.';
        this.savingBusinessProfile = false;
      }
    });
  }

  private syncBusinessForm(): void {
    if (!this.user?.sellerProfile) {
      this.businessForm = null;
      return;
    }

    this.businessForm = {
      ...this.user.sellerProfile,
      businessName: this.user.sellerProfile.businessName || '',
      description: this.user.sellerProfile.description || '',
      logoUrl: this.user.sellerProfile.logoUrl || '',
      businessAddress: this.user.sellerProfile.businessAddress || '',
      businessHours: this.user.sellerProfile.businessHours || '',
      businessNotes: this.user.sellerProfile.businessNotes || '',
      hasHomeDelivery: Boolean(this.user.sellerProfile.hasHomeDelivery),
      hasPhysicalStore: Boolean(this.user.sellerProfile.hasPhysicalStore)
    };
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
