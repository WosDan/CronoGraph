FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CRONOGRAPH_DB_DIR=/data

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt && python -c "from ortools.sat.python import cp_model; print('CP-SAT disponible')"

COPY backend ./backend
COPY DB ./DB

EXPOSE 8000

CMD ["sh", "-c", "mkdir -p \"$CRONOGRAPH_DB_DIR\" && if [ ! -f \"$CRONOGRAPH_DB_DIR/simulacion_academica.json\" ]; then cp /app/DB/simulacion_academica.json \"$CRONOGRAPH_DB_DIR/simulacion_academica.json\"; fi && exec uvicorn app.main:app --app-dir /app/backend --host 0.0.0.0 --port ${PORT:-8000}"]
