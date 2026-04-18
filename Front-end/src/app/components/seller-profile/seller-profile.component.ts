import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product, Seller, SellerReview, SellerReviewSummary, User } from '../../models/models';
import { AuthService, SellerService } from '../../services/index';

@Component({
  selector: 'app-seller-profile',
  standalone: false,
  styleUrls: ['./seller-profile.component.css'],
  template: `
    <section class="seller-public-page">
      <div class="state" *ngIf="loading">Cargando negocio...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>

      <ng-container *ngIf="!loading && seller">
        <section class="card seller-hero">
          <div class="seller-brand">
            <img [src]="seller.logoUrl || 'https://placehold.co/220x220?text=Mercaclick'" [alt]="seller.businessName" />
            <div>
              <p class="eyebrow">Negocio verificado en Mercaclick</p>
              <h1>{{ seller.businessName }}</h1>
              <p class="seller-description">{{ seller.description || 'Este proveedor aún no ha agregado una descripción comercial.' }}</p>
              <div class="seller-badges">
                <span class="badge">⭐ {{ seller.rating || '5.0' }}</span>
                <span class="meta-chip" [class.success-chip]="seller.hasHomeDelivery">{{ seller.hasHomeDelivery ? 'Entrega a domicilio disponible' : 'Sin entrega a domicilio' }}</span>
                <span class="meta-chip" [class.success-chip]="seller.hasPhysicalStore">{{ seller.hasPhysicalStore ? 'Cuenta con local físico' : 'Atención sin local físico declarado' }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="seller-layout">
          <aside class="card business-panel">
            <h2>Datos del negocio</h2>
            <div class="business-item">
              <span>Dirección comercial</span>
              <strong>{{ seller.businessAddress || 'No registrada' }}</strong>
            </div>
            <div class="business-item">
              <span>Horario de servicio</span>
              <strong>{{ seller.businessHours || 'No definido' }}</strong>
            </div>
            <div class="business-item">
              <span>Detalle del negocio</span>
              <strong>{{ seller.businessNotes || 'Sin observaciones adicionales.' }}</strong>
            </div>
          </aside>

          <div class="card publications-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Catálogo del proveedor</p>
                <h2>Productos y servicios</h2>
              </div>
            </div>

            <div class="publication-group" *ngIf="productItems.length > 0">
              <h3>Productos</h3>
              <div class="publication-list">
                <article class="publication-card" *ngFor="let product of productItems">
                  <img [src]="product.imageUrl || 'https://placehold.co/600x400?text=Mercaclick'" [alt]="product.name" />
                  <div>
                    <h4>{{ product.name }}</h4>
                    <p>{{ product.description }}</p>
                    <div class="publication-meta">
                      <span class="badge">$ {{ getDisplayPrice(product) | number:'1.2-2' }}</span>
                      <span class="meta-chip">{{ product.stock === 0 ? 'Sin stock' : 'Stock: ' + product.stock }}</span>
                      <a class="inline-link" [routerLink]="['/product', product.id]">Ver detalle</a>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <div class="publication-group" *ngIf="serviceItems.length > 0">
              <h3>Servicios</h3>
              <div class="publication-list">
                <article class="publication-card service-card" *ngFor="let product of serviceItems">
                  <img [src]="product.imageUrl || 'https://placehold.co/600x400?text=Mercaclick'" [alt]="product.name" />
                  <div>
                    <h4>{{ product.name }}</h4>
                    <p>{{ product.description }}</p>
                    <div class="publication-meta">
                      <span class="badge">$ {{ getDisplayPrice(product) | number:'1.2-2' }}</span>
                      <span class="meta-chip">Disponibilidad coordinada</span>
                      <a class="inline-link" [routerLink]="['/product', product.id]">Ver detalle</a>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <p class="state" *ngIf="productItems.length === 0 && serviceItems.length === 0">Este proveedor aún no tiene publicaciones activas visibles.</p>
          </div>
        </section>

        <section class="card reviews-panel">
          <div class="reviews-header">
            <div>
              <p class="eyebrow">Confianza y reputación</p>
              <h2>Reseñas del negocio</h2>
            </div>
            <div class="reviews-summary">
              <article>
                <span>Promedio</span>
                <strong>⭐ {{ reviewSummary.averageRating || seller.rating || 0 }}</strong>
              </article>
              <article>
                <span>Total</span>
                <strong>{{ reviewSummary.totalReviews }}</strong>
              </article>
              <article>
                <span>Verificadas</span>
                <strong>{{ reviewSummary.verifiedReviews }}</strong>
              </article>
            </div>
          </div>

          <form class="review-form" *ngIf="canReview" (ngSubmit)="submitReview()">
            <div class="review-form-header">
              <h3>Cuéntale a otros cómo te fue</h3>
              <label>
                <span>Calificación</span>
                <select [(ngModel)]="reviewForm.rating" name="reviewRating">
                  <option *ngFor="let option of ratingOptions" [value]="option">{{ option }} estrella{{ option > 1 ? 's' : '' }}</option>
                </select>
              </label>
            </div>
            <textarea [(ngModel)]="reviewForm.comment" name="reviewComment" rows="4" placeholder="Describe la atención, puntualidad o calidad del servicio." required></textarea>
            <div class="review-form-actions">
              <button type="submit" class="btn-primary" [disabled]="reviewSaving || !isReviewFormValid()">{{ reviewSaving ? 'Guardando...' : 'Guardar reseña' }}</button>
              <span class="state success inline-state" *ngIf="reviewSuccess">{{ reviewSuccess }}</span>
              <span class="state error inline-state" *ngIf="reviewSubmitError">{{ reviewSubmitError }}</span>
            </div>
          </form>

          <div class="card empty-review-card" *ngIf="!currentUser">
            <p>Inicia sesión para dejar una reseña sobre este negocio.</p>
          </div>

          <div class="state" *ngIf="reviewsLoading">Cargando reseñas...</div>
          <div class="state error" *ngIf="reviewsError">{{ reviewsError }}</div>

          <div class="review-list" *ngIf="!reviewsLoading && reviews.length > 0">
            <article class="review-card" *ngFor="let review of reviews">
              <div class="review-topline">
                <div>
                  <strong>{{ getReviewerName(review) }}</strong>
                  <span>{{ review.createdAt | date:'mediumDate' }}</span>
                </div>
                <div class="review-badges">
                  <span class="badge">⭐ {{ review.rating }}/5</span>
                  <span class="meta-chip success-chip" *ngIf="review.isVerifiedTransaction">Compra o servicio verificado</span>
                </div>
              </div>
              <p>{{ review.comment }}</p>
            </article>
          </div>

          <div class="card empty-review-card" *ngIf="!reviewsLoading && reviews.length === 0">
            <p>Este negocio aún no tiene reseñas publicadas.</p>
          </div>
        </section>
      </ng-container>
    </section>
  `
})
export class SellerProfileComponent implements OnInit {
  seller: Seller | null = null;
  currentUser: User | null = null;
  loading = true;
  error = '';
  reviews: SellerReview[] = [];
  reviewSummary: SellerReviewSummary = { averageRating: 0, totalReviews: 0, verifiedReviews: 0 };
  reviewsLoading = false;
  reviewsError = '';
  reviewSaving = false;
  reviewSuccess = '';
  reviewSubmitError = '';
  ratingOptions = [5, 4, 3, 2, 1];
  reviewForm = {
    rating: 5,
    comment: ''
  };

