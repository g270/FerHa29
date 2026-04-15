# Guía de Restauración de Mercaclick

Fecha de referencia: 15 de abril de 2026

## 1. Objetivo

Esta guía sirve para reconstruir el proyecto Mercaclick desde el estado respaldado en Git y, si existe, desde el respaldo de base de datos.

## 2. Punto de restauración actual

Commits relevantes del corte:

- 95acc50: snapshot estable de frontend y backend
- 6f789ee: manejo limpio de puerto ocupado en backend
- 5ec4578: configuración de agentes y VS Code

Si vas a restaurar el proyecto completo, lo recomendable es usar el HEAD actual de main, que ya incluye los tres.

## 3. Restauración del código

### Opción recomendada

Ubicarse en el commit más reciente del corte:

```powershell
git checkout main
git log --oneline -n 3
```

Si necesitas regresar exactamente al snapshot base antes de los ajustes posteriores:

```powershell
git checkout 95acc50
```

Si necesitas el estado completo final de este cierre:

```powershell
git checkout 5ec4578
```

## 4. Restauración de dependencias

### Backend

```powershell
Set-Location Back-end
npm install
```

### Frontend

```powershell
Set-Location ..\Front-end
npm install
```

## 5. Restauración de variables de entorno

### Backend

Crear o restaurar el archivo:

- Back-end/.env

Puedes partir de:

- Back-end/.env.example

Variables esperadas según la configuración actual:

```env
DB_HOST=localhost
DB_INSTANCE=MSSQLSERVER2022
DB_PIPE_NAME=\\.\pipe\SQLLocal\MSSQLSERVER2022
DB_TRUSTED_CONNECTION=true
DB_NAME=mercaclick_db
DB_USER=
DB_PASSWORD=
NODE_ENV=development
PORT=3001
```

Nota: aunque el ejemplo histórico mostraba otro puerto, el backend actual se validó operando en 3001.

## 6. Restauración de base de datos

Si existe respaldo de BD, restaurar primero la base mercaclick_db.

### Opción A. Archivo .bak

Usar SQL Server Management Studio:

1. Conectarse a la instancia SQL Server.
2. Ir a Databases.
3. Elegir Restore Database.
4. Seleccionar el archivo .bak.
5. Restaurar como mercaclick_db.

### Opción B. Script SQL

1. Abrir el archivo .sql de respaldo.
2. Ejecutarlo sobre la instancia correcta.
3. Verificar que existan tablas y datos base.

## 7. Validación del backend

Desde la raíz del proyecto:

```powershell
Set-Location Back-end
npm start
```

Resultado esperado:

- conexión a base correcta
- modelos sincronizados
- columnas extendidas verificadas
- categorías base verificadas
- servidor escuchando en http://localhost:3001

Si aparece el mensaje de puerto ocupado, liberar el 3001 o cambiar temporalmente el valor de PORT en .env.

## 8. Validación del frontend

```powershell
Set-Location ..\Front-end
npm start
```

O para validación de compilación:

```powershell
npm run build
```

Resultado esperado:

- frontend ejecutándose sin errores críticos
- integración con backend en localhost:3001

## 9. Verificación funcional mínima

Después de restaurar, revisar al menos:

- catálogo carga productos
- detalle de producto abre correctamente
- carrito agrega productos
- proveedor puede entrar a Mi Negocio
- creación de producto funciona
- órdenes responden desde backend

## 10. Archivos de apoyo del corte

Documentos útiles incluidos en este estado:

- ESTADO_ACTUAL_MERCACLICK.md
- RESPALDO_GIT_PUNTO_1.md
- RESPALDO_BD_PUNTO_2.md
- GUIA_RESTAURACION_MERCACLICK.md

## 11. Recomendación operativa

Si vas a retomar desarrollo después de restaurar:

1. restaurar código
2. restaurar base de datos
3. instalar dependencias
4. validar backend
5. validar frontend
6. correr una prueba manual corta de compra y proveedor