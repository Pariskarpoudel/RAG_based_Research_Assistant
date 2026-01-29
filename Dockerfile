FROM python:3.11-slim
# Set working directory inside container
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Copy the entire project (backend files in root + frontenddd/dist)
COPY . .
# Environment variables
ENV PORT=8000

# Expose the port FastAPI will run on
EXPOSE 8000
CMD ["uvicorn", "app_fastapi:app", "--host", "0.0.0.0", "--port", "8000"]