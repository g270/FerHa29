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
          <p class="subtitle">{{ isSeller ? 'Gestiona el contacto inicial, la cotización y el cierre de cada solicitud.' : 'Consulta el estado de tus solicitudes, revisa la respuesta del proveedor y decide si aceptas la cotización.' }}</p>
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
                <select
                  [ngModel]="responseDrafts[request.id].status || request.status"
                  (ngModelChange)="responseDrafts[request.id].status = $event"
                  [disabled]="updatingId === request.id"
                >
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

            <div class="quote-box" *ngIf="request.providerResponse || request.quotedPrice != null">
              <p *ngIf="request.providerResponse"><strong>Respuesta del proveedor:</strong> {{ request.providerResponse }}</p>
              <p *ngIf="request.quotedPrice != null"><strong>Monto cotizado:</strong> {{ getQuotedPriceLabel(request) }}</p>
            </div>

            <p><strong>Creada:</strong> {{ request.createdAt | date:'medium' }}</p>

            <div class="client-decision" *ngIf="!isSeller && request.status === 'quoted'">
              <button type="button" class="btn-accept" (click)="updateClientDecision(request, 'accepted')" [disabled]="updatingId === request.id">
                {{ updatingId === request.id ? 'Procesando...' : 'Aceptar cotización' }}
              </button>
              <button type="button" class="btn-reject" (click)="updateClientDecision(request, 'rejected')" [disabled]="updatingId === request.id">
                {{ updatingId === request.id ? 'Procesando...' : 'Rechazar cotización' }}
              </button>
            </div>

            <div class="seller-response-form" *ngIf="isSeller && responseDrafts[request.id]">
              <label>
                <span>Respuesta al cliente</span>
                <textarea
                  rows="4"
                  [ngModel]="responseDrafts[request.id].providerResponse"
                  (ngModelChange)="responseDrafts[request.id].providerResponse = $event"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="Ejemplo: puedo atenderte este sábado, incluye diagnóstico y seguimiento inicial"
                ></textarea>
              </label>

              <label>
                <span>Monto cotizado</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  [ngModel]="responseDrafts[request.id].quotedPrice"
                  (ngModelChange)="responseDrafts[request.id].quotedPrice = toNullableNumber($event)"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="0.00"
                />
              </label>

              <button type="button" class="btn-save" (click)="updateStatus(request)" [disabled]="updatingId === request.id">
                {{ updatingId === request.id ? 'Guardando...' : 'Guardar respuesta' }}
              </button>
            </div>
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
  responseDrafts: Record<string, { status: ServiceRequestStatus; providerResponse: string; quotedPrice: number | null }> = {};

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
        this.syncResponseDrafts();
        this.loading = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message || 'No se pudieron cargar las solicitudes de servicio.';
        this.loading = false;
      }
    });
  }

  updateStatus(request: ServiceRequest): void {
    if (!this.isSeller) {
      return;
    }

    const draft = this.responseDrafts[request.id];
    if (!draft) {
      return;
    }

    const previousStatus = request.status;
    const previousResponse = request.providerResponse;
    const previousQuotedPrice = request.quotedPrice;

    request.status = draft.status;
    request.providerResponse = draft.providerResponse.trim() || undefined;
    request.quotedPrice = draft.quotedPrice ?? undefined;
    this.updatingId = request.id;
    this.message = '';
    this.errorMessage = '';

    this.serviceRequestService.updateServiceRequestStatus(request.id, {
      status: draft.status,
      providerResponse: draft.providerResponse,
      quotedPrice: draft.quotedPrice
    }).subscribe({
      next: (updated) => {
        request.status = updated.status;
        request.providerResponse = updated.providerResponse;
        request.quotedPrice = updated.quotedPrice;
        this.responseDrafts[request.id] = {
          status: updated.status,
          providerResponse: updated.providerResponse || '',
          quotedPrice: updated.quotedPrice ?? null
        };
        this.updatingId = null;
        this.message = `Solicitud #${request.id.slice(0, 8)} actualizada a ${this.getStatusLabel(updated.status)}.`;
      },
      error: (err: { error?: { message?: string } }) => {
        request.status = previousStatus;
        request.providerResponse = previousResponse;
        request.quotedPrice = previousQuotedPrice;
        this.updatingId = null;
        this.errorMessage = err.error?.message || 'No se pudo actualizar la solicitud.';
      }
    });
  }

  updateClientDecision(request: ServiceRequest, status: 'accepted' | 'rejected'): void {
    if (this.isSeller || this.updatingId) {
      return;
    }

    const previousStatus = request.status;
    request.status = status;
    this.updatingId = request.id;
    this.message = '';
    this.errorMessage = '';

    this.serviceRequestService.updateServiceRequestStatus(request.id, { status }).subscribe({
      next: (updated) => {
        request.status = updated.status;
        this.updatingId = null;
        this.message = `Solicitud #${request.id.slice(0, 8)} ${updated.status === 'accepted' ? 'aceptada' : 'rechazada'} correctamente.`;
      },
      error: (err: { error?: { message?: string } }) => {
        request.status = previousStatus;
        this.updatingId = null;
        this.errorMessage = err.error?.message || 'No se pudo actualizar tu decisión sobre la cotización.';
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
      case 'accepted':
        return 'Aceptado';
      case 'rejected':
        return 'Rechazado';
      case 'closed':
        return 'Cerrado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  getQuotedPriceLabel(request: ServiceRequest): string {
    return request.quotedPrice != null ? `$ ${Number(request.quotedPrice).toFixed(2)}` : 'Pendiente';
  }

  toNullableNumber(value: string | number | null): number | null {
    if (value === '' || value === null) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  getClientLabel(request: ServiceRequest): string {
    const client = request.client;
    if (!client) {
      return request.clientUserId.slice(0, 8);
    }

    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
    return fullName || client.email;
  }

  private syncResponseDrafts(): void {
    this.responseDrafts = this.requests.reduce((drafts, request) => {
      drafts[request.id] = {
        status: request.status,
        providerResponse: request.providerResponse || '',
        quotedPrice: request.quotedPrice ?? null
      };
      return drafts;
    }, {} as Record<string, { status: ServiceRequestStatus; providerResponse: string; quotedPrice: number | null }>);
  }
}