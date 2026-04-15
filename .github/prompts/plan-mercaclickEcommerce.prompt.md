# Plan: Sistema de Catálogo E-commerce Mercaclick

## Requisitos Definidos
- **Backend**: Node.js + Express
- **Base de datos**: SQL Server (ya instalado)
- **Frontend**: Angular
- **Prioridades**: Gestión de emprendedores/vendedores + Catálogo de productos
- **Autenticación**: No prioritaria en esta fase
- **ORM**: Sequelize + driver tedious para SQL Server

---

## FASE 1: Configuración Inicial (parallelizable)

### 1.1 Backend - Inicializar proyecto Node.js
- Crear carpeta `Back-end/`
- Ejecutar `npm init`
- Instalar dependencias principales:
  - express
  - sequelize
  - tedious (driver SQL Server)
  - dotenv
  - cors
  - express-validator
  - bcryptjs (opcional para auth)
  - jsonwebtoken (opcional para auth)

### 1.2 Backend - Estructura de directorios
```
Back-end/
├── config/
│   ├── database.js          # Configuración Sequelize + SQL Server
│   └── constants.js
├── models/
│   ├── index.js             # Inicialización de modelos
│   ├── User.js
│   ├── Seller.js
│   ├── Product.js
│   ├── Category.js
│   ├── Order.js
│   └── OrderItem.js
├── controllers/
│   ├── productController.js
│   ├── sellerController.js
│   ├── categoryController.js
│   ├── orderController.js
│   └── userController.js
├── routes/
│   ├── index.js
│   ├── products.js
│   ├── sellers.js
│   ├── categories.js
│   ├── orders.js
│   └── users.js
├── middleware/
│   ├── errorHandler.js
│   ├── validation.js
│   └── authentication.js    # (preparado para futuro)
├── services/
│   ├── productService.js
│   ├── sellerService.js
│   ├── orderService.js
│   └── categoryService.js
├── utils/
│   └── helpers.js
├── .env
├── .env.example
├── .gitignore
├── app.js                   # Configuración Express
└── server.js                # Punto de entrada
```

### 1.3 Backend - Configuración .env
```
DB_HOST=localhost
DB_PORT=1433
DB_NAME=mercaclick_db
DB_USER=sa
DB_PASSWORD=tu_password
NODE_ENV=development
PORT=3000
```

### 1.4 Frontend - Inicializar proyecto Angular
- Crear carpeta `Front-end/`
- Ejecutar `ng new front-end --routing`
- Instalar dependencias adicionales:
  - @angular/forms
  - @angular/http-client (ya incluido)
  - bootstrap (opcional, para UI)
  - ngx-toastr (para notificaciones)

### 1.5 Frontend - Estructura de directorios
```
Front-end/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── catalog/
│   │   │   ├── product-detail/
│   │   │   ├── seller-profile/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── orders/
│   │   │   ├── user-dashboard/
│   │   │   ├── seller-dashboard/
│   │   │   └── navbar/
│   │   ├── services/
│   │   │   ├── product.service.ts
│   │   │   ├── seller.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── cart.service.ts
│   │   │   └── auth.service.ts
│   │   ├── models/
│   │   │   ├── product.model.ts
│   │   │   ├── seller.model.ts
│   │   │   └── order.model.ts
│   │   ├── shared/
│   │   │   └── interceptors/
│   │   ├── app-routing.module.ts
│   │   └── app.module.ts
│   ├── assets/
│   └── styles.css
```

### 1.6 Base de datos - Script de inicialización SQL Server
```sql
CREATE DATABASE mercaclick_db;
USE mercaclick_db;
-- Las tablas se crearán vía migraciones Sequelize
```

---

## FASE 2: Modelado de Base de Datos (depende de FASE 1)

### Tablas y Columnas

#### users (
- id (PK, UNIQUEIDENTIFIER)
- email (VARCHAR, UNIQUE)
- password (VARCHAR)
- firstName (VARCHAR)
- lastName (VARCHAR)
- phone (VARCHAR)
- address (VARCHAR)
- userType (ENUM: 'client', 'seller', 'admin') -- para fase futura
- createdAt (DATETIME)
- updatedAt (DATETIME)

