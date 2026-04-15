# Estado Actual de Mercaclick

Fecha de corte: 15 de abril de 2026

## 1. Objetivo de esta documentación

Este documento resume los cambios implementados hasta ahora en frontend y backend, el estado funcional alcanzado, las mejoras pendientes y la recomendación operativa sobre respaldos antes de continuar con más desarrollo.

## 2. Resumen ejecutivo

Mercaclick ya no está en una fase de maqueta básica. El proyecto quedó llevado a un flujo mucho más cercano a operación real para cliente y proveedor:

- Catálogo y landing mejorados para descubrimiento de productos.
- Detalle de producto enriquecido con más contexto comercial.
- Carrito y checkout conectados a lógica real.
- Órdenes con controles de seguridad del lado servidor.
- Panel del proveedor convertido en una base funcional de Mi Negocio.
- Publicación y edición de productos más completas.
- Navegación, autenticación y vistas ajustadas por rol.

## 3. Cambios realizados en Front-end

### 3.1 Shell, navegación y experiencia general

- Rediseño visual general con identidad Mercaclick.
- Navegación principal ajustada según rol autenticado.
- Diferenciación entre cliente y proveedor en menú y rutas visibles.
- Mejora de consistencia de textos, etiquetas y estados en español.
- Reemplazo progresivo de alertas del navegador por mensajes inline dentro de la interfaz.

### 3.2 Catálogo y landing

- Mejora del catálogo principal para búsqueda y exploración.
- Tarjetas de producto con mejor jerarquía visual y estados más claros.
- Uso consistente de precio real mostrado, considerando oferta cuando existe.
- Mejor tratamiento de stock agotado y productos inactivos.
- Feedback visual al agregar productos al carrito.

### 3.3 Detalle de producto

- Vista de producto rediseñada.
- Inclusión de datos ampliados del producto y del proveedor.
- Soporte visual para categoría, SKU, modalidad de entrega y punto de despacho.
- Mensajes inline al agregar al carrito o intentar contactar al proveedor.

### 3.4 Carrito y checkout

- Integración real del carrito con persistencia local.
- Revisión de cantidades, disponibilidad y validaciones previas al checkout.
- Cálculo y visualización más robusta del resumen de compra.
- Redirección posterior a compra hacia una vista de confirmación.
- Mejora reciente de visibilidad del carrito:
  - contador en navbar
  - confirmación contextual al agregar productos

### 3.5 Confirmación y órdenes

- Creación de pantalla específica de confirmación de pedido.
- Vista de pedidos mejorada para cliente y proveedor.
- Resúmenes y estados más claros dentro del módulo de órdenes.
- Expansión de detalle por orden para seguimiento operativo.
- Flujo del proveedor mejorado para gestión de ventas.

### 3.6 Panel del proveedor y publicación

- Dashboard evolucionado hacia una base funcional de Mi Negocio.
- Listado de publicaciones del proveedor dentro del panel.
- Soporte para crear, editar y eliminar productos.
- Visualización de estado del producto, stock, oferta y categoría.
- Formulario del proveedor ampliado con más campos comerciales y operativos.

### 3.7 Datos extendidos ya integrados en frontend

Los productos ahora pueden manejar en interfaz, además de lo básico:

- sku
- offerPrice
- dispatchLocation
- deliveryType
- isActive
- relaciones con categoría y proveedor

### 3.8 Autenticación y roles

- Ajustes de login, sesión y navegación por rol.
- Mejor cohesión entre vistas protegidas y permisos visuales.
- Cliente y proveedor ya recorren flujos diferenciados en navegación y módulos.

### 3.9 Estado técnico del frontend

- El build de frontend quedó compilando correctamente.
- La última validación ejecutada fue build exitoso con Angular.

## 4. Cambios realizados en Back-end

### 4.1 Seguridad y consistencia de órdenes

- Endurecimiento del flujo de creación de órdenes.
- El servidor calcula el precio válido del pedido en lugar de confiar en el payload del cliente.
- Validación de stock disponible y estado activo del producto antes de cerrar la compra.
- Actualización de stock dentro de un flujo transaccional.

### 4.2 Permisos y control por rol

