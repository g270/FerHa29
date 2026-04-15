import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Category, Product } from '../../models/models';
import { CategoryService, ProductService } from '../../services/index';

type ProductFormStep = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-seller-product-form',
  template: `
    <section class="seller-form-page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Panel de proveedor</p>
          <h1>{{ isEditMode ? 'Editar producto o servicio' : 'Alta de producto o servicio' }}</h1>
          <p class="subtitle">{{ isEditMode ? 'Actualiza la informacion de tu publicacion, inventario y datos de despacho.' : 'Carga una nueva publicacion con informacion clara, inventario y datos de despacho.' }}</p>
        </div>
        <div class="step-pill">Paso {{ currentStep }} de 4</div>
      </div>

      <div class="stepper card">
        <div class="step" *ngFor="let step of steps" [class.active]="currentStep === step.id" [class.completed]="currentStep > step.id">
          <div class="step-index">{{ step.id }}</div>
          <div>
            <strong>{{ step.title }}</strong>
            <span>{{ step.caption }}</span>
          </div>
        </div>
      </div>

      <form class="form-shell" (ngSubmit)="publish()">
        <div class="state" *ngIf="loadingProduct">Cargando publicacion...</div>

        <section class="form-panel card" *ngIf="currentStep === 1">
          <h2>Informacion basica</h2>
          <div class="form-grid">
            <label>
              <span>Tipo de publicación</span>
              <select [(ngModel)]="form.itemType" name="itemType">
                <option value="producto">Producto</option>
                <option value="servicio">Servicio</option>
              </select>
            </label>
            <label>
              <span>Titulo</span>
              <input type="text" [(ngModel)]="form.title" name="title" required />
            </label>
            <label>
              <span>Categoria</span>
              <select [(ngModel)]="form.categoryId" name="categoryId" required [disabled]="loadingCategories || categories.length === 0">
                <option value="">{{ loadingCategories ? 'Cargando categorias...' : 'Selecciona una categoria' }}</option>
                <option *ngFor="let category of categories" [value]="category.id">{{ category.name }}</option>
              </select>
            </label>
            <label class="full-width">
              <span>Descripcion corta</span>
              <textarea [(ngModel)]="form.description" name="description" rows="5" required></textarea>
            </label>
            <label class="toggle-field">
              <span>Producto activo</span>
              <button type="button" class="toggle" [class.on]="form.isActive" (click)="form.isActive = !form.isActive">
                <span></span>
              </button>
            </label>
          </div>
        </section>

        <section class="form-panel card" *ngIf="currentStep === 2">
          <h2>Multimedia</h2>
          <div class="dropzone">
            <p>Arrastra imagenes aqui o pega una URL para la portada.</p>
            <input type="url" [(ngModel)]="form.imageUrl" name="imageUrl" placeholder="https://ejemplo.com/imagen.jpg" />
          </div>
          <div class="preview-card" *ngIf="form.imageUrl">
            <img [src]="form.imageUrl" alt="Vista previa del producto" />
            <div>
              <strong>Vista previa</strong>
              <p>Esta imagen sera la portada principal de tu publicacion.</p>
            </div>
          </div>
        </section>

        <section class="form-panel card" *ngIf="currentStep === 3">
          <h2>Inventario y precios</h2>
          <div class="form-grid">
            <label>
              <span>SKU</span>
              <input type="text" [(ngModel)]="form.sku" name="sku" />
            </label>
            <label>
              <span>Stock</span>
              <input type="number" min="0" [(ngModel)]="form.stock" name="stock" required />
            </label>
            <label>
              <span>Precio regular</span>
              <input type="number" min="0" step="0.01" [(ngModel)]="form.price" name="price" required />
            </label>
            <label>
              <span>Precio oferta</span>
              <input type="number" min="0" step="0.01" [(ngModel)]="form.offerPrice" name="offerPrice" />
            </label>
          </div>
        </section>

        <section class="form-panel card" *ngIf="currentStep === 4">
          <h2>Ubicacion de despacho</h2>
          <div class="form-grid">
            <label class="full-width">
              <span>Direccion o punto de entrega</span>
              <input type="text" [(ngModel)]="form.dispatchLocation" name="dispatchLocation" />
            </label>
            <label>
              <span>Tipo de entrega</span>
              <select [(ngModel)]="form.deliveryType" name="deliveryType">
                <option value="retiro">Retiro</option>
                <option value="envio">Envío</option>
                <option value="mixto">Mixto</option>
              </select>
            </label>
          </div>

          <div class="summary-box">
            <h3>Resumen de publicacion</h3>
            <p><strong>Tipo:</strong> {{ form.itemType === 'servicio' ? 'Servicio' : 'Producto' }}</p>
            <p><strong>Titulo:</strong> {{ form.title || 'Sin titulo' }}</p>
            <p><strong>Categoria:</strong> {{ getSelectedCategoryName() }}</p>
            <p><strong>Precio:</strong> $ {{ form.offerPrice || form.price || 0 }}</p>
            <p><strong>Stock:</strong> {{ form.stock || 0 }}</p>
            <p><strong>Entrega:</strong> {{ getDeliveryLabel(form.deliveryType) }}</p>
            <p><strong>Estado:</strong> {{ form.isActive ? 'Activo' : 'Borrador' }}</p>
          </div>
        </section>

        <div class="actions-bar">
          <button type="button" class="btn-ghost" (click)="previousStep()" [disabled]="currentStep === 1">Anterior</button>
          <button type="button" class="btn-secondary" *ngIf="currentStep < 4" (click)="nextStep()">Siguiente</button>
        </div>

        <button class="floating-publish btn-primary" type="submit" [disabled]="saving || loadingCategories || !isFormReady()">
          {{ saving ? (isEditMode ? 'Guardando...' : 'Publicando...') : (isEditMode ? 'Guardar cambios' : 'Publicar') }}
        </button>

        <p class="success-message" *ngIf="successMessage">{{ successMessage }}</p>
        <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>
      </form>
    </section>
  `,
  styleUrls: ['./seller-product-form.component.css']
})
export class SellerProductFormComponent implements OnInit {
  currentStep: ProductFormStep = 1;
  saving = false;
  loadingCategories = true;
  loadingProduct = false;
  successMessage = '';
  errorMessage = '';
  categories: Category[] = [];
  editingProductId: string | null = null;

