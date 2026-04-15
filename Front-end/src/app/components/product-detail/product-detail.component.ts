import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService, ProductService } from '../../services/index';
import { Product } from '../../models/models';

@Component({
  selector: 'app-product-detail',
  styleUrls: ['./product-detail.component.css'],
  template: `
    <div class="product-detail-page">
      <div *ngIf="loading" class="loading">Cargando producto...</div>

      <div *ngIf="!loading && product" class="product-shell">
        <div class="product-detail card">
          <div class="gallery-column">
            <div class="product-image">
              <img [src]="selectedImage" [alt]="product.name" />
            </div>
            <div class="thumbnail-row">
              <button
                *ngFor="let image of galleryImages"
                type="button"
                class="thumbnail"
                [class.active]="selectedImage === image"
                (click)="selectedImage = image"
              >
                <img [src]="image" [alt]="product.name" />
              </button>
            </div>
          </div>

          <div class="product-info">
            <div class="eyebrow">{{ isService(product) ? 'Servicio destacado' : 'Producto destacado' }}</div>
            <h1>{{ product.name }}</h1>
            <p class="description">{{ product.description }}</p>

            <div class="summary-grid">
              <div>
                <div class="label">Precio</div>
                <div class="price">$ {{ (product.offerPrice || product.price) | number:'1.2-2' }}</div>
                <div class="label" *ngIf="product.offerPrice && product.offerPrice < product.price">Antes: $ {{ product.price | number:'1.2-2' }}</div>
              </div>
              <div>
                <div class="label">Calificación</div>
                <div class="rating">{{ product.rating }}/5</div>
              </div>
            </div>

            <div class="provider-card" *ngIf="product.seller">
              <div>
                <div class="label">Negocio proveedor</div>
                <strong>{{ product.seller.businessName }}</strong>
                <p>{{ product.seller.description || 'Proveedor registrado en Mercaclick.' }}</p>
              </div>
              <button class="btn-ghost" type="button" (click)="viewSellerProfile()">Ver negocio</button>
            </div>

            <div class="provider-meta" *ngIf="product.seller">
              <span class="meta-chip" [class.good-chip]="product.seller.hasHomeDelivery">{{ product.seller.hasHomeDelivery ? 'Entrega a domicilio disponible' : 'Sin entrega a domicilio' }}</span>
              <span class="meta-chip" [class.good-chip]="product.seller.hasPhysicalStore">{{ product.seller.hasPhysicalStore ? 'Cuenta con local físico' : 'Sin local físico declarado' }}</span>
              <span class="meta-chip" *ngIf="product.seller.businessHours">Horario: {{ product.seller.businessHours }}</span>
              <span class="meta-chip" *ngIf="product.seller.businessAddress">{{ product.seller.businessAddress }}</span>
            </div>

            <div class="stock" [class.out-of-stock]="!isService(product) && product.stock === 0">
              {{ getAvailabilityLabel(product) }}
            </div>

            <div class="purchase-box">
              <div class="quantity-selector" *ngIf="!isService(product)">
                <span>Cantidad</span>
                <div class="quantity-controls">
                  <button type="button" (click)="decreaseQuantity()" [disabled]="quantity <= 1">-</button>
                  <input type="number" [ngModel]="quantity" (ngModelChange)="onQuantityChange($event)" min="1" [max]="product.stock || 1" />
                  <button type="button" (click)="increaseQuantity()" [disabled]="quantity >= product.stock">+</button>
                </div>
              </div>

              <div class="action-row">
                <button class="btn-primary" type="button" (click)="handlePrimaryAction()" [disabled]="isPrimaryActionDisabled()">
                  {{ isService(product) ? 'Solicitar servicio' : 'Añadir al carrito' }}
                </button>
                <button class="btn-ghost" type="button" (click)="contactSeller()">
                  {{ isService(product) ? 'Ver negocio' : 'Contactar al experto' }}
                </button>
              </div>

              <p *ngIf="interactionMessage" class="interaction-note" [class.success-note]="interactionType === 'success'" [class.info-note]="interactionType === 'info'">
                {{ interactionMessage }}
              </p>
            </div>
          </div>
        </div>

        <div class="detail-panels card">
          <button type="button" class="panel-toggle" (click)="showSpecs = !showSpecs">
            <span>Especificaciones técnicas</span>
            <span>{{ showSpecs ? '−' : '+' }}</span>
          </button>
          <div *ngIf="showSpecs" class="panel-content">
            <div class="spec-grid">
              <div><strong>ID:</strong> {{ product.id }}</div>
              <div><strong>Categoría:</strong> {{ product.category?.name || product.categoryId || 'General' }}</div>
              <div><strong>Proveedor:</strong> {{ product.seller?.businessName || product.sellerId || 'Mercaclick' }}</div>
              <div><strong>SKU:</strong> {{ product.sku || 'No especificado' }}</div>
              <div><strong>Entrega:</strong> {{ getDeliveryLabel(product.deliveryType) }}</div>
              <div><strong>Punto de entrega:</strong> {{ product.dispatchLocation || 'Coordinado con el proveedor' }}</div>
              <div><strong>Actualizado:</strong> {{ product.updatedAt ? (product.updatedAt | date:'mediumDate') : 'Reciente' }}</div>
            </div>
          </div>

          <button type="button" class="panel-toggle" (click)="showWarranty = !showWarranty">
            <span>Garantía</span>
            <span>{{ showWarranty ? '−' : '+' }}</span>
          </button>
          <div *ngIf="showWarranty" class="panel-content">
            <p>
              Este producto cuenta con respaldo del proveedor dentro de Mercaclick. Antes de finalizar la compra,
              puedes contactar al vendedor para confirmar condiciones de entrega, soporte y cobertura.
            </p>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && !product" class="error">Producto no encontrado.</div>
    </div>
  `
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  quantity = 1;
  selectedImage = '';
  galleryImages: string[] = [];
  showSpecs = true;
  showWarranty = false;
  interactionMessage = '';
  interactionType: 'success' | 'info' | '' = '';

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.loading = false;
      return;
    }

    this.productService.getProductById(productId).subscribe({
      next: (data) => {
        this.product = data;
        this.galleryImages = this.buildGalleryImages(data.imageUrl);
        this.selectedImage = this.galleryImages[0];
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error('Error al cargar producto', err);
        this.loading = false;
      }
    });
  }

  addToCart(): void {
    if (!this.product) {
      return;
    }

    if (this.isService(this.product)) {
      this.interactionType = 'info';
      this.interactionMessage = `Abre una solicitud para coordinar ${this.product.name} con el proveedor.`;
      this.router.navigate(['/services/request', this.product.id]);
      return;
    }

    this.cartService.addToCart(this.product.id, this.quantity);
    this.interactionType = 'success';
    this.interactionMessage = `${this.product.name} fue añadido al carrito.`;
  }

  handlePrimaryAction(): void {
    if (!this.product) {
      return;
    }

    if (this.isService(this.product)) {
      this.addToCart();
      return;
    }

    this.addToCart();
  }

  isPrimaryActionDisabled(): boolean {
    if (!this.product) {
      return true;
    }

    if (this.isService(this.product)) {
      return !this.product.seller?.id || this.product.isActive === false;
    }

    return this.product.stock === 0;
  }

  increaseQuantity(): void {
    if (!this.product) {
      return;
    }

    this.quantity = Math.min(this.quantity + 1, Math.max(this.product.stock, 1));
  }

  decreaseQuantity(): void {
    this.quantity = Math.max(this.quantity - 1, 1);
  }

  onQuantityChange(value: string | number): void {
    if (!this.product) {
      this.quantity = 1;
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      this.quantity = 1;
      return;
    }

    this.quantity = Math.min(Math.max(Math.floor(parsed), 1), Math.max(this.product.stock, 1));
  }

  contactSeller(): void {
    if (!this.product) {
      return;
    }

    if (this.isService(this.product)) {
      this.interactionType = 'info';
      this.interactionMessage = `Revisa el negocio del proveedor para coordinar ${this.product.name} y confirmar horario o cobertura.`;
      this.viewSellerProfile();
      return;
    }

    this.interactionType = 'info';
    this.interactionMessage = `Puedes coordinar la compra de ${this.product.name} desde Mis pedidos o con los datos visibles del proveedor.`;
  }

  viewSellerProfile(): void {
    if (!this.product?.seller?.id) {
      return;
    }

    this.router.navigate(['/seller', this.product.seller.id]);
  }

  getDeliveryLabel(deliveryType?: string): string {
    if (deliveryType === 'envio') {
      return 'Envío';
    }

    if (deliveryType === 'mixto') {
      return 'Retiro y envío';
    }

    return 'Retiro';
  }

  getAvailabilityLabel(product: Product): string {
    if (this.isService(product)) {
      return 'Disponibilidad coordinada con el proveedor';
    }

    return product.stock === 0 ? 'Sin stock disponible' : 'Stock disponible: ' + product.stock;
  }

  isService(product: Product): boolean {
    return (product.itemType || 'producto') === 'servicio';
  }

  private buildGalleryImages(imageUrl: string): string[] {
    const fallback = imageUrl || 'https://placehold.co/800x600?text=Mercaclick';
    return [fallback, fallback, fallback, fallback];
  }
}