  constructor(
    private route: ActivatedRoute,
    private sellerService: SellerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    const sellerId = this.route.snapshot.paramMap.get('id');
    if (!sellerId) {
      this.error = 'Proveedor no encontrado.';
      this.loading = false;
      return;
    }

    this.sellerService.getSellerById(sellerId).subscribe({
      next: (seller) => {
        this.seller = seller;
        this.loading = false;
        this.loadReviews(seller.id);
      },
      error: () => {
        this.error = 'No se pudo cargar el negocio del proveedor.';
        this.loading = false;
      }
    });
  }

  get productItems(): Product[] {
    return (this.seller?.products || []).filter((product) => (product.itemType || 'producto') === 'producto' && product.isActive !== false);
  }

  get serviceItems(): Product[] {
    return (this.seller?.products || []).filter((product) => (product.itemType || 'producto') === 'servicio' && product.isActive !== false);
  }

  getDisplayPrice(product: Product): number {
    return product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  }

  get canReview(): boolean {
    return Boolean(this.currentUser?.id && this.seller?.userId && this.currentUser.id !== this.seller.userId);
  }

  getReviewerName(review: SellerReview): string {
    const firstName = review.reviewer?.firstName || '';
    const lastName = review.reviewer?.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Cliente Mercaclick';
  }

  isReviewFormValid(): boolean {
    return this.reviewForm.rating >= 1 && this.reviewForm.rating <= 5 && this.reviewForm.comment.trim().length >= 10;
  }

  submitReview(): void {
    if (!this.seller || !this.canReview || !this.isReviewFormValid()) {
      return;
    }

    this.reviewSaving = true;
    this.reviewSuccess = '';
    this.reviewSubmitError = '';

    this.sellerService.saveSellerReview(this.seller.id, {
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment.trim()
    }).subscribe({
      next: (response) => {
        this.reviewSaving = false;
        this.reviewSuccess = response.message;
        this.reviewSummary = response.summary;
        this.seller = {
          ...this.seller!,
          rating: response.summary.averageRating
        };
        this.loadReviews(this.seller.id);
      },
      error: (err: { error?: { message?: string } }) => {
        this.reviewSaving = false;
        this.reviewSubmitError = err.error?.message || 'No se pudo guardar la reseña.';
      }
    });
  }

  private loadReviews(sellerId: string): void {
    this.reviewsLoading = true;
    this.reviewsError = '';

    this.sellerService.getSellerReviews(sellerId).subscribe({
      next: (response) => {
        this.reviews = response.items;
        this.reviewSummary = response.summary;
        this.reviewsLoading = false;
      },
      error: () => {
        this.reviewsError = 'No se pudieron cargar las reseñas del negocio.';
        this.reviewsLoading = false;
      }
    });
  }
}