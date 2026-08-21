# categorization (Python/FastAPI). Build: docker build -t vertofi/categorization services/categorization
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 4012
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4012"]
