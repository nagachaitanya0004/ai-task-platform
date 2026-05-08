# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Create a virtual environment and update PATH
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install pinned requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runner
FROM python:3.11-slim

# Create a non-root user
RUN addgroup --system workergroup && adduser --system --group workeruser

WORKDIR /app

# Copy the virtual environment from the builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy the application logic
COPY main.py .

# Transfer ownership to the non-root user
RUN chown -R workeruser:workergroup /app

# Switch to the non-root user
USER workeruser

# Run Python unbuffered so logs flush instantly to stdout
CMD ["python", "-u", "main.py"]
