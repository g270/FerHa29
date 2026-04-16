import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../models/models';
import { OrderService } from '../../services/index';

@Component({
  selector: 'app-order-confirmation',
  standalone: false,
  template: `
    <section class="confirmation-page">
      <div class="hero card" *ngIf="!loading && order; else loadingState">
        <div class="hero-badge">Compra confirmada</div>
        <h1>Tu pedido ya fue registrado</h1>
        <p class="hero-copy">
          Recibimos tu compra correctamente. Ya puedes revisar el detalle del pedido, seguir su estado o volver al catálogo.
        </p>

        <div class="hero-grid">
          <article class="hero-metric">
            <span>Folio</span>
            <strong>#{{ order.id.slice(0, 8) }}</strong>
          </article>
          <article class="hero-metric">
            <span>Total</span>
            <strong>$ {{ order.totalAmount | number:'1.2-2' }}</strong>
          </article>
          <article class="hero-metric">
            <span>Estado</span>
            <strong>{{ getStatusLabel(order.status) }}</strong>
          </article>
        </div>

        <div class="detail-grid">
          <article class="detail-card card">
            <h2>Entrega</h2>
            <p>{{ order.shippingAddress || 'Pendiente por confirmar' }}</p>
            <p class="muted">Fecha: {{ order.createdAt | date:'medium' }}</p>
          </article>

          <article class="detail-card card">
            <h2>Productos</h2>
            <div class="items-list" *ngIf="order.items?.length; else noItems">
              <div class="item-row" *ngFor="let item of order.items">
                <div>
                  <strong>{{ item.product?.name || ('Producto ' + item.productId.slice(0, 8)) }}</strong>
                  <p>{{ item.quantity }} unidad(es)</p>
                </div>
                <span>$ {{ item.subtotal | number:'1.2-2' }}</span>
              </div>
            </div>
            <ng-template #noItems>
              <p>No hay productos visibles para este pedido.</p>
            </ng-template>
          </article>
        </div>

        <div class="action-row">
          <button type="button" class="btn-primary" (click)="goToOrders()">Ver mis pedidos</button>
          <button type="button" class="btn-secondary" (click)="goToCatalog()">Seguir comprando</button>
        </div>
      </div>

      <ng-template #loadingState>
        <div class="card state-card" *ngIf="loading">Cargando confirmación del pedido...</div>
        <div class="card state-card error-state" *ngIf="!loading && error">
          <h2>No se pudo cargar la confirmación</h2>
          <p>{{ error }}</p>
          <div class="action-row">
            <button type="button" class="btn-primary" (click)="goToOrders()">Ir a mis pedidos</button>
            <button type="button" class="btn-secondary" (click)="goToCatalog()">Volver al catálogo</button>
          </div>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .confirmation-page { max-width: 980px; margin: 0 auto; padding: 2rem; }
      .hero { display: grid; gap: 1.5rem; }
      .hero-badge { width: fit-content; background: #dcfce7; color: #166534; border-radius: 999px; padding: 0.4rem 0.85rem; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
      h1 { margin: 0; font-size: 2.5rem; color: #111827; }
      .hero-copy { margin: 0; color: #6b7280; max-width: 640px; }
      .hero-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
      .hero-metric, .detail-card { border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1rem 1.1rem; background: #fff; }
      .hero-metric span { color: #64748b; font-weight: 700; }
      .hero-metric strong { display: block; margin-top: 0.35rem; color: #111827; font-size: 1.4rem; }
      .detail-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 1rem; }
      .detail-card h2 { margin: 0 0 0.75rem; color: #1f2937; }
      .detail-card p { margin: 0.3rem 0; color: #4b5563; }
      .muted { color: #6b7280; }
      .items-list { display: grid; gap: 0.75rem; }
      .item-row { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; border: 1px solid #eef2f7; border-radius: 0.85rem; padding: 0.85rem 0.95rem; }
      .item-row strong { color: #111827; }
      .action-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
      .state-card { text-align: center; padding: 2rem; }
      .error-state h2 { margin-top: 0; }
      @media (max-width: 760px) {
        .confirmation-page { padding: 1rem; }
        h1 { font-size: 2rem; }
        .hero-grid, .detail-grid { grid-template-columns: 1fr; }
      }
    `
  ]
})
export class OrderConfirmationComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.loading = false;
      this.error = 'No se recibió un identificador de pedido válido.';
      return;
    }

    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading = false;
        this.error = err.error?.message || 'No pudimos recuperar el pedido solicitado.';
      }
    });
  }

  getStatusLabel(status: Order['status']): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  goToOrders(): void {
    this.router.navigate(['/orders']);
  }

  goToCatalog(): void {
    this.router.navigate(['/']);
  }
}