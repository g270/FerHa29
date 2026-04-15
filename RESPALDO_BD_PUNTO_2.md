# Respaldo de Base de Datos

Fecha de referencia: 15 de abril de 2026

## Objetivo

Respaldar la base de datos de Mercaclick por fuera del repositorio Git para poder restaurar datos, estructura y configuración útil del entorno.

## Contexto confirmado

El backend está preparado para trabajar con SQL Server y la referencia actual de entorno indica uso de una base llamada mercaclick_db.

Datos de referencia observados en la configuración de ejemplo:

- motor: SQL Server
- host: localhost
- instancia: MSSQLSERVER2022
- base de datos: mercaclick_db

## Qué debe respaldarse

- estructura de tablas
- relaciones y llaves foráneas
- datos de prueba útiles
- categorías precargadas
- cuentas de prueba importantes si quieres conservar escenarios manuales

## Qué no debe mezclarse con el respaldo Git

- archivos binarios grandes de base de datos dentro del repo
- secretos o credenciales reales en archivos versionados

## Opciones recomendadas de respaldo

### Opción A. Backup nativo de SQL Server

Es la opción más completa si tienes acceso a SQL Server Management Studio.

Flujo recomendado:

1. Abrir SQL Server Management Studio.
2. Conectarte a la instancia donde vive mercaclick_db.
3. Ir a la base de datos mercaclick_db.
4. Elegir Tasks > Back Up.
5. Generar un archivo .bak en una carpeta de respaldo fuera del proyecto.

Resultado esperado:

- archivo .bak recuperable
- respaldo íntegro de estructura y datos

### Opción B. Script de esquema y datos

Útil si quieres un respaldo más portable y fácil de inspeccionar.

Flujo recomendado en SSMS:

1. Click derecho sobre la base de datos.
2. Tasks > Generate Scripts.
3. Incluir schema y data de tablas necesarias.
4. Guardar el .sql fuera del repo o en una carpeta de respaldos no versionada.

Resultado esperado:

- archivo SQL que permita reconstruir estructura y datos base

### Opción C. Respaldo mínimo operativo

Si no quieres exportar toda la base todavía, al menos conserva:

- script de creación de categorías
- usuarios de prueba relevantes
- productos de prueba funcionales
- pedidos de prueba representativos

## Recomendación concreta para este proyecto

Para Mercaclick, la mejor combinación en este punto es:

- snapshot Git del código
- backup nativo .bak de SQL Server o script SQL completo de mercaclick_db

Eso te deja cubierto en dos frentes:

- código y estructura del proyecto
- datos y estado de la base

## Ubicación sugerida de respaldo

No guardar el backup de BD dentro del repo. Mejor usar una ruta separada, por ejemplo:

```text
C:\Respaldos\Mercaclick\
```

Y dentro:

- mercaclick_codigo_snapshot
- mercaclick_db_2026-04-15.bak
- mercaclick_db_2026-04-15.sql

## Cierre del punto

El snapshot Git protege el código.
El backup de base protege datos y estructura.

Para dar por cerrado el respaldo del proyecto completo, ambos deberían existir.