  steps = [
    { id: 1, title: 'Base', caption: 'Titulo y categoria' },
    { id: 2, title: 'Multimedia', caption: 'Imagen principal' },
    { id: 3, title: 'Inventario', caption: 'SKU, stock y precio' },
    { id: 4, title: 'Despacho', caption: 'Entrega y resumen' }
  ];

  form = {
    itemType: 'producto',
    title: '',
    categoryId: '',
    description: '',
    imageUrl: '',
    sku: '',
    stock: 1,
    price: 0,
    offerPrice: 0,
    dispatchLocation: '',
    deliveryType: 'retiro',
    isActive: true
  };

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.editingProductId = this.route.snapshot.paramMap.get('id');

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loadingCategories = false;
      },
      error: () => {
        this.loadingCategories = false;
        this.errorMessage = 'No se pudieron cargar las categorias. Intenta de nuevo.';
      }
    });

    if (this.editingProductId) {
      this.loadProduct(this.editingProductId);
    }
  }

  get isEditMode(): boolean {
    return Boolean(this.editingProductId);
  }

  nextStep(): void {
    if (this.currentStep < 4) {
      this.currentStep = (this.currentStep + 1) as ProductFormStep;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as ProductFormStep;
    }
  }

  isFormReady(): boolean {
    return Boolean(
      this.form.title.trim() &&
      this.form.categoryId.trim() &&
      this.form.description.trim() &&
      this.form.price >= 0 &&
      this.form.stock >= 0
    );
  }

  getSelectedCategoryName(): string {
    return this.categories.find((category) => category.id === this.form.categoryId)?.name || 'Sin categoria';
  }

  getDeliveryLabel(deliveryType: string): string {
    if (deliveryType === 'envio') {
      return 'Envío';
    }

    if (deliveryType === 'mixto') {
      return 'Retiro y envío';
    }

    return 'Retiro';
  }

  publish(): void {
    if (!this.isFormReady()) {
      this.errorMessage = 'Completa los campos obligatorios antes de publicar.';
      return;
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload: Partial<Product> = {
      itemType: this.form.itemType,
      name: this.form.title,
      description: this.form.description,
      categoryId: this.form.categoryId,
      imageUrl: this.form.imageUrl || 'https://placehold.co/800x600?text=Mercaclick',
      sku: this.form.sku.trim() || undefined,
      stock: Number(this.form.stock || 0),
      price: Number(this.form.price),
      offerPrice: this.form.offerPrice > 0 ? Number(this.form.offerPrice) : undefined,
      dispatchLocation: this.form.dispatchLocation.trim() || undefined,
      deliveryType: this.form.deliveryType,
      rating: 5
      ,isActive: this.form.isActive
    };

    const request = this.isEditMode && this.editingProductId
      ? this.productService.updateProduct(this.editingProductId, payload)
      : this.productService.createProduct(payload);

    request.subscribe({
      next: (product) => {
        this.saving = false;
        this.successMessage = this.isEditMode ? 'Publicacion actualizada correctamente.' : 'Publicacion creada correctamente.';
        this.router.navigate(['/product', product.id]);
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving = false;
        this.errorMessage = err.error?.message || (this.isEditMode ? 'No se pudo actualizar la publicacion.' : 'No se pudo crear la publicacion.');
      }
    });
  }

  private loadProduct(productId: string): void {
    this.loadingProduct = true;
    this.productService.getProductById(productId).subscribe({
      next: (product) => {
        this.form = {
          itemType: product.itemType || 'producto',
          title: product.name || '',
          categoryId: product.categoryId || '',
          description: product.description || '',
          imageUrl: product.imageUrl || '',
          sku: product.sku || '',
          stock: Number(product.stock || 0),
          price: Number(product.price || 0),
          offerPrice: Number(product.offerPrice || 0),
          dispatchLocation: product.dispatchLocation || '',
          deliveryType: product.deliveryType || 'retiro',
          isActive: product.isActive ?? true
        };
        this.loadingProduct = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.loadingProduct = false;
        this.errorMessage = err.error?.message || 'No se pudo cargar la publicacion para editar.';
      }
    });
  }
}