- Reforzamiento de permisos para que clientes y proveedores sólo operen sobre recursos válidos para su rol.
- Ajustes para que el proveedor vea y gestione únicamente las órdenes relacionadas con sus productos.
- Restricción de cambios sensibles del estado de órdenes desde el lado cliente.

### 4.3 Productos y publicación

- Mejoras en creación, actualización y eliminación de productos.
- Validación de pertenencia del producto al proveedor autenticado.
- Corrección del problema de publicación relacionado con categorías y llaves foráneas.

### 4.4 Categorías y compatibilidad de datos

- Siembra y aseguramiento de categorías por defecto.
- Ajustes para usar IDs reales de categorías desde frontend.
- Reducción del riesgo de errores por integridad referencial en SQL Server.

### 4.5 Evolución del modelo Product

El backend ya soporta persistencia para campos extendidos como:

- sku
- offerPrice
- dispatchLocation
- deliveryType
- isActive

### 4.6 Compatibilidad de esquema

- Se agregó lógica para asegurar columnas faltantes en arranque cuando la tabla no estaba alineada con el modelo.
- Esto ayuda a reducir fallos entre versión de código y estructura de base existente.

## 5. Mejoras funcionales ya alcanzadas

Estas son mejoras de negocio ya materializadas, no sólo técnicas:

- Flujo de compra más completo y confiable.
- Flujo de proveedor más cercano a operación real.
- Mejor comunicación visual del estado de carrito, pedidos y publicaciones.
- Mayor trazabilidad de compra tras confirmar una orden.
- Mejor separación entre experiencia del cliente y del proveedor.

## 6. Mejoras pendientes o parcialmente resueltas

### 6.1 Pendientes de negocio para proveedor

Todavía no existe un módulo formal de perfil comercial del proveedor con datos estructurados del negocio, por ejemplo:

- horarios de atención
- dirección comercial estructurada del local
- datos del negocio a nivel tienda, no sólo por producto
- política de entregas a nivel negocio

### 6.2 Estado del envío a domicilio

Sí existe soporte parcial, pero a nivel producto/publicación:

- tipo de entrega
- ubicación o punto de despacho

No existe todavía una sección consolidada del negocio del proveedor donde se configure eso de manera global.

### 6.3 Pendientes recomendados para siguiente fase

- perfil de negocio del proveedor
- horarios de servicio
- dirección comercial estructurada
- datos de contacto operativos del negocio
- políticas globales de entrega y retiro
- posible distinción formal entre productos y servicios

## 7. Validaciones ya realizadas

- Compilación exitosa del frontend.
- Flujo de categorías validado tras corrección de llaves foráneas.
- Backend ajustado para cálculo seguro de precios en checkout.
- Mejoras recientes enfocadas en que el usuario sí vea que el producto fue agregado al carrito.

## 8. Recomendación sobre respaldo

### 8.1 Respuesta corta

Sí, en este punto sí conviene hacer respaldo de ambos desarrollos, frontend y backend.

### 8.2 Motivo

Ya hay cambios estructurales, funcionales y de flujo en varias capas del proyecto. Seguir sin un punto de recuperación aumenta el riesgo de perder:

- estabilidad alcanzada
- correcciones de integración ya resueltas
- validaciones manuales ya cerradas
- referencia clara de qué versión estaba funcionando

### 8.3 ¿Es estrictamente obligatorio?

No es estrictamente obligatorio si ya existiera control de versiones sólido con commits claros y remoto confiable.

Pero en el estado actual sí es altamente recomendable, especialmente porque:

- el proyecto ya pasó una fase importante de refactor y ajuste transversal
- hay cambios en frontend y backend que se apoyan entre sí
- la siguiente etapa probablemente tocará más modelo de negocio y perfil de proveedor

### 8.4 Qué respaldo conviene hacer

Opción recomendada:

- un respaldo lógico con Git, separando este punto como commit base estable

Opción adicional si quieres máxima seguridad:

- copia comprimida del directorio completo del proyecto
- respaldo de la base de datos o al menos script/export de estructura y datos relevantes

### 8.5 Conclusión operativa

Antes de seguir con nuevas mejoras, sí conviene generar respaldo de:

- Front-end
- Back-end
- base de datos, si contiene datos de prueba o configuración útil

Ese respaldo no porque el proyecto esté inestable, sino porque ya alcanzó un volumen de avance que merece un punto de restauración claro.
