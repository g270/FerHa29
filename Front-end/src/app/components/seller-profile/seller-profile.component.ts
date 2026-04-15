import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product, Seller } from '../../models/models';
import { SellerService } from '../../services/index';

@Component({
  selector: 'app-seller-profile',
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
      </ng-container>
    </section>
  `
})
export class SellerProfileComponent implements OnInit {
  seller: Seller | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private sellerService: SellerService
  ) {}

  ngOnInit(): void {
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
}