import { Component, OnInit } from '@angular/core';
import { AuthService, ServiceRequestService } from '../../services/index';
import { ServiceFulfillmentStatus, ServiceRequest, ServiceRequestStatus, User } from '../../models/models';

@Component({
  selector: 'app-service-requests',
  standalone: false,
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

      <section class="calendar-panel card" *ngIf="!loading && isSeller">
        <div class="calendar-header">
          <div>
            <p class="eyebrow">Agenda operativa</p>
            <h2>Calendario semanal</h2>
            <p class="calendar-copy">Visualiza las citas programadas, ubica huecos disponibles y entra directo a la solicitud para ajustarla.</p>
          </div>

          <div class="calendar-actions">
            <button type="button" class="calendar-btn" (click)="goToPreviousWeek()">Semana anterior</button>
            <button type="button" class="calendar-btn" (click)="goToCurrentWeek()">Hoy</button>
            <button type="button" class="calendar-btn" (click)="goToNextWeek()">Semana siguiente</button>
          </div>
        </div>

        <p class="calendar-range">{{ getWeekRangeLabel() }}</p>

        <div class="calendar-grid">
          <article class="calendar-day" *ngFor="let day of getCalendarDays()" [class.calendar-day-today]="day.isToday">
            <div class="calendar-day-head">
              <span class="calendar-day-name">{{ day.label }}</span>
              <strong>{{ day.dayNumber }}</strong>
            </div>

            <div class="calendar-day-body" *ngIf="day.entries.length > 0; else emptyDay">
              <button
                type="button"
                class="calendar-entry"
                *ngFor="let entry of day.entries"
                [class.calendar-entry-active]="selectedRequestId === entry.request.id"
                [class.calendar-entry-progress]="entry.request.fulfillmentStatus === 'in_progress'"
                [class.calendar-entry-completed]="entry.request.fulfillmentStatus === 'completed'"
                (click)="focusRequest(entry.request.id)"
              >
                <span class="calendar-entry-time">{{ entry.startLabel }} - {{ entry.endLabel }}</span>
                <strong>{{ entry.request.product?.name || 'Servicio' }}</strong>
                <span>{{ getClientLabel(entry.request) }}</span>
                <span>{{ getFulfillmentStatusLabel(entry.request.fulfillmentStatus || 'pending_schedule') }}</span>
              </button>
            </div>

            <ng-template #emptyDay>
              <p class="calendar-empty">Sin citas registradas</p>
            </ng-template>
          </article>
        </div>
      </section>

      <div class="request-list" *ngIf="!loading && filteredRequests.length > 0">
        <article class="request-card card" *ngFor="let request of filteredRequests" [class.request-card-selected]="selectedRequestId === request.id">
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

            <div class="schedule-box" *ngIf="hasScheduleInfo(request)">
              <p *ngIf="request.fulfillmentStatus"><strong>Seguimiento:</strong> {{ getFulfillmentStatusLabel(request.fulfillmentStatus) }}</p>
              <p *ngIf="request.appointmentAt"><strong>Cita:</strong> {{ request.appointmentAt | date:'medium' }}</p>
              <p *ngIf="request.appointmentDurationMinutes"><strong>Duración:</strong> {{ request.appointmentDurationMinutes }} min</p>
              <p *ngIf="request.serviceMode"><strong>Modalidad:</strong> {{ getServiceModeLabel(request.serviceMode) }}</p>
              <p *ngIf="request.serviceLocation"><strong>Lugar:</strong> {{ request.serviceLocation }}</p>
              <p *ngIf="request.completionNotes"><strong>Observaciones finales:</strong> {{ request.completionNotes }}</p>
              <p *ngIf="request.completionEvidence"><strong>Evidencia o referencia:</strong> {{ request.completionEvidence }}</p>
            </div>

            <p class="schedule-conflict" *ngIf="isSeller && getScheduleConflictMessage(request) as conflictMessage">
              {{ conflictMessage }}
            </p>

            <p class="schedule-hint" *ngIf="request.status === 'accepted' && request.fulfillmentStatus === 'pending_schedule'">
              {{ isSeller ? 'Esta solicitud ya fue aceptada. Define fecha, modalidad y lugar para programar la cita.' : 'Tu cotización fue aceptada. El proveedor debe programar la cita.' }}
            </p>

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

              <div class="schedule-fields" *ngIf="request.status === 'accepted' || request.status === 'closed'">
                <label>
                  <span>Fecha y hora acordada</span>
                  <input
                    type="datetime-local"
                    [ngModel]="responseDrafts[request.id].appointmentAt"
                    (ngModelChange)="responseDrafts[request.id].appointmentAt = $event || ''"
                    [ngModelOptions]="{ standalone: true }"
                  />
                </label>

                <label>
                  <span>Duración estimada</span>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    [ngModel]="responseDrafts[request.id].appointmentDurationMinutes"
                    (ngModelChange)="responseDrafts[request.id].appointmentDurationMinutes = toNullableNumber($event)"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="60"
                  />
                </label>

                <label>
                  <span>Modalidad del servicio</span>
                  <select
                    [ngModel]="responseDrafts[request.id].serviceMode"
                    (ngModelChange)="responseDrafts[request.id].serviceMode = $event || ''"
                    [ngModelOptions]="{ standalone: true }"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="domicilio">A domicilio</option>
                    <option value="negocio">En negocio/local</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </label>

                <label>
                  <span>Dirección o punto de encuentro</span>
                  <input
                    type="text"
                    [ngModel]="responseDrafts[request.id].serviceLocation"
                    (ngModelChange)="responseDrafts[request.id].serviceLocation = $event"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="Ej. Calle 10 # 20-30, consultorio 4 o enlace de videollamada"
                  />
                </label>

                <label>
                  <span>Seguimiento operativo</span>
                  <select
                    [ngModel]="responseDrafts[request.id].fulfillmentStatus"
                    (ngModelChange)="responseDrafts[request.id].fulfillmentStatus = $event"
                    [ngModelOptions]="{ standalone: true }"
                  >
                    <option *ngFor="let fulfillment of fulfillmentOptions" [value]="fulfillment">{{ getFulfillmentStatusLabel(fulfillment) }}</option>
                  </select>
                </label>

                <label>
                  <span>Observaciones finales del servicio</span>
                  <textarea
                    rows="4"
                    [ngModel]="responseDrafts[request.id].completionNotes"
                    (ngModelChange)="responseDrafts[request.id].completionNotes = $event"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="Ej. Se realizó diagnóstico, ajuste y entrega de recomendaciones al cliente"
                  ></textarea>
                </label>

                <label>
                  <span>Evidencia o referencia</span>
                  <input
                    type="text"
                    [ngModel]="responseDrafts[request.id].completionEvidence"
                    (ngModelChange)="responseDrafts[request.id].completionEvidence = $event"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="Ej. Acta firmada, enlace a carpeta, comprobante interno"
                  />
                </label>
              </div>

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
  selectedRequestId: string | null = null;
  currentWeekStart = this.getStartOfWeek(new Date());
  responseDrafts: Record<string, {
    status: ServiceRequestStatus;
    providerResponse: string;
    quotedPrice: number | null;
    appointmentAt: string;
    appointmentDurationMinutes: number | null;
    serviceMode: string;
    serviceLocation: string;
    fulfillmentStatus: ServiceFulfillmentStatus;
    completionNotes: string;
    completionEvidence: string;
  }> = {};

  readonly statusOptions: ServiceRequestStatus[] = ['pending', 'contacted', 'quoted', 'accepted', 'rejected', 'closed', 'cancelled'];
  readonly fulfillmentOptions: ServiceFulfillmentStatus[] = ['pending_schedule', 'scheduled', 'in_progress', 'completed'];

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
    const cachedRequests = this.serviceRequestService.getCachedServiceRequests();

    if (cachedRequests) {
      this.requests = cachedRequests;
      this.filteredRequests = cachedRequests;
      if (this.selectedRequestId && !cachedRequests.some((request) => request.id === this.selectedRequestId)) {
        this.selectedRequestId = null;
      }
      this.syncResponseDrafts();
      this.loading = false;

      this.serviceRequestService.getServiceRequests(true).subscribe({
        next: (requests) => {
          this.requests = requests;
          this.filteredRequests = requests;
          if (this.selectedRequestId && !requests.some((request) => request.id === this.selectedRequestId)) {
            this.selectedRequestId = null;
          }
          this.syncResponseDrafts();
        },
        error: (err: { error?: { message?: string } }) => {
          this.error = err.error?.message || 'No se pudieron actualizar las solicitudes de servicio.';
        }
      });
      return;
    }

    this.loading = true;
    this.serviceRequestService.getServiceRequests().subscribe({
      next: (requests) => {
        this.requests = requests;
        this.filteredRequests = requests;
        if (this.selectedRequestId && !requests.some((request) => request.id === this.selectedRequestId)) {
          this.selectedRequestId = null;
        }
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

    const conflictMessage = this.getScheduleConflictMessage(request);
    if (conflictMessage) {
      this.errorMessage = conflictMessage;
      this.message = '';
      return;
    }

    const previousStatus = request.status;
    const previousResponse = request.providerResponse;
    const previousQuotedPrice = request.quotedPrice;
    const previousAppointmentAt = request.appointmentAt;
    const previousAppointmentDurationMinutes = request.appointmentDurationMinutes;
    const previousServiceMode = request.serviceMode;
    const previousServiceLocation = request.serviceLocation;
    const previousFulfillmentStatus = request.fulfillmentStatus;
    const previousCompletionNotes = request.completionNotes;
    const previousCompletionEvidence = request.completionEvidence;

    request.status = draft.status;
    request.providerResponse = draft.providerResponse.trim() || undefined;
    request.quotedPrice = draft.quotedPrice ?? undefined;
    request.appointmentAt = draft.appointmentAt || undefined;
    request.appointmentDurationMinutes = draft.appointmentDurationMinutes ?? undefined;
    request.serviceMode = draft.serviceMode || undefined;
    request.serviceLocation = draft.serviceLocation.trim() || undefined;
    request.fulfillmentStatus = draft.fulfillmentStatus || undefined;
    request.completionNotes = draft.completionNotes.trim() || undefined;
    request.completionEvidence = draft.completionEvidence.trim() || undefined;
    this.updatingId = request.id;
    this.message = '';
    this.errorMessage = '';

    this.serviceRequestService.updateServiceRequestStatus(request.id, {
      status: draft.status,
      providerResponse: draft.providerResponse,
      quotedPrice: draft.quotedPrice,
      appointmentAt: draft.appointmentAt || null,
      appointmentDurationMinutes: draft.appointmentDurationMinutes,
      serviceMode: draft.serviceMode || null,
      serviceLocation: draft.serviceLocation.trim() || null,
      fulfillmentStatus: draft.fulfillmentStatus || null,
      completionNotes: draft.completionNotes.trim() || null,
      completionEvidence: draft.completionEvidence.trim() || null
    }).subscribe({
      next: (updated) => {
        request.status = updated.status;
        request.providerResponse = updated.providerResponse;
        request.quotedPrice = updated.quotedPrice;
        request.appointmentAt = updated.appointmentAt;
        request.appointmentDurationMinutes = updated.appointmentDurationMinutes;
        request.serviceMode = updated.serviceMode;
        request.serviceLocation = updated.serviceLocation;
        request.fulfillmentStatus = updated.fulfillmentStatus;
        request.completionNotes = updated.completionNotes;
        request.completionEvidence = updated.completionEvidence;
        this.responseDrafts[request.id] = {
          status: updated.status,
          providerResponse: updated.providerResponse || '',
          quotedPrice: updated.quotedPrice ?? null,
          appointmentAt: this.toDateTimeLocalValue(updated.appointmentAt),
          appointmentDurationMinutes: updated.appointmentDurationMinutes ?? 60,
          serviceMode: updated.serviceMode || '',
          serviceLocation: updated.serviceLocation || '',
          fulfillmentStatus: updated.fulfillmentStatus || 'pending_schedule',
          completionNotes: updated.completionNotes || '',
          completionEvidence: updated.completionEvidence || ''
        };
        this.updatingId = null;
        this.message = `Solicitud #${request.id.slice(0, 8)} actualizada a ${this.getStatusLabel(updated.status)}.`;
      },
      error: (err: { error?: { message?: string } }) => {
        request.status = previousStatus;
        request.providerResponse = previousResponse;
        request.quotedPrice = previousQuotedPrice;
        request.appointmentAt = previousAppointmentAt;
        request.appointmentDurationMinutes = previousAppointmentDurationMinutes;
        request.serviceMode = previousServiceMode;
        request.serviceLocation = previousServiceLocation;
        request.fulfillmentStatus = previousFulfillmentStatus;
        request.completionNotes = previousCompletionNotes;
        request.completionEvidence = previousCompletionEvidence;
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

  hasScheduleInfo(request: ServiceRequest): boolean {
    return Boolean(request.appointmentAt || request.appointmentDurationMinutes || request.serviceMode || request.serviceLocation || request.fulfillmentStatus || request.completionNotes || request.completionEvidence);
  }

  getCalendarDays(): Array<{
    date: Date;
    label: string;
    dayNumber: string;
    isToday: boolean;
    entries: Array<{
      request: ServiceRequest;
      startLabel: string;
      endLabel: string;
      startAt: Date;
    }>;
  }> {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + index);

      return {
        date,
        label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNumber: date.toLocaleDateString('es-ES', { day: '2-digit' }),
        isToday: this.isSameDay(date, new Date()),
        entries: this.getCalendarEntriesForDate(date)
      };
    });
  }

  getWeekRangeLabel(): string {
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(this.currentWeekStart.getDate() + 6);

    return `${this.currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  goToPreviousWeek(): void {
    const previousWeek = new Date(this.currentWeekStart);
    previousWeek.setDate(previousWeek.getDate() - 7);
    this.currentWeekStart = this.getStartOfWeek(previousWeek);
  }

  goToNextWeek(): void {
    const nextWeek = new Date(this.currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.currentWeekStart = this.getStartOfWeek(nextWeek);
  }

  goToCurrentWeek(): void {
    this.currentWeekStart = this.getStartOfWeek(new Date());
  }

  focusRequest(requestId: string): void {
    this.selectedRequestId = requestId;
  }

  getScheduleConflictMessage(request: ServiceRequest): string {
    if (!this.isSeller) {
      return '';
    }

    const draft = this.responseDrafts[request.id];
    if (!draft?.appointmentAt || !['scheduled', 'in_progress'].includes(draft.fulfillmentStatus)) {
      return '';
    }

    const appointmentStart = new Date(draft.appointmentAt);
    if (Number.isNaN(appointmentStart.getTime())) {
      return '';
    }

    const durationMinutes = draft.appointmentDurationMinutes ?? request.appointmentDurationMinutes ?? 60;
    if (!Number.isInteger(durationMinutes) || durationMinutes < 15) {
      return '';
    }

    const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60000);
    const overlappingRequest = this.requests.find((candidate) => {
      if (candidate.id === request.id || !candidate.appointmentAt) {
        return false;
      }

      if (!candidate.fulfillmentStatus || !['scheduled', 'in_progress'].includes(candidate.fulfillmentStatus)) {
        return false;
      }

      const candidateStart = new Date(candidate.appointmentAt);
      if (Number.isNaN(candidateStart.getTime())) {
        return false;
      }

      const candidateDurationMinutes = candidate.appointmentDurationMinutes ?? 60;
      const candidateEnd = new Date(candidateStart.getTime() + candidateDurationMinutes * 60000);
      return appointmentStart < candidateEnd && candidateStart < appointmentEnd;
    });

    if (!overlappingRequest) {
      return '';
    }

    return `Cruza con ${overlappingRequest.product?.name || 'otro servicio'} a las ${new Date(overlappingRequest.appointmentAt || '').toLocaleString('es-ES')}.`;
  }

  getServiceModeLabel(mode: string): string {
    switch (mode) {
      case 'domicilio':
        return 'A domicilio';
      case 'negocio':
        return 'En negocio o local';
      case 'virtual':
        return 'Virtual';
      default:
        return mode;
    }
  }

  getFulfillmentStatusLabel(status: ServiceFulfillmentStatus): string {
    switch (status) {
      case 'pending_schedule':
        return 'Pendiente de agenda';
      case 'scheduled':
        return 'Agendado';
      case 'in_progress':
        return 'En progreso';
      case 'completed':
        return 'Completado';
      default:
        return status;
    }
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

  private toDateTimeLocalValue(value?: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const normalizedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return normalizedDate.toISOString().slice(0, 16);
  }

  private getCalendarEntriesForDate(date: Date): Array<{
    request: ServiceRequest;
    startLabel: string;
    endLabel: string;
    startAt: Date;
  }> {
    return this.filteredRequests
      .filter((request) => Boolean(request.appointmentAt))
      .map((request) => {
        const startAt = new Date(request.appointmentAt || '');
        const durationMinutes = request.appointmentDurationMinutes ?? 60;
        const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

        return {
          request,
          startAt,
          startLabel: startAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          endLabel: endAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
      })
      .filter((entry) => !Number.isNaN(entry.startAt.getTime()) && this.isSameDay(entry.startAt, date))
      .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  }

  private getStartOfWeek(value: Date): Date {
    const date = new Date(value);
    const day = date.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + offset);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private isSameDay(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  private syncResponseDrafts(): void {
    this.responseDrafts = this.requests.reduce((drafts, request) => {
      drafts[request.id] = {
        status: request.status,
        providerResponse: request.providerResponse || '',
        quotedPrice: request.quotedPrice ?? null,
        appointmentAt: this.toDateTimeLocalValue(request.appointmentAt),
        appointmentDurationMinutes: request.appointmentDurationMinutes ?? 60,
        serviceMode: request.serviceMode || '',
        serviceLocation: request.serviceLocation || '',
        fulfillmentStatus: request.fulfillmentStatus || 'pending_schedule',
        completionNotes: request.completionNotes || '',
        completionEvidence: request.completionEvidence || ''
      };
      return drafts;
    }, {} as Record<string, {
      status: ServiceRequestStatus;
      providerResponse: string;
      quotedPrice: number | null;
      appointmentAt: string;
      appointmentDurationMinutes: number | null;
      serviceMode: string;
      serviceLocation: string;
      fulfillmentStatus: ServiceFulfillmentStatus;
      completionNotes: string;
      completionEvidence: string;
    }>);
  }
}