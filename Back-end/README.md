# Mercaclick Backend

Backend de la plataforma de catálogo de emprendedores **Mercaclick**, construido con Node.js, Express y SQL Server.

## Requisitos

- Node.js v18+ 
- SQL Server 2022 con TCP/IP habilitado en puerto `1433`
- npm v8+

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=1433
DB_NAME=mercaclick_db
DB_USER=
DB_PASSWORD=
DB_TRUSTED_CONNECTION=true
USE_SHARED_MEMORY=false
DB_INSTANCE=
DB_PIPE_NAME=

# Servidor
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=mercaclicksecret
```

**Explicación:**
- `DB_HOST=localhost` - servidor SQL Server local
- `DB_PORT=1433` - puerto de SQL Server
- `DB_TRUSTED_CONNECTION=true` - usar autenticación de Windows
- `NODE_ENV=production` - usa SQL Server (en `development` usa SQLite en memoria)

### 3. Levantar el servidor

```bash
node server.js
```

O en desarrollo:

```bash
npm run dev  # si tienes nodemon instalado
```

Esperado:
```
Conexión a base de datos establecida correctamente
Modelos sincronizados con la base de datos
✅ Servidor backend ejecutándose en http://localhost:3001
📡 APIs disponibles en http://localhost:3001/api/
```

---

## Endpoints

### Autenticación

#### Registro
- **POST** `/api/users/register`
- **Body:**
  ```json
  {
    "email": "usuario@example.com",
    "password": "Password123!",
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "1234567890",
    "address": "Calle 123",
    "userType": "client"
  }
  ```
- **Respuesta (201):**
  ```json
  {
    "message": "Usuario registrado exitosamente",
    "user": {
      "id": "a9e9868d-3aaa-4a88-9a51-957e447f27a7",
      "email": "usuario@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "userType": "client"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### Login
- **POST** `/api/users/login`
- **Body:**
  ```json
  {
    "email": "usuario@example.com",
    "password": "Password123!"
  }
  ```
- **Respuesta (200):**
  ```json
  {
    "message": "Login exitoso",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a9e9868d-3aaa-4a88-9a51-957e447f27a7",
      "email": "usuario@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "userType": "client"
    }
  }
  ```

#### Obtener Perfil (Autenticado)
- **GET** `/api/users/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Respuesta (200):**
  ```json
  {
    "id": "a9e9868d-3aaa-4a88-9a51-957e447f27a7",
    "email": "usuario@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "1234567890",
    "address": "Calle 123",
    "userType": "client",
    "createdAt": "2026-04-05T15:25:06.465Z",
    "updatedAt": "2026-04-05T15:25:06.465Z"
  }
  ```

---

### Productos

#### Listar productos
- **GET** `/api/products`
- **Respuesta (200):** Lista de productos

#### Obtener un producto
- **GET** `/api/products/:id`
- **Respuesta (200):** Detalles del producto

#### Crear producto (Autenticado)
- **POST** `/api/products`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Producto XYZ",
    "description": "Descripción...",
    "price": 29.99,
    "stock": 50,
    "categoryId": "...",
    "imageUrl": "https://..."
  }
  ```

---

### Vendedores

#### Listar vendedores
- **GET** `/api/sellers`

#### Obtener vendedor
- **GET** `/api/sellers/:id`

#### Obtener productos de un vendedor
- **GET** `/api/sellers/:id/products`

---

### Categorías

#### Listar categorías
- **GET** `/api/categories`

#### Crear categoría (Autenticado)
- **POST** `/api/categories`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Electrónica",
    "description": "Productos electrónicos",
    "imageUrl": "https://..."
  }
  ```

---

### Pedidos

#### Listar pedidos (Autenticado)
- **GET** `/api/orders`
- **Headers:** `Authorization: Bearer <token>`

#### Obtener pedido (Autenticado)
- **GET** `/api/orders/:id`
- **Headers:** `Authorization: Bearer <token>`

#### Crear pedido (Autenticado)
- **POST** `/api/orders`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "items": [
      { "productId": "...", "quantity": 2 }
    ],
    "shippingAddress": "Calle 123"
  }
  ```

---

## Pruebas Rápidas

### Usar curl:
```bash
# Registro
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","firstName":"Test","userType":"client"}'

# Login
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Perfil (reemplazar TOKEN)
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer TOKEN"
```

### Usar Node.js:
```bash
node api-test.js
```

---

## Estructura

```
Back-end/
├── config/
│   └── database.js          # Configuración de Sequelize
├── models/
│   ├── User.js
│   ├── Seller.js
│   ├── Category.js
│   ├── Product.js
│   ├── Order.js
│   └── OrderItem.js
├── routes/
│   ├── users.js
│   ├── products.js
│   ├── sellers.js
│   ├── categories.js
│   ├── orders.js
│   └── index.js
├── controllers/
│   ├── userController.js
│   ├── productController.js
│   ├── sellerController.js
│   ├── categoryController.js
│   └── orderController.js
├── middleware/
│   ├── authentication.js
│   ├── errorHandler.js
│   └── validation.js
├── .env                     # Variables de entorno (no commitear)
├── .gitignore
├── app.js                   # Configuración de Express
├── server.js                # Entrada principal
├── package.json
└── package-lock.json
```

---

## Variables de Entorno Completas

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `DB_HOST` | Host de SQL Server | `localhost` |
| `DB_PORT` | Puerto de SQL Server | `1433` |
| `DB_NAME` | Nombre de la base de datos | `mercaclick_db` |
| `DB_USER` | Usuario (si no usas Windows Auth) | `""` |
| `DB_PASSWORD` | Contraseña (si no usas Windows Auth) | `""` |
| `DB_TRUSTED_CONNECTION` | Usar Windows Auth | `true` |
| `DB_INSTANCE` | Instancia de SQL Server (opcional) | `""` |
| `NODE_ENV` | Ambiente (`development` o `production`) | `production` |
| `PORT` | Puerto del servidor Express | `3001` |
| `JWT_SECRET` | Secreto para firmar tokens | `mercaclicksecret` |

---

## Troubleshooting

### Error: "Login failed for user ''"
- **Causa:** No se puede conectar a SQL Server con autenticación de Windows
- **Solución:** Verifica que:
  - SQL Server está escuchando en `localhost:1433`
  - TCP/IP está habilitado
  - `DB_TRUSTED_CONNECTION=true` en `.env`

### Error: "Endpoint no encontrado"
- **Causa:** La ruta no existe
- **Solución:** Verifica que la ruta está registrada en `routes/index.js` y que la URL es correcta

### Error: "token expired"
- **Causa:** El token JWT tiene validez limitada (1-2 horas)
- **Solución:** Haz login de nuevo para obtener un nuevo token

---

## Próximos Pasos

1. Integrar Frontend con estas rutas
2. Añadir más validaciones
3. Implementar tests unitarios
4. Documentación con Swagger

---

**Última actualización:** 5 de abril de 2026
