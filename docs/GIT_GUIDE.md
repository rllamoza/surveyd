# Guía Oficial de Git y GitHub - Gen_Encuestas

Esta guía documenta la gestión de versiones, comandos esenciales, flujo de trabajo colaborativo y sincronización con **GitHub** para el proyecto **Gen_Encuestas** (`rllamoza/Gen_Encuestas`).

---

## 1. 🌐 Información del Repositorio

- **Organización / Propietario:** `rllamoza`
- **Nombre del Repositorio:** `Gen_Encuestas`
- **Visibilidad:** Pública
- **URL Web en GitHub:** [https://github.com/rllamoza/Gen_Encuestas](https://github.com/rllamoza/Gen_Encuestas)
- **URL de Clonación (HTTPS):** `https://github.com/rllamoza/Gen_Encuestas.git`
- **URL de Clonación (SSH):** `git@github.com:rllamoza/Gen_Encuestas.git`
- **Rama Principal:** `main`

---

## 2. 🚀 Configuración Inicial y Clonación

### Clonar el proyecto por primera vez
```bash
git clone https://github.com/rllamoza/Gen_Encuestas.git
cd Gen_Encuestas
```

### Configuración de identidad de usuario (si aún no está configurado)
```bash
git config --global user.name "Raúl Llamoza"
git config --global user.email "rllamoza@example.com"
```

### Verificar remotos configurados
```bash
git remote -v
```
Salida esperada:
```text
origin    https://github.com/rllamoza/Gen_Encuestas.git (fetch)
origin    https://github.com/rllamoza/Gen_Encuestas.git (push)
```

---

## 3. 🔄 Flujo de Trabajo Diario (Ciclo de Desarrollo)

### Paso 1: Consultar estado actual
Antes de realizar cambios o commits, verifique los archivos modificados o sin seguimiento:
```bash
git status
```

### Paso 2: Descargar cambios recientes del repositorio remoto
Para asegurarse de tener la última versión del código:
```bash
git pull origin main
```

### Paso 3: Preparar archivos para commit (Stage)
Añadir todos los archivos modificados y nuevos:
```bash
git add .
```
O añadir archivos puntuales:
```bash
git add frontend/js/public-survey.js backend/api/respuestas.php
```

### Paso 4: Registrar cambios con mensaje descriptivo (Commit)
Seguir el estándar de **Conventional Commits**:
- `feat:` Nuevas funcionalidades.
- `fix:` Corrección de errores o bugs.
- `docs:` Modificaciones en documentación (`README.md`, `docs/`).
- `refactor:` Reestructuración de código sin alterar su comportamiento externo.
- `chore:` Tareas de mantenimiento, configuración o dependencias.

Ejemplo:
```bash
git commit -m "feat(validacion): bloquear ingreso de letras en campos numericos en tiempo real"
```

### Paso 5: Subir los cambios a GitHub (Push)
```bash
git push origin main
```

---

## 4. 🌿 Gestión de Ramas (Branching)

Para desarrollar nuevas funcionalidades sin afectar la rama principal:

### Crear y cambiar a una nueva rama
```bash
git checkout -b feature/nueva-pregunta-audio
```

### Listar ramas locales y remotas
```bash
git branch -a
```

### Subir una nueva rama a GitHub
```bash
git push -u origin feature/nueva-pregunta-audio
```

### Fusionar cambios en `main`
```bash
# Cambiar a la rama principal
git checkout main

# Descargar últimas actualizaciones
git pull origin main

# Fusionar la rama de trabajo
git merge feature/nueva-pregunta-audio

# Subir la fusión a GitHub
git push origin main

# Eliminar la rama local una vez fusionada
git branch -d feature/nueva-pregunta-audio
```

---

## 5. 🔀 Trabajo con Múltiples Remotos (Espejo / Sync)

Si el proyecto mantiene un repositorio secundario (por ejemplo `surveyd` y `Gen_Encuestas`), puede sincronizar ambos de la siguiente forma:

### Configurar los dos remotos
```bash
# Añadir el repositorio secundario
git remote add surveyd https://github.com/rllamoza/surveyd.git
```

### Subir simultáneamente a ambos repositorios
```bash
# Subir al repositorio principal
git push origin main

# Subir al repositorio secundario
git push surveyd main
```

---

## 6. 🛠️ Solución de Problemas Comunes

### Descartar cambios locales no deseados en un archivo
```bash
git restore frontend/index.html
```

### Guardar temporalmente cambios no terminados (Stash)
Si necesita cambiar de rama o hacer pull sin perder su trabajo a medio camino:
```bash
# Guardar en el baúl temporal
git stash

# Actualizar el código
git pull origin main

# Recuperar los cambios del baúl
git stash pop
```

### Ver el historial de commits resumido y gráfico
```bash
git log --oneline --graph --decorate -n 10
```

### Deshacer el último commit local manteniendo los cambios en archivos
```bash
git reset --soft HEAD~1
```

---

## 7. 🤖 Uso de GitHub CLI (`gh`)

El proyecto cuenta con integración completa mediante la herramienta oficial `gh`:

### Ver estado de autenticación
```bash
gh auth status
```

### Abrir el repositorio directamente en el navegador
```bash
gh repo view --web
```

### Crear un nuevo Release / Versión oficial
```bash
gh release create v3.6.0 --title "Versión 3.6.0 PRO" --notes "Incluye validación multinivel en tiempo real y subida de multimedia."
```

### Gestionar Issues desde la consola
```bash
# Listar incidencias abiertas
gh issue list

# Crear una nueva incidencia
gh issue create --title "Soporte para preguntas tipo firma digital" --body "Requerimiento para firmas táctiles en móviles."
```

---

## 8. 📦 Despliegue en Servidores vía Git

Para actualizar un servidor en producción (VPS, BanaHosting, cPanel o DigitalOcean) mediante Git:

```bash
cd /public_html/APPS/app_encuestas/
git pull origin main
```
*Asegúrese de que el archivo `.env` o la configuración de base de datos (`backend/config/db_credentials.json`) permanezca excluida mediante `.gitignore` para no sobreescribir contraseñas de producción.*
