FROM python:3.10.19

# Install system dependencies for OpenCV and unstructured
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside container
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project (backend files in root + frontenddd/dist)
COPY . .

# Environment variables
ENV PORT=8000

# Expose the port FastAPI will run on
EXPOSE 8000

CMD ["uvicorn", "app_fastapi:app", "--host", "0.0.0.0", "--port", "8000"]