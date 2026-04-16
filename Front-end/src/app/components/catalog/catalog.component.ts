import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, ProductService } from '../../services/index';
import { Product } from '../../models/models';

@Component({
  selector: 'app-catalog',
  standalone: false,
  styleUrls: ['./catalog.component.css'],
  template: `
    <section class="landing-hero">
      <h1 class="landing-title">¿Qué buscas hoy?</h1>
      <div class="landing-search">
        <input
          type="text"
          placeholder="Buscar productos, servicios..."
          [(ngModel)]="searchTerm"
          (input)="search()"
        />
      </div>
      <div class="categories-grid">
        <button type="button" class="category-card" *ngFor="let cat of categories" (click)="selectCategory(cat.name)">
          <div class="category-icon">{{ cat.icon }}</div>
          <span>{{ cat.name }}</span>
        </button>
      </div>
    </section>

    <section class="catalog-layout">
      <aside class="filters-panel card">
        <div class="filters-header">
          <div>
            <p class="eyebrow">Búsqueda avanzada</p>
            <h2>Filtrar resultados</h2>
          </div>
          <button type="button" class="btn-ghost clear-btn" (click)="resetFilters()">Limpiar</button>
        </div>

        <div class="filter-block">
          <label for="minPrice">Precio mínimo</label>
          <input id="minPrice" type="number" min="0" [(ngModel)]="minPrice" (ngModelChange)="applyFilters()" />
        </div>

        <div class="filter-block">
          <label for="maxPrice">Precio máximo</label>
          <input id="maxPrice" type="number" min="0" [(ngModel)]="maxPrice" (ngModelChange)="applyFilters()" />
        </div>

        <div class="filter-block">
          <label for="category">Categoría</label>
          <select id="category" [(ngModel)]="selectedCategory" (ngModelChange)="applyFilters()">
            <option value="">Todas</option>
            <option *ngFor="let cat of categories" [value]="cat.name">{{ cat.name }}</option>
          </select>
        </div>

        <div class="filter-block">
          <label for="rating">Calificación mínima</label>
          <select id="rating" [(ngModel)]="minRating" (ngModelChange)="applyFilters()">
            <option value="0">Todas</option>
            <option value="3">3 estrellas o más</option>
            <option value="4">4 estrellas o más</option>
            <option value="5">5 estrellas</option>
          </select>
        </div>

        <div class="filter-block checkbox-row">
          <label>
            <input type="checkbox" [(ngModel)]="onlyInStock" (change)="applyFilters()" />
            Solo disponibles
          </label>
        </div>

        <div class="filter-block disabled-block">
          <label for="location">Ubicación geográfica</label>
          <select id="location" disabled>
            <option>Disponible cuando el backend exponga ubicación</option>
          </select>
        </div>

        <div class="filter-block disabled-block">
          <label for="delivery">Tipo de entrega</label>
          <select id="delivery" disabled>
            <option>Disponible cuando el backend exponga entrega</option>
          </select>
        </div>
      </aside>

      <div class="catalog-page">
        <div class="results-toolbar">
          <div>
            <p class="results-count">{{ filteredProducts.length }} resultados</p>
            <h2>Recomendados para ti</h2>
          </div>
          <div class="sort-box">
            <label for="sortBy">Ordenar por</label>
            <select id="sortBy" [(ngModel)]="sortBy" (ngModelChange)="applyFilters()">
              <option value="relevant">Más relevante</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
              <option value="rating-desc">Mejor calificación</option>
            </select>
          </div>
        </div>

      <div class="loading-message" *ngIf="loading">Cargando productos...</div>
      <div class="error-message" *ngIf="error">{{ error }}</div>
      <div class="empty-message" *ngIf="!loading && !error && filteredProducts.length === 0">
        No se encontraron productos.
      </div>
      <div class="product-grid" *ngIf="!loading && filteredProducts.length > 0">
        <div *ngFor="let product of filteredProducts" class="product-card card">
          <img [src]="product.imageUrl || '/assets/placeholder.jpg'" [alt]="product.name" />
          <div class="product-details">
            <h2>{{ product.name }}</h2>
            <p>{{ product.description }}</p>
            <div class="meta-row">
              <span class="price">$ {{ getDisplayPrice(product) | number:'1.2-2' }}</span>
              <span class="rating-badge">⭐ {{ product.rating }}</span>
            </div>
            <div class="card-flags">
              <span class="meta-chip type-chip">{{ product.itemType === 'servicio' ? 'Servicio' : 'Producto' }}</span>
              <span class="meta-chip offer-chip" *ngIf="product.offerPrice && product.offerPrice < product.price">Oferta</span>
              <span class="meta-chip">{{ getCategoryLabel(product) }}</span>
              <span class="meta-chip alert-chip" *ngIf="product.stock === 0">Sin stock</span>
            </div>
            <p class="seller-inline" *ngIf="product.seller?.businessName">Por {{ product.seller?.businessName }}</p>
            <div class="actions">
              <button class="btn-primary" type="button" (click)="viewProduct(product.id)">Ver detalle</button>
              <button class="btn-ghost" type="button" *ngIf="product.seller?.id" (click)="viewSeller(product.seller?.id)">Ver negocio</button>
              <button class="btn-secondary" type="button" (click)="handlePrimaryAction(product)" [disabled]="isPrimaryActionDisabled(product)">
                {{ getPrimaryActionLabel(product) }}
              </button>
            </div>
            <p class="catalog-feedback success" *ngIf="feedbackProductId === product.id">{{ feedbackMessage }}</p>
          </div>
        </div>
      </div>
      </div>
    </section>
  `
})
export class CatalogComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  loading = false;
  error = '';
  feedbackMessage = '';
  feedbackProductId: string | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedCategory = '';
  minRating = 0;
  onlyInStock = false;
  sortBy: 'relevant' | 'price-asc' | 'price-desc' | 'rating-desc' = 'relevant';

  categories = [
    { name: 'Artesanías', icon: '🎨' },
    { name: 'Servicios Médicos', icon: '🩺' },
    { name: 'Herramientas', icon: '🔧' },
    { name: 'Tecnología', icon: '💻' },
  ];

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.error = '';

    const cachedProducts = this.productService.getCachedProducts();
    if (cachedProducts) {
      this.products = cachedProducts;
      this.applyFilters();
      this.loading = false;

      this.productService.getProducts(true).subscribe({
        next: (data) => {
          this.products = data;
          this.applyFilters();
        },
        error: (err: unknown) => {
          console.error('Error al actualizar productos', err);
          this.error = 'Error al actualizar productos. Intenta de nuevo.';
        }
      });
      return;
    }

    this.loading = true;

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error('Error al cargar productos', err);
        this.error = 'Error al cargar productos. Intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  search(): void {
    this.applyFilters();
  }

  selectCategory(categoryName: string): void {
    this.selectedCategory = categoryName;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedCategory = '';
    this.minRating = 0;
    this.onlyInStock = false;
    this.sortBy = 'relevant';
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const normalizedCategory = this.selectedCategory.trim().toLowerCase();

    let results = this.products.filter((product) => {
      const matchesSearch = !term ||
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term);
      const matchesMinPrice = this.minPrice == null || product.price >= this.minPrice;
      const matchesMaxPrice = this.maxPrice == null || product.price <= this.maxPrice;
      const matchesRating = product.rating >= Number(this.minRating || 0);
      const matchesStock = !this.onlyInStock || product.stock > 0;
      const matchesCategory = !normalizedCategory ||
        this.getCategoryLabel(product).toLowerCase() === normalizedCategory;

      return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesRating && matchesStock && matchesCategory;
    });

    results = this.sortProducts(results);
    this.filteredProducts = results;
  }

  getCategoryLabel(product: Product): string {
    if (product.category?.name) {
      return product.category.name;
    }

    const categoryMap: Record<string, string> = {
      artesanias: 'Artesanías',
      artesanías: 'Artesanías',
      medical: 'Servicios Médicos',
      medico: 'Servicios Médicos',
      'servicios medicos': 'Servicios Médicos',
      'servicios médicos': 'Servicios Médicos',
      herramientas: 'Herramientas',
      tecnologia: 'Tecnología',
      tecnología: 'Tecnología'
    };

    return categoryMap[(product.categoryId || '').toLowerCase()] || 'General';
  }

  getDisplayPrice(product: Product): number {
    return product.offerPrice && product.offerPrice < product.price ? product.offerPrice : product.price;
  }

  private sortProducts(products: Product[]): Product[] {
    const sorted = [...products];

    switch (this.sortBy) {
      case 'price-asc':
        return sorted.sort((first, second) => first.price - second.price);
      case 'price-desc':
        return sorted.sort((first, second) => second.price - first.price);
      case 'rating-desc':
        return sorted.sort((first, second) => second.rating - first.rating);
      default:
        return sorted.sort((first, second) => {
          const firstScore = first.rating + (first.stock > 0 ? 1 : 0);
          const secondScore = second.rating + (second.stock > 0 ? 1 : 0);
          return secondScore - firstScore;
        });
    }
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/product', productId]);
  }

  viewSeller(sellerId?: string): void {
    if (!sellerId) {
      return;
    }

    this.router.navigate(['/seller', sellerId]);
  }

  getPrimaryActionLabel(product: Product): string {
    if ((product.itemType || 'producto') === 'servicio') {
      return 'Solicitar servicio';
    }

    return 'Agregar al carrito';
  }

  isPrimaryActionDisabled(product: Product): boolean {
    if ((product.itemType || 'producto') === 'servicio') {
      return !product.seller?.id || product.isActive === false;
    }

    return product.stock === 0 || product.isActive === false;
  }

  handlePrimaryAction(product: Product): void {
    if ((product.itemType || 'producto') === 'servicio') {
      this.feedbackProductId = product.id;
      this.feedbackMessage = `Completa una solicitud para coordinar ${product.name} con el proveedor.`;
      this.router.navigate(['/services/request', product.id]);
      return;
    }

    this.addToCart(product);
  }

  addToCart(product: Product): void {
    if (product.stock === 0 || product.isActive === false) {
      this.feedbackProductId = product.id;
      this.feedbackMessage = `${product.name} no está disponible para compra en este momento.`;
      return;
    }

    this.cartService.addToCart(product.id, 1);
    this.feedbackProductId = product.id;
    this.feedbackMessage = `${product.name} fue añadido al carrito.`;
  }
}