#### sellers
- id (PK, UNIQUEIDENTIFIER)
- userId (FK → users.id)
- businessName (VARCHAR)
- description (TEXT)
- logoUrl (VARCHAR)
- rating (DECIMAL 3,2, DEFAULT 0)
- isVerified (BIT, DEFAULT 0)
- createdAt (DATETIME)
- updatedAt (DATETIME)

#### categories
- id (PK, UNIQUEIDENTIFIER)
- name (VARCHAR, UNIQUE)
- description (TEXT)
- imageUrl (VARCHAR)
- createdAt (DATETIME)
- updatedAt (DATETIME)

#### products
- id (PK, UNIQUEIDENTIFIER)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL 10,2)
- stock (INT, DEFAULT 0)
- categoryId (FK → categories.id)
- sellerId (FK → sellers.id)
- imageUrl (VARCHAR)
- rating (DECIMAL 3,2, DEFAULT 0)
- createdAt (DATETIME)
- updatedAt (DATETIME)

#### orders
- id (PK, UNIQUEIDENTIFIER)
- userId (FK → users.id)
- status (ENUM: 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
- totalAmount (DECIMAL 10,2)
- shippingAddress (VARCHAR)
- createdAt (DATETIME)
- updatedAt (DATETIME)

#### order_items
- id (PK, UNIQUEIDENTIFIER)
- orderId (FK → orders.id)
- productId (FK → products.id)
- quantity (INT)
- unitPrice (DECIMAL 10,2)
- subtotal (DECIMAL 10,2)
- createdAt (DATETIME)

---

## FASE 3: APIs Backend (REST) (depende de FASE 2, parallelizable por recurso)

### 3.1 Gestión de Productos (PRIORIDAD ALTA)
- GET /api/products → Listar con filtros (categoría, seller, precio, página)
- GET /api/products/:id → Obtener detalles completos
- POST /api/products → Crear (validar token vendedor)
- PUT /api/products/:id → Actualizar (validar propietario)
- DELETE /api/products/:id → Eliminar (validar propietario)

### 3.2 Gestión de Vendedores/Emprendedores (PRIORIDAD ALTA)
- GET /api/sellers → Listar vendedores verificados
- GET /api/sellers/:id → Perfil completo con productos
- POST /api/sellers → Registrar emprendedor
- PUT /api/sellers/:id → Actualizar perfil
- GET /api/sellers/:id/products → Productos del vendedor (paginado)

### 3.3 Gestión de Categorías
- GET /api/categories → Listar todas
- POST /api/categories → Crear (admin, preparado para futuro)
- PUT /api/categories/:id → Actualizar
- DELETE /api/categories/:id → Eliminar

### 3.4 Gestión de Órdenes
- GET /api/orders → Listar órdenes del usuario (con paginación)
- POST /api/orders → Crear nueva orden (con validación de stock)
- GET /api/orders/:id → Detalle de orden con items
- PUT /api/orders/:id/status → Cambiar estado (preparado para admin)

### 3.5 Usuarios (básico)
- GET /api/users/profile → Obtener perfil del usuario autenticado
- PUT /api/users/profile → Actualizar perfil
- POST /api/users/register → Registrar nuevo usuario
- POST /api/users/login → Login (preparado para futuro)

### 3.6 Errores y Validación
- Middleware centralizado de error handling
- Validación con express-validator
- Códigos HTTP: 200, 201, 400, 401, 403, 404, 500

---

## FASE 4: Frontend (Angular) (depende de FASE 3 para APIs)

### 4.1 Componentes Principales

#### Home/Catalog View
- Componente catalogo/
- Listado de productos con tarjetas
- Filtros: categoría, rango de precio, búsqueda
- Paginación
- Ordenamiento: relevancia, precio (asc/desc), reciente

#### Product Detail
- Componente product-detail/
- Galería de imágenes (placeholder si no hay)
- Descripción completa, precio, stock
- Información del vendedor con link
- Botón "Agregar al carrito"
- Sistema de puntuación (preparado para futuro)

#### Seller Profile
- Componente seller-profile/
- Información del vendedor (logo, nombre, descripción)
- Productos del vendedor (listado)
- Rating y número de reseñas

#### Shopping Cart
- Componente cart/
- Listado de items con cantidad, precio unitario, subtotal
- Botones: eliminar item, actualizar cantidad
- Total general
- Botón "Ir a Checkout"
- Persistencia en localStorage

#### Checkout / Órdenes
- Componente checkout/
- Resumen de compra
- Validación de stock (final)
- Dirección de envío
- Confirmación de orden
- Redirección a órdenes después de éxito

#### User Dashboard / Mis Órdenes
- Componente user-dashboard/
- Historial de órdenes del usuario
- Estado de cada orden
- Link a detalle de orden

#### Seller Dashboard / Gestión de Productos
- Componente seller-dashboard/
- Tabla/listado de productos del vendedor
- CRUD de productos
- Indicadores: stock, precio, última actualización

### 4.2 Servicios HTTP (en services/)
- ProductService: CRUD de productos, búsqueda, filtros
- SellerService: Información de vendedores, listado
- OrderService: Crear, listar, obtener détalle de órdenes
- CartService: Gestión de carrito (addItem, removeItem, clear, getCart)
- AuthService: Básico, preparado para futuro (login, register, logout)

### 4.3 Modelos TypeScript (en models/)
```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  sellerId: string;
  imageUrl: string;
  rating: number;
}

export interface Seller {
  id: string;
  businessName: string;
  description: string;
  logoUrl: string;
  rating: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}
```

### 4.4 Enrutamiento (app-routing.module.ts)
```
/                          → Home/Catálogo
/product/:id              → Detalle de producto
/seller/:id               → Perfil de vendedor
/cart                     → Carrito de compras
/checkout                 → Confirmación y creación de orden
/orders                   → Historial de órdenes
/dashboard                → Panel de usuario
/dashboard/products       → Gestión de productos (vendedor)
```

### 4.5 Interceptores (opcional, para futuro)
- HttpInterceptor para agregar headers de autenticación
- Manejo global de errores HTTP

---

## FASE 5: Integración y Validación (depende de FASE 3 y 4)

### 5.1 Pruebas de Backend
- Validar cada endpoint con Postman/Thunder Client
- Verificar validaciones de entrada
- Confirmar respuestas de error adecuadas
- Probar paginación y filtros

### 5.2 Pruebas de Frontend
- `ng serve` sin errores en consola
- Navegar por todas las rutas
- Agregar/quitar productos del carrito
- Crear una orden desde catálogo → carrito → checkout
- Verificar persistencia de carrito entre sesiones

### 5.3 Flujos Completos End-to-End
1. Usuario entra a home → ve catálogo de productos
2. Búsqueda/filtrado de productos
3. Abre detalle de producto
4. Agrega múltiples productos al carrito
5. Va al carrito, modifica cantidades
6. Realiza checkout
7. Orden se crea en BD
8. Orden aparece en historial del usuario
9. Vendedor puede verificar orden

### 5.4 Preparación para Deploy
- Configurar variables de entorno (desarrollo vs producción)
- Build de Angular: `ng build --prod`
- Asegurar CORS configurado correctamente

---

## Verificación Final

### Backend
```bash
npm test (si hay tests)
Verificar en SQL Server Management Studio:
  - BD creada: mercaclick_db
  - Tablas: users, sellers, products, categories, orders, order_items
  - Relaciones FK correctas
```

### Frontend
```bash
ng serve
Verificar en navegador:
  - No hay errores en consola (F12)
  - Catálogo carga correctamente
  - Carrito y checkout funcionan
  - Órdenes se crean exitosamente
```

---

## Decisions & Assumptions

✅ **Autenticación**: Redireccionada a Fase 2 (no es bloqueante)
✅ **Pagos**: Sistema básico sin integración externa (validación de orden)
✅ **Stock**: Controlado a nivel de BD (decremento en order_items)
✅ **Validación**: Tanto en backend como en frontend (mejor UX)
✅ **Imágenes**: URLs de terceros (no almacenamiento local por ahora)
✅ **Caché**: Preparado con servicios Angular (sin Redux por ahora)

---

## Implementation Order Recommendation

**Recomendación**: Especificar si empezar por backend o frontend en primer término.

1. Backend first (crear BD, APIs, modelos Sequelize)
   → Luego frontend consume APIs
   
   O

2. Backend + Frontend in paralelo con mocks
   → Later conectar cuando backend esté listo

**Preferencia**: Backend first es más estable para desarrollo.
