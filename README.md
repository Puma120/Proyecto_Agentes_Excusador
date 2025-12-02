# 🎭 Generador de Excusas Absurdas

Aplicación web interactiva que genera excusas usando IA (Google Gemini 2.0 Flash), desde las más creíbles hasta las más cósmicas e interdimensionales.

## ✨ Características

- **7 Niveles de Absurdidad**: Desde ultra creíble (-1) hasta cósmico (5)
- **Modo Colaborativo**: Juega con otra persona para crear excusas cada vez más absurdas
- **Exportación a .txt**: Guarda tus excusas favoritas con metadatos
- **Historial Persistente**: MongoDB Atlas para almacenar todas las excusas
- **Tiempo Real**: WebSocket para modo colaborativo en vivo

## 🛠️ Stack Tecnológico

### Frontend
- React 19
- Vite
- Socket.IO Client
- CSS Modules

### Backend
- Node.js + Express
- Socket.IO
- MongoDB Atlas + Mongoose
- Google Generative AI (Gemini 2.0 Flash)

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd Creador_Excusas
```

### 2. Instalar dependencias del frontend
```bash
npm install
```

### 3. Instalar dependencias del backend
```bash
cd server
npm install
cd ..
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto servidor:
```bash
cp .env.example server/.env
```

Edita `server/.env` con tus credenciales:
```env
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=tu_api_key_de_gemini
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Crea un archivo `.env.local` en la raíz del proyecto frontend:
```bash
cp .env.local.example .env.local
```

Edita `.env.local`:
```env
VITE_API_URL=http://localhost:3000
```

### 5. Obtener API Key de Google Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API Key
3. Copia la key en tu archivo `.env`

## 🎮 Uso

### Desarrollo Local

En una terminal, inicia el servidor backend:
```bash
cd server
npm run dev
```

En otra terminal, inicia el frontend:
```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`

### Modo Individual
1. Describe tu situación
2. Ajusta el nivel de absurdidad con el slider
3. Opcionalmente añade contexto social
4. ¡Genera tu excusa!
5. Exporta a .txt si lo deseas

### Modo Colaborativo
1. Ingresa tu nombre
2. Crea una sala nueva o únete a una existente
3. Comparte el código de sala con tu amigo
4. ¡Compitan por crear las excusas más absurdas!

## 📊 Arquitectura del Agente IA

### Percepción (Inputs)
- Situación del usuario
- Nivel de absurdidad (-1 a 5)
- Contexto social opcional

### Razonamiento (Procesamiento)
- Prompt estructurado en 3 párrafos
- Ajuste dinámico de temperatura según nivel de absurdidad
- Cada nivel tiene su propio prompt optimizado

### Acción (Outputs)
- Excusa generada y enviada al frontend
- Exportación a .txt con timestamp
- Guardado en MongoDB con metadatos

## 🌐 Deploy en Vercel

### Configuración de Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade:
   - `MONGODB_URI`: Tu connection string de MongoDB Atlas
   - `GEMINI_API_KEY`: Tu API key de Google Gemini
   - `FRONTEND_URL`: Tu URL de producción (ej: https://tu-app.vercel.app)

### Deploy

```bash
vercel
```

O conecta tu repositorio de GitHub con Vercel para deploy automático.

## 📝 Estructura del Proyecto

```
Creador_Excusas/
├── src/
│   ├── components/
│   │   ├── ExcuseGenerator.jsx       # Generador principal
│   │   ├── ExcuseGenerator.css
│   │   ├── CollaborativeMode.jsx     # Modo colaborativo
│   │   ├── CollaborativeMode.css
│   │   ├── ExcuseHistory.jsx         # Historial
│   │   └── ExcuseHistory.css
│   ├── App.jsx                       # Componente principal
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── server/
│   ├── index.js                      # Servidor Express + Socket.IO
│   └── package.json
├── .env.example
├── .env.local.example
├── vercel.json
├── package.json
└── README.md
```

## 🎯 Niveles de Absurdidad

| Nivel | Emoji | Descripción | Temperatura IA |
|-------|-------|-------------|----------------|
| -1 | 😇 | Ultra Creíble | 0.3 |
| 0 | 😊 | Creíble | 0.5 |
| 1 | 🤔 | Improbable | 0.7 |
| 2 | 😄 | Absurdo | 0.9 |
| 3 | 🤪 | Muy Absurdo | 1.1 |
| 4 | 👽 | Ciencia Ficción | 1.3 |
| 5 | 🌌 | Cósmico | 1.5 |

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue primero para discutir los cambios que te gustaría hacer.

## 📄 Licencia

MIT

## 👨‍💻 Autor

Creado con ❤️ y mucha absurdidad

---

**Powered by Google Gemini 2.0 Flash** 🚀

