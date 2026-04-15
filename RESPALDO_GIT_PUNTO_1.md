# Respaldo Git del Proyecto

Fecha de referencia: 15 de abril de 2026

## Objetivo

Dejar un snapshot estable del proyecto completo en el repositorio raíz de Mercaclick, incluyendo frontend y backend, pero excluyendo artefactos generados, dependencias y archivos sensibles.

## Estado actual confirmado

- Existe un repositorio Git en la raíz del proyecto.
- La rama actual es main.
- No hay remoto configurado todavía.
- Frontend y backend ya pueden respaldarse desde el repo raíz usando el .gitignore raíz.

## Qué debe incluir el respaldo

- código fuente de Front-end
- código fuente de Back-end
- documentación del estado actual
- archivos de configuración necesarios para reconstruir el proyecto

## Qué no debe incluir

- node_modules
- dist
- .angular
- coverage
- logs
- archivos .env con secretos o configuración local sensible

## Flujo recomendado

Ejecutar desde la raíz del proyecto:

```powershell
git add .gitignore
git add ESTADO_ACTUAL_MERCACLICK.md
git add RESPALDO_GIT_PUNTO_1.md
git add Back-end
git add Front-end
git status
```

Si la revisión se ve correcta, crear el snapshot:

```powershell
git commit -m "chore: snapshot estable de frontend y backend mercaclick"
```

## Validación posterior al commit

```powershell
git status
git log --oneline -n 3
```

El resultado esperado es:

- working tree limpio
- un commit nuevo que marque este punto estable

## Recomendación adicional

Como todavía no existe remoto configurado, este respaldo sería local. Para que realmente funcione como respaldo de recuperación, el siguiente paso recomendado es conectar un remoto y subir el commit.

Ejemplo general:

```powershell
git remote add origin <url-del-repositorio>
git push -u origin main
```

## Nota operativa

No conviene hacer commit de la base de datos ni de secretos. La base de datos debe respaldarse aparte mediante export, backup nativo de SQL Server o script de estructura y datos de prueba.