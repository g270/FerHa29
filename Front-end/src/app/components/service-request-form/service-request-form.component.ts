import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../models/models';
import { ProductService, ServiceRequestService } from '../../services/index';

@Component({
  selector: 'app-service-request-form',
  styleUrls: ['./service-request-form.component.css'],
  template: `
    <section class="service-request-page">
      <div class="state" *ngIf="loading">Cargando servicio...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>

      <div class="request-shell" *ngIf="!loading && product">
        <article class="card service-summary">
          <img [src]="product.imageUrl || 'https://placehold.co/800x600?text=Mercaclick'" [alt]="product.name" />
          <div>
            <p class="eyebrow">Solicitud de servicio</p>
            <h1>{{ product.name }}</h1>
            <p>{{ product.description }}</p>
            <div class="meta-row">
              <span class="meta-chip">Proveedor: {{ product.seller?.businessName || 'Mercaclick' }}</span>
              <span class="meta-chip">Precio base: $ {{ getDisplayPrice(product) | number:'1.2-2' }}</span>
              <span class="meta-chip">Horario: {{ product.seller?.businessHours || 'Por definir' }}</span>
            </div>
          </div>
        </article>

        <form class="card request-form" (ngSubmit)="submitRequest()">
          <div class="form-header">
            <div>
              <h2>Describe tu necesidad</h2>
              <p>Esta solicitud llegará al proveedor para que te contacte y confirme disponibilidad, alcance o cotización.</p>
            </div>
            <button type="submit" class="btn-primary" [disabled]="saving || !isReady()">
              {{ saving ? 'Enviando...' : 'Enviar solicitud' }}
            </button>
          </div>

          <label>
            <span>¿Qué necesitas?</span>
            <textarea name="message" rows="6" [(ngModel)]="message" placeholder="Ejemplo: requiero instalación, visita en domicilio o atención para dos personas" required></textarea>
          </label>

          <label>
            <span>Horario o fecha preferente</span>
            <input type="text" name="preferredSchedule" [(ngModel)]="preferredSchedule" placeholder="Ejemplo: jueves por la tarde o sábado 10:00 a 12:00" />
          </label>

          <p class="feedback success" *ngIf="successMessage">{{ successMessage }}</p>
          <p class="feedback error" *ngIf="submitError">{{ submitError }}</p>
        </form>
      </div>
    </section>
  `
})
export class ServiceRequestFormComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  saving = false;
  error = '';
  submitError = '';
  successMessage = '';
  message = '';
  preferredSchedule = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private serviceRequestService: ServiceRequestService
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) {
      this.error = 'Servicio no encontrado.';
      this.loading = false;
      return;
    }

    this.productService.getProductById(productId).subscribe({
      next: (product) => {
        if ((product.itemType || 'producto') !== 'servicio') {
          this.error = 'Esta publicación no admite solicitudes de servicio.';
          this.loading = false;
          return;
        }

        this.product = product;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el servicio solicitado.';
        this.loading = false;
      }
    });
  }

  isReady(): boolean {
    return Boolean(this.message.trim() && this.product?.id);
  }

  submitRequest(): void {
    if (!this.product?.id || !this.isReady() || this.saving) {
      return;
    }

    this.saving = true;
    this.submitError = '';
    this.successMessage = '';

    this.serviceRequestService.createServiceRequest({
      productId: this.product.id,
      message: this.message.trim(),
      preferredSchedule: this.preferredSchedule.trim()
    }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'La solicitud fue enviada correctamente al proveedor.';
        this.router.navigate(['/service-requests']);
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving = false;
        this.submitError = err.error?.message || 'No se pudo enviar la solicitud de servicio.';
      }
    });
  }

  getDisplayPrice(product: Product): number {
    return product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  }
}