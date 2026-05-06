# Builder stage
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r worker && useradd -r -g worker worker

WORKDIR /app

# Copy installed dependencies
COPY --from=builder /root/.local /home/worker/.local
# Make sure scripts in .local are usable:
ENV PATH=/home/worker/.local/bin:$PATH

COPY main.py .

RUN chown -R worker:worker /app /home/worker

USER worker

# No shell by using json array syntax
CMD ["python", "main.py"]
