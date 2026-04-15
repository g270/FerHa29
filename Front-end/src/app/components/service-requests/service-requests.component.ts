import { Component, OnInit } from '@angular/core';
import { AuthService, ServiceRequestService } from '../../services/index';
import { ServiceRequest, ServiceRequestStatus, User } from '../../models/models';

@Component({
  selector: 'app-service-requests',
  styleUrls: ['./service-requests.component.css'],
  template: `
    <section class="requests-page">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ isSeller ? 'Panel de servicios' : 'Seguimiento de servicios' }}</p>
          <h1>{{ isSeller ? 'Solicitudes recibidas' : 'Mis solicitudes de servicio' }}</h1>
          <p class="subtitle">{{ isSeller ? 'Gestiona el contacto inicial, la cotización y el cierre de cada solicitud.' : 'Consulta el estado de tus solicitudes y revisa el servicio solicitado.' }}</p>
        </div>
      </div>

      <div class="state" *ngIf="loading">Cargando solicitudes...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>

      <div class="request-list" *ngIf="!loading && filteredRequests.length > 0">
        <article class="request-card card" *ngFor="let request of filteredRequests">
          <div class="request-head">
            <div>
              <p class="request-id">#{{ request.id.slice(0, 8) }}</p>
              <h2>{{ request.product?.name || 'Servicio' }}</h2>
              <p class="request-meta">
                {{ isSeller ? ('Cliente: ' + getClientLabel(request)) : ('Proveedor: ' + (request.seller?.businessName || 'Mercaclick')) }}
              </p>
            </div>
            <div class="status-block">
              <ng-container *ngIf="isSeller; else readonlyStatus">
                <select [ngModel]="request.status" (ngModelChange)="updateStatus(request, $event)" [disabled]="updatingId === request.id">
                  <option *ngFor="let status of statusOptions" [value]="status">{{ getStatusLabel(status) }}</option>
                </select>
              </ng-container>
              <ng-template #readonlyStatus>
                <span class="status-pill" [class]="'status-' + request.status">{{ getStatusLabel(request.status) }}</span>
              </ng-template>
            </div>
          </div>

          <div class="request-body">
            <p><strong>Solicitud:</strong> {{ request.message }}</p>
            <p *ngIf="request.preferredSchedule"><strong>Horario preferente:</strong> {{ request.preferredSchedule }}</p>
            <p><strong>Creada:</strong> {{ request.createdAt | date:'medium' }}</p>
          </div>
        </article>
      </div>

      <div class="empty-panel card" *ngIf="!loading && filteredRequests.length === 0">
        <p>{{ isSeller ? 'Aún no has recibido solicitudes de servicio.' : 'Aún no has enviado solicitudes de servicio.' }}</p>
      </div>

      <p class="feedback success" *ngIf="message">{{ message }}</p>
      <p class="feedback error" *ngIf="errorMessage">{{ errorMessage }}</p>
    </section>
  `
})
export class ServiceRequestsComponent implements OnInit {
  requests: ServiceRequest[] = [];
  filteredRequests: ServiceRequest[] = [];
  loading = true;
  error = '';
  message = '';
  errorMessage = '';
  updatingId: string | null = null;
  currentUser: User | null = null;

  readonly statusOptions: ServiceRequestStatus[] = ['pending', 'contacted', 'quoted', 'closed', 'cancelled'];

  constructor(
    private authService: AuthService,
    private serviceRequestService: ServiceRequestService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadRequests();
  }

  get isSeller(): boolean {
    return this.currentUser?.userType === 'seller' || this.currentUser?.userType === 'admin';
  }

  loadRequests(): void {
    this.loading = true;
    this.serviceRequestService.getServiceRequests().subscribe({
      next: (requests) => {
        this.requests = requests;
        this.filteredRequests = requests;
        this.loading = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message || 'No se pudieron cargar las solicitudes de servicio.';
        this.loading = false;
      }
    });
  }

  updateStatus(request: ServiceRequest, status: ServiceRequestStatus): void {
    if (!this.isSeller || request.status === status) {
      return;
    }

    const previousStatus = request.status;
    request.status = status;
    this.updatingId = request.id;
    this.message = '';
    this.errorMessage = '';

    this.serviceRequestService.updateServiceRequestStatus(request.id, status).subscribe({
      next: (updated) => {
        request.status = updated.status;
        this.updatingId = null;
        this.message = `Solicitud #${request.id.slice(0, 8)} actualizada a ${this.getStatusLabel(updated.status)}.`;
      },
      error: (err: { error?: { message?: string } }) => {
        request.status = previousStatus;
        this.updatingId = null;
        this.errorMessage = err.error?.message || 'No se pudo actualizar la solicitud.';
      }
    });
  }

  getStatusLabel(status: ServiceRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'contacted':
        return 'Contactado';
      case 'quoted':
        return 'Cotizado';
      case 'closed':
        return 'Cerrado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  getClientLabel(request: ServiceRequest): string {
    const client = request.client;
    if (!client) {
      return request.clientUserId.slice(0, 8);
    }

    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
    return fullName || client.email;
  }
}