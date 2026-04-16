import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CartItem } from '../../models/models';
import { AuthService, CartService, OrderService, ProductService } from '../../services/index';

@Component({
  selector: 'app-cart',
  standalone: false,
  template: `
    <div class="cart-container">
      <div class="cart-header">
        <div>
          <p class="eyebrow">Checkout</p>
          <h1>Carrito de Compras</h1>
          <p class="header-copy">Confirma cantidades, revisa disponibilidad y actualiza el carrito antes de finalizar tu pedido.</p>
        </div>
        <button type="button" class="btn-refresh" (click)="refreshCart()" [disabled]="loading">
          Actualizar carrito
        </button>
      </div>

      <div *ngIf="items.length === 0" class="empty-cart">Tu carrito está vacío.</div>

      <div *ngIf="items.length > 0" class="cart-items">
        <div class="cart-summary">
          <div class="summary-card">
            <span>Productos</span>
            <strong>{{ items.length }}</strong>
          </div>
          <div class="summary-card">
            <span>Unidades</span>
            <strong>{{ getTotalUnits() }}</strong>
          </div>
          <div class="summary-card warning" *ngIf="hasBlockingIssues()">
            <span>Atención</span>
            <strong>{{ getIssueCount() }} incidencia(s)</strong>
          </div>
        </div>

        <div *ngFor="let item of items" class="cart-item" [class.has-issue]="!!item.availabilityIssue">
          <div *ngIf="item.product" class="product-info">
            <div class="product-title-row">
              <h3>{{ item.product.name }}</h3>
              <span class="availability-pill" [class.warning]="!!item.availabilityIssue" [class.ok]="!item.availabilityIssue">
                {{ item.availabilityIssue ? 'Revisar' : 'Disponible' }}
              </span>
            </div>
            <p>{{ item.product.description }}</p>
            <span class="price">Precio: {{ getEffectivePrice(item.product) | number:'1.2-2' }}</span>
            <span class="price original-price" *ngIf="item.product.offerPrice && item.product.offerPrice < item.product.price">
              Antes: {{ item.product.price | number:'1.2-2' }}
            </span>
            <div class="meta-row">
              <span class="meta-chip">{{ item.product.itemType === 'servicio' ? 'Servicio coordinado con el proveedor' : 'Stock actual: ' + item.product.stock }}</span>
              <span class="meta-chip" *ngIf="item.product.deliveryType">Entrega: {{ getDeliveryLabel(item.product.deliveryType) }}</span>
              <span class="meta-chip" *ngIf="item.product.itemType === 'servicio'">No disponible para checkout</span>
            </div>
          </div>
          <div *ngIf="!item.product" class="product-info unavailable-copy">
            <h3>Producto no disponible</h3>
            <p>Esta publicación ya no pudo cargarse. Puedes retirarla del carrito.</p>
          </div>

          <div class="quantity-controls">
            <label for="qty-{{ item.productId }}">Cantidad:</label>
            <input
              id="qty-{{ item.productId }}"
              type="number"
              [(ngModel)]="item.quantity"
              min="1"
              [max]="item.product?.stock || null"
              [disabled]="loading || !item.product || item.product.isActive === false || item.product.itemType === 'servicio' || (item.product.stock || 0) === 0"
              (change)="updateQuantity(item)"
            />
          </div>

          <p class="item-status error" *ngIf="item.availabilityIssue">{{ item.availabilityIssue }}</p>

          <div class="subtotal">
            Subtotal: {{ item.product ? (getEffectivePrice(item.product) * item.quantity).toFixed(2) : '0.00' }}
          </div>

          <button type="button" (click)="remove(item.productId)">Eliminar</button>
        </div>

        <div class="total">Total: {{ total.toFixed(2) }}</div>
        <button class="btn-checkout" type="button" (click)="checkout()" [disabled]="loading || hasBlockingIssues()">
          {{ loading ? 'Procesando pedido...' : 'Proceder a comprar' }}
        </button>
        <p class="status helper" *ngIf="hasBlockingIssues()">Corrige los elementos marcados antes de continuar. Los servicios deben coordinarse desde el negocio del proveedor.</p>
        <p class="status success" *ngIf="message">{{ message }}</p>
        <p class="status error" *ngIf="error">{{ error }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .cart-container { padding: 2rem; max-width: 800px; margin: 0 auto; }
      .cart-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
      .eyebrow { margin: 0 0 0.35rem; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.78rem; font-weight: 800; color: #2a9d8f; }
      .header-copy { margin: 0.35rem 0 0; color: #6b7280; max-width: 540px; }
      .btn-refresh { padding: 0.85rem 1rem; border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; font-weight: 700; cursor: pointer; }
      .empty-cart { text-align: center; color: #999; font-size: 1.2rem; margin: 2rem 0; }
      .cart-items { margin-top: 2rem; }
      .cart-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
      .summary-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 1rem; background: #fff; display: grid; gap: 0.35rem; }
      .summary-card span { color: #64748b; font-weight: 600; }
      .summary-card strong { color: #0f172a; font-size: 1.25rem; }
      .summary-card.warning { background: #fff7ed; border-color: #fdba74; }
      .cart-item { border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 1rem; background: #fff; }
      .cart-item.has-issue { border-color: #f59e0b; background: #fffbeb; }
      .product-info h3 { margin: 0; color: #264653; }
      .product-info p { margin: 0.5rem 0; color: #666; }
      .product-title-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .availability-pill { border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 800; }
      .availability-pill.ok { background: #dcfce7; color: #166534; }
      .availability-pill.warning { background: #fef3c7; color: #92400e; }
      .unavailable-copy h3 { color: #991b1b; }
      .price { font-weight: bold; color: #2a9d8f; }
      .original-price { color: #6b7280; text-decoration: line-through; margin-left: 0.5rem; }
      .meta-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
      .meta-chip { background: #f1f5f9; color: #334155; border-radius: 999px; padding: 0.35rem 0.75rem; font-weight: 700; font-size: 0.85rem; }
      .quantity-controls { display: flex; align-items: center; gap: 0.5rem; }
      .quantity-controls input { width: 70px; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
      .item-status { margin: 0; font-weight: 600; }
      .subtotal { font-weight: bold; color: #264653; }
      .cart-item button { padding: 0.5rem 1rem; background-color: #e63946; color: white; border: 0; border-radius: 4px; cursor: pointer; align-self: flex-start; }
      .total { font-size: 1.5rem; font-weight: bold; margin-top: 2rem; text-align: right; color: #264653; }
      .btn-checkout { padding: 1rem; background-color: #2a9d8f; color: white; border: 0; border-radius: 8px; cursor: pointer; width: 100%; margin-top: 1rem; font-size: 1.1rem; }
      .btn-checkout:disabled { opacity: 0.7; cursor: not-allowed; }
      .status { margin: 0.75rem 0 0; font-weight: 700; }
      .status.helper { color: #92400e; }
      .status.success { color: #166534; }
      .status.error { color: #b42318; }
      @media (max-width: 720px) {
        .cart-header { flex-direction: column; }
        .cart-summary { grid-template-columns: 1fr; }
        .product-title-row { flex-direction: column; align-items: flex-start; }
      }
    `
  ]
})
export class CartComponent implements OnInit {
  items: CartItem[] = [];
  total = 0;
  loading = false;
  message = '';
  error = '';

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.items = this.cartService.getCart();
    this.syncProductDetails();
  }

  syncProductDetails(onComplete?: () => void): void {
    if (this.items.length === 0) {
      this.calculateTotal();
      onComplete?.();
      return;
    }

    forkJoin(
      this.items.map((item) =>
        this.productService.getProductById(item.productId).pipe(
          map((product) => ({ item, product, failed: false })),
          catchError((err: unknown) => {
            console.error('Error cargando producto del carrito', err);
            return of({ item, product: null, failed: true });
          })
        )
      )
    ).subscribe((results) => {
      results.forEach((result) => {
        if (result.product) {
          result.item.product = result.product;
          if (result.item.quantity > result.product.stock && result.product.stock > 0) {
            result.item.quantity = result.product.stock;
            this.cartService.updateQuantity(result.item.productId, result.item.quantity);
          }
        } else {
          result.item.product = undefined;
        }

        result.item.availabilityIssue = this.getAvailabilityIssue(result.item);
      });

      this.calculateTotal();
      onComplete?.();
    });
  }

  updateQuantity(item: CartItem): void {
    if (item.quantity < 1) {
      item.quantity = 1;
    }

    if (item.product?.stock && item.quantity > item.product.stock) {
      item.quantity = item.product.stock;
    }

    this.cartService.updateQuantity(item.productId, item.quantity);
    item.availabilityIssue = this.getAvailabilityIssue(item);
    this.calculateTotal();
  }

  remove(productId: string): void {
    this.cartService.removeFromCart(productId);
    this.loadCart();
  }

  calculateTotal(): void {
    this.total = this.items.reduce((sum, item) => {
      if (item.product) {
        return sum + (this.getEffectivePrice(item.product) * item.quantity);
      }
      return sum;
    }, 0);
  }

  getEffectivePrice(product: CartItem['product']): number {
    if (!product) {
      return 0;
    }

    return product.offerPrice && product.offerPrice < product.price
      ? product.offerPrice
      : product.price;
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

  getTotalUnits(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getIssueCount(): number {
    return this.items.filter((item) => Boolean(item.availabilityIssue)).length;
  }

  hasBlockingIssues(): boolean {
    return this.items.some((item) => Boolean(item.availabilityIssue));
  }

  refreshCart(): void {
    this.message = '';
    this.error = '';
    this.syncProductDetails();
  }

  checkout(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Debes iniciar sesión para completar la compra.';
      return;
    }

    if (this.items.length === 0) {
      this.error = 'Tu carrito está vacío.';
      return;
    }

    const invalidItems = this.items.some((item) => !item.product);
    if (invalidItems) {
      this.error = 'Aún se están cargando algunos productos del carrito.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.error = '';

    this.syncProductDetails(() => {
      if (this.hasBlockingIssues()) {
        this.loading = false;
        this.error = 'Revisa el carrito: hay productos sin stock, inactivos o no disponibles.';
        return;
      }

      this.orderService.createOrder({
        shippingAddress: currentUser.address || 'Pendiente por confirmar',
        items: this.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: this.getEffectivePrice(item.product)
        }))
      }).subscribe({
        next: (order) => {
          this.loading = false;
          this.cartService.clearCart();
          this.router.navigate(['/orders', order.id, 'confirmation']);
        },
        error: (err: { error?: { message?: string } }) => {
          this.loading = false;
          this.error = err.error?.message || 'No se pudo completar la compra.';
        }
      });
    });
  }

  private getAvailabilityIssue(item: CartItem): string {
    if (!item.product) {
      return 'Este producto ya no está disponible.';
    }

    if (item.product.isActive === false) {
      return 'Esta publicación está inactiva.';
    }

    if ((item.product.itemType || 'producto') === 'servicio') {
      return 'Los servicios no se compran por carrito. Elimínalo y coordínalo desde el negocio del proveedor.';
    }

    if (item.product.stock <= 0) {
      return 'Este producto no tiene stock disponible.';
    }

    if (item.quantity > item.product.stock) {
      return `Solo hay ${item.product.stock} unidad(es) disponibles.`;
    }

    return '';
  }
}
