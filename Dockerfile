# --- Frontend Build ---
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Backend & Final Image ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies for OpenCV and audio
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend to backend static files (or serve separately)
# For a robust single-container setup, we serve the built frontend via FastAPI or Nginx
COPY --from=frontend-build /app/dist ./static

# Copy backend code
COPY backend ./backend

# Environment variables
ENV PORT=8000
EXPOSE 8000

# Start command
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
