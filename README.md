# PartituraAI — Sistema Inteligente de Aprendizaje de Piano

**PartituraAI** es una plataforma de vanguardia que utiliza Inteligencia Artificial para transformar partituras musicales (imágenes, PDF o MIDI) en una experiencia de aprendizaje interactiva. Inspirada en herramientas como Synthesia, pero con el poder del Reconocimiento Óptico de Música (OMR), permite a cualquier persona aprender piano sin necesidad de conocimientos profundos en lectura musical tradicional.

---

## 🚀 Características Principales

### 1. Análisis Inteligente de Partituras (OMR)
*   Sube fotos de tus partituras en formato **JPG, PNG o PDF**.
*   Procesamiento de imagen avanzado con **OpenCV** para mejorar contraste y eliminar ruido.
*   Detección automática de notas, compases, claves y tempo mediante el motor de IA en el backend.

### 2. Visualización Estilo Synthesia
*   Interfaz de piano virtual de **88 teclas** con efectos de iluminación y "glow" premium.
*   Caída de notas en tiempo real sincronizada con el audio.
*   Indicadores visuales de **digitación sugerida** y separación por manos (Derecha/Izquierda).

### 3. Herramientas de Práctica Robustas
*   **Modo Manos**: Practica solo la mano derecha, solo la izquierda o ambas.
*   **Control de Velocidad**: Ralentiza la pieza (hasta 0.25x) para aprender secciones difíciles.
*   **Bucle (Loop)**: Repite secciones específicas automáticamente.
*   **Audio Real**: Sonido de piano de alta calidad utilizando muestras reales del piano *Salamander*.

---

## 🛠️ Stack Tecnológico

### Frontend
*   **React 19 + TypeScript** (Vite)
*   **Zustand**: Gestión de estado robusta.
*   **Tone.js**: Motor de audio profesional para la web.
*   **HTML5 Canvas**: Renderizado fluido de 60fps para las notas cayendo.
*   **Lucide React**: Iconografía moderna.

### Backend
*   **Python 3.12 + FastAPI**: API asíncrona de alto rendimiento.
*   **OpenCV**: Visión computacional para preprocesamiento de imágenes.
*   **music21**: Kit de herramientas para análisis musical y manipulación de archivos MIDI/MusicXML.
*   **Pillow / NumPy / SciPy**: Procesamiento de datos y señales.

### Infraestructura
*   **Docker**: Contenerización completa para despliegue simplificado.
*   **GitHub Actions**: Preparado para CI/CD.

---

## 📦 Instalación y Uso

### Prerrequisitos
*   Node.js 20+
*   Python 3.12+

### Configuración del Backend
```bash
# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor (puerto 8000)
python -m uvicorn backend.main:app --reload
```

### Configuración del Frontend
```bash
# Instalar dependencias
npm install

# Iniciar entorno de desarrollo
npm run dev
```

### Uso de Docker
```bash
docker build -t partitura-ai .
docker run -p 8000:8000 partitura-ai
```

---

## 🛣️ Hoja de Ruta (Roadmap)
*   [ ] Integración completa con modelos OMR basados en Deep Learning (Oemer/Audiveris).
*   [ ] Conexión MIDI USB para detección de errores del usuario en tiempo real.
*   [ ] Sistema de gamificación y seguimiento de progreso.
*   [ ] Generación automática de ejercicios basados en la dificultad de la partitura.

---

Desarrollado con ❤️ para músicos y aprendices.
