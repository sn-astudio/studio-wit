# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 의존성 설치 (캐싱 활용을 위해 먼저 복사)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 전체 소스 복사
COPY . .

# FastAPI 실행 (8000번 포트)
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]