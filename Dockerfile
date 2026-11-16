FROM python:3.12-slim

RUN useradd -m -u 1000 user

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY --chown=user:user backend /app/backend
COPY --chown=user:user ["processes data", "/app/processes data"]
COPY --chown=user:user ["raw data", "/app/raw data"]

USER user
WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
