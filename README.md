# HaxEC eSport — Guía de Despliegue en Vercel

## 👑 Credenciales Admin
| Usuario | Contraseña |
|---------|-----------|
| `Judameal` | `admin123` |

---

## PASO 1 — Crear base de datos en MongoDB Atlas (GRATIS)

### 1.1 Crear cuenta
1. Ve a **https://www.mongodb.com/atlas**
2. Haz clic en **"Try Free"**
3. Regístrate con tu email (o con Google)
4. Verifica tu correo

### 1.2 Crear un cluster gratuito
1. Después de entrar, haz clic en **"Build a Database"**
2. Selecciona el plan **FREE (M0 Sandbox)**
3. Elige el proveedor: **AWS** y región más cercana (ej: N. Virginia)
4. Ponle un nombre al cluster (ej: `haxec-cluster`)
5. Clic en **"Create"**

### 1.3 Configurar acceso
Mientras se crea el cluster, Atlas te pedirá:

**a) Crear usuario de base de datos:**
- Username: `haxecadmin` (o el que quieras)
- Password: crea una contraseña segura (¡guárdala!)
- Clic en **"Create User"**

**b) Configurar acceso de red:**
- Selecciona **"Allow Access from Anywhere"** (0.0.0.0/0)
- Clic en **"Add Entry"**
- Clic en **"Finish and Close"**

### 1.4 Obtener el Connection String
1. En el dashboard, clic en **"Connect"** (en tu cluster)
2. Selecciona **"Drivers"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copia el connection string. Se ve así:
   ```
   mongodb+srv://haxecadmin:<password>@haxec-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Reemplaza `<password>`** con la contraseña que pusiste en el paso 1.3a
6. Guarda este string, lo necesitarás en el Paso 2

---

## PASO 2 — Subir código a GitHub

### 2.1 Crear repositorio
1. Ve a **https://github.com** e inicia sesión
2. Clic en **"New repository"**
3. Nombre: `haxec-esport`
4. Selecciona **Private** (recomendado)
5. Clic en **"Create repository"**

### 2.2 Subir los archivos
En tu computadora, abre una terminal en la carpeta del proyecto:

```bash
git init
git add .
git commit -m "HaxEC eSport inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/haxec-esport.git
git push -u origin main
```

> Si no tienes Git instalado: descárgalo en https://git-scm.com

---

## PASO 3 — Desplegar en Vercel

### 3.1 Conectar repositorio
1. Ve a **https://vercel.com** e inicia sesión
2. Clic en **"Add New Project"**
3. Selecciona **"Import Git Repository"**
4. Conecta tu cuenta de GitHub si no lo has hecho
5. Busca `haxec-esport` y clic en **"Import"**

### 3.2 Configurar el proyecto
En la pantalla de configuración:
- **Framework Preset:** Other
- **Root Directory:** `./` (dejar como está)
- **Build Command:** dejar vacío
- **Output Directory:** dejar vacío

### 3.3 Agregar variable de entorno (¡MUY IMPORTANTE!)
Antes de hacer Deploy, ve a **"Environment Variables"** y agrega:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://haxecadmin:TU_PASSWORD@haxec-cluster.xxxxx.mongodb.net/haxec?retryWrites=true&w=majority` |

> ⚠️ Asegúrate de que el connection string tenga `/haxec` antes del `?` para especificar la base de datos.

### 3.4 Desplegar
1. Clic en **"Deploy"**
2. Espera ~2 minutos
3. ¡Listo! Vercel te dará una URL como: `https://haxec-esport.vercel.app`

---

## PASO 4 — Verificar que funciona

1. Abre tu URL de Vercel
2. Inicia sesión con `Judameal` / `admin123`
3. ¡Todo debería funcionar con datos persistentes!

---

## 🔄 Actualizar el proyecto en el futuro

Cada vez que modifiques el código y hagas push a GitHub, Vercel se actualiza automáticamente:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## ❓ Problemas comunes

**"Application error" en Vercel:**
- Ve a Vercel → tu proyecto → "Functions" → revisa los logs
- Probablemente el MONGODB_URI está mal escrito

**"Authentication failed" de MongoDB:**
- Verifica que el password en el connection string sea correcto
- Verifica que en Atlas hayas permitido acceso desde 0.0.0.0/0

**La app carga pero no guarda datos:**
- Confirma que el MONGODB_URI incluye `/haxec` antes del `?`

---

## 📁 Estructura del proyecto

```
haxec-esport/
├── server.js          ← Backend Express + MongoDB
├── package.json
├── vercel.json        ← Configuración Vercel
├── .gitignore
└── public/
    ├── index.html     ← Frontend
    ├── styles.css     ← Estilos
    └── app.js         ← Lógica frontend
```

---

© Todos los derechos reservados - Hecho por Judameal
