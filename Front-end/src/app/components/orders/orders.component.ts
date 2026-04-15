import { Component, OnInit } from '@angular/core';
import { AuthService, OrderService } from '../../services/index';
import { Order, User } from '../../models/models';

@Component({
  selector: 'app-orders',
  styleUrls: ['./orders.component.css'],
  template: `
    <section class="orders-page">
      <div class="orders-topbar">
        <div>
          <p class="eyebrow">{{ isSeller ? 'Panel de proveedor' : 'Historial de compras' }}</p>
          <h1>{{ isSeller ? 'Gestión de pedidos' : 'Mis pedidos' }}</h1>
          <p class="subtitle">
            {{ isSeller ? 'Controla el estado de tus pedidos y encuentra folios rápidamente.' : 'Consulta el estado de tus compras y revisa tus folios recientes.' }}
          </p>
        </div>
        <label class="search-box">
          <span>Buscar por folio</span>
          <input type="text" [(ngModel)]="searchTerm" (input)="applyFilters()" placeholder="Ej. 1024 o 4f2c" />
        </label>
      </div>

      <div class="filter-tabs">
        <button
          type="button"
          *ngFor="let tab of statusTabs"
          [class.active]="activeStatus === tab.value"
          (click)="setActiveStatus(tab.value)"
        >
          {{ tab.label }}
          <span>{{ getCountByStatus(tab.value) }}</span>
        </button>
      </div>

      <div class="orders-summary" *ngIf="orders.length > 0">
        <article class="summary-card card">
          <span>Total</span>
          <strong>{{ orders.length }}</strong>
        </article>
        <article class="summary-card card">
          <span>Pendientes</span>
          <strong>{{ getCountByStatus('pending') }}</strong>
        </article>
        <article class="summary-card card accent-card">
          <span>En proceso</span>
          <strong>{{ getOperationalCount() }}</strong>
        </article>
        <article class="summary-card card warning-card" *ngIf="isSeller">
          <span>Por atender</span>
          <strong>{{ getAttentionCount() }}</strong>
        </article>
      </div>

      <div *ngIf="filteredOrders.length === 0" class="empty-state card">
        No hay pedidos que coincidan con el filtro actual.
      </div>

      <div *ngIf="filteredOrders.length > 0" class="orders-table card">
        <div class="table-head">
          <span>ID Pedido</span>
          <span>Cliente</span>
          <span>Fecha</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        <div class="table-row" *ngFor="let order of filteredOrders" [class.priority-row]="isPriorityOrder(order)">
          <span class="order-id">#{{ order.id.slice(0, 8) }}</span>
          <span>{{ formatClient(order.userId) }}</span>
          <span>{{ order.createdAt | date:'mediumDate' }}</span>
          <span class="order-total">$ {{ order.totalAmount | number:'1.2-2' }}</span>
          <span class="status-cell">
            <span class="priority-flag" *ngIf="isPriorityOrder(order)">Prioridad</span>
            <ng-container *ngIf="isSeller; else readonlyStatus">
              <label class="status-editor">
                <span class="sr-only">Actualizar estado</span>
                <select
                  [ngModel]="order.status"
                  (ngModelChange)="changeStatus(order, $event)"
                  [disabled]="updatingOrderId === order.id"
                >
                  <option *ngFor="let status of sellerStatusOptions" [value]="status">{{ getStatusLabel(status) }}</option>
                </select>
              </label>
            </ng-container>
            <ng-template #readonlyStatus>
              <span class="status-badge" [ngClass]="getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </ng-template>
          </span>
          <div class="row-actions">
            <button type="button" class="btn-ghost action-btn" (click)="toggleDetails(order.id)">
              {{ expandedOrderId === order.id ? 'Ocultar detalle' : 'Ver detalle' }}
            </button>
            <button *ngIf="isSeller" type="button" class="btn-secondary action-btn" (click)="printLabel(order)">Imprimir etiqueta</button>
          </div>
        </div>

        <div class="order-detail" *ngFor="let order of filteredOrders" [class.open]="expandedOrderId === order.id">
          <div *ngIf="expandedOrderId === order.id" class="detail-shell">
            <div class="detail-section">
              <h3>Resumen</h3>
              <p><strong>Folio:</strong> #{{ order.id }}</p>
              <p><strong>Fecha:</strong> {{ order.createdAt | date:'medium' }}</p>
              <p><strong>Entrega:</strong> {{ order.shippingAddress || 'Pendiente por confirmar' }}</p>
            </div>
            <div class="detail-section">
              <h3>Productos</h3>
              <div class="detail-items" *ngIf="order.items?.length; else noItemsTemplate">
                <article class="detail-item" *ngFor="let item of order.items">
                  <div>
                    <strong>{{ item.product?.name || ('Producto ' + item.productId.slice(0, 8)) }}</strong>
                    <p>{{ item.quantity }} unidad(es)</p>
                  </div>
                  <span>$ {{ item.subtotal | number:'1.2-2' }}</span>
                </article>
              </div>
              <ng-template #noItemsTemplate>
                <p>Sin productos visibles para esta orden.</p>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <p class="status-feedback success" *ngIf="feedbackMessage">{{ feedbackMessage }}</p>
      <p class="status-feedback error" *ngIf="errorMessage">{{ errorMessage }}</p>
    </section>
  `
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchTerm = '';
  activeStatus: 'all' | Order['status'] = 'all';
  currentUser: User | null = null;
  feedbackMessage = '';
  errorMessage = '';
  updatingOrderId: string | null = null;
  expandedOrderId: string | null = null;

  readonly sellerStatusOptions: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  statusTabs: Array<{ label: string; value: 'all' | Order['status'] }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Enviados', value: 'shipped' },
    { label: 'Completados', value: 'delivered' },
  ];

  constructor(private orderService: OrderService, private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error al cargar órdenes', err);
      }
    });
  }

  get isSeller(): boolean {
    return this.currentUser?.userType === 'seller' || this.currentUser?.userType === 'admin';
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredOrders = this.orders.filter((order) => {
      const matchesStatus = this.activeStatus === 'all' || order.status === this.activeStatus;
      const matchesTerm = !term || order.id.toLowerCase().includes(term) || order.userId.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }

  setActiveStatus(status: 'all' | Order['status']): void {
    this.activeStatus = status;
    this.applyFilters();
  }

  getCountByStatus(status: 'all' | Order['status']): number {
    if (status === 'all') {
      return this.orders.length;
    }

    return this.orders.filter((order) => order.status === status).length;
  }

  getOperationalCount(): number {
    return this.orders.filter((order) => ['confirmed', 'shipped'].includes(order.status)).length;
  }

  getAttentionCount(): number {
    return this.orders.filter((order) => this.isPriorityOrder(order)).length;
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

  getStatusClass(status: Order['status']): string {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'shipped':
        return 'shipped';
      case 'delivered':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  formatClient(userId: string): string {
    return `Cliente ${userId.slice(0, 8)}`;
  }

  toggleDetails(orderId: string): void {
    this.expandedOrderId = this.expandedOrderId === orderId ? null : orderId;
  }

  printLabel(order: Order): void {
    this.feedbackMessage = `Etiqueta preparada para el pedido #${order.id.slice(0, 8)}. Puedes continuar con la impresión desde tu flujo operativo.`;
    this.errorMessage = '';
  }

  isPriorityOrder(order: Order): boolean {
    return order.status === 'pending' || order.status === 'cancelled';
  }

  changeStatus(order: Order, status: Order['status']): void {
    if (!this.isSeller || order.status === status) {
      return;
    }

    const previousStatus = order.status;
    order.status = status;
    this.updatingOrderId = order.id;
    this.feedbackMessage = '';
    this.errorMessage = '';

    this.orderService.updateOrderStatus(order.id, status).subscribe({
      next: (updatedOrder) => {
        order.status = updatedOrder.status;
        this.orders = this.orders.map((current) =>
          current.id === updatedOrder.id ? { ...current, status: updatedOrder.status } : current
        );
        this.applyFilters();
        this.updatingOrderId = null;
        this.feedbackMessage = `Pedido #${order.id.slice(0, 8)} actualizado a ${this.getStatusLabel(updatedOrder.status)}.`;
      },
      error: (err: { error?: { message?: string } }) => {
        order.status = previousStatus;
        this.updatingOrderId = null;
        this.errorMessage = err.error?.message || 'No se pudo actualizar el estado del pedido.';
      }
    });
  }
}
