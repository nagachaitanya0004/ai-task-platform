FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim

RUN adduser --disabled-password --gecos "" workeruser

WORKDIR /app

COPY --from=builder /root/.local /home/workeruser/.local
ENV PATH=/home/workeruser/.local/bin:$PATH

COPY main.py .

RUN chown -R workeruser:workeruser /app /home/workeruser

USER workeruser

CMD ["python", "-u", "main.py"]
