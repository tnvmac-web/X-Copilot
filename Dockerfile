FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BINARI_AUTH_SECRET=binari-production-secret \
    XCOPILOT_ADMIN_USERNAME=admin \
    XCOPILOT_ADMIN_PASSWORD=admin

COPY pyproject.toml README.md LICENSE ./
COPY src ./src
COPY server ./server

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').read()" || exit 1

ENTRYPOINT ["xcopilot"]
CMD ["serve", "--host", "0.0.0.0", "--port", "8000"]
