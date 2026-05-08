import os
import json
import logging
import signal
import threading
import time
import traceback
import uuid
from datetime import datetime, timezone
from bson.objectid import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import redis


# Configuration
MONGO_URI = os.getenv("MONGO_URI")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
WORKER_CONCURRENCY = int(os.getenv("WORKER_CONCURRENCY", "1"))

WORKER_ID = str(uuid.uuid4())
SHUTDOWN_EVENT = threading.Event()


class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "task_id": getattr(record, "task_id", None),
            "message": record.getMessage(),
            "worker_id": WORKER_ID,
        }
        return json.dumps(log_obj)


def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    return logger


logger = setup_logging()


def get_mongo_client():
    return MongoClient(MONGO_URI, maxPoolSize=10)


def get_redis_client():
    return redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_keepalive=True,
    )


def get_task(mongo_db, task_id):
    try:
        return mongo_db.tasks.find_one({"_id": ObjectId(task_id)})
    except Exception:
        return None


def update_task(mongo_db, task_id, **fields):
    try:
        update_doc = {"$set": {**fields, "updatedAt": datetime.now(timezone.utc)}}
        if "log_message" in fields:
            log_msg = fields.pop("log_message")
            update_doc["$push"] = {"logs": log_msg}
        mongo_db.tasks.update_one({"_id": ObjectId(task_id)}, update_doc)
    except Exception as e:
        logger.error(f"Failed to update task {task_id}: {e}", extra={"task_id": task_id})


def process_task(mongo_db, job):
    task_id = job.get("taskId")
    operation = job.get("operation")
    input_text = job.get("inputText", "")

    logger_with_task = logging.LoggerAdapter(logger, {"task_id": task_id})

    # Validate operation
    valid_ops = {"uppercase", "lowercase", "reverse", "wordcount"}
    if operation not in valid_ops:
        logger_with_task.error(f"Invalid operation: {operation}")
        update_task(
            mongo_db,
            task_id,
            status="failed",
            log_message=f"Invalid operation: {operation}",
        )
        return

    # Update to running
    start_time = datetime.now(timezone.utc)
    update_task(
        mongo_db,
        task_id,
        status="running",
        log_message=f"Worker {WORKER_ID} picked up task at {start_time.isoformat()}",
    )

    try:
        # Execute operation
        if operation == "uppercase":
            result = input_text.upper()
        elif operation == "lowercase":
            result = input_text.lower()
        elif operation == "reverse":
            result = "".join(reversed(input_text))
        elif operation == "wordcount":
            result = f"{len(input_text.split())} words"

        elapsed_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        update_task(
            mongo_db,
            task_id,
            status="success",
            result=result,
            log_message=f"Completed in {elapsed_ms:.0f}ms",
        )
        logger_with_task.info(f"Task completed successfully")

    except Exception as e:
        tb_str = traceback.format_exc()
        update_task(
            mongo_db,
            task_id,
            status="failed",
            log_message=tb_str,
        )
        logger_with_task.error(f"Task failed: {tb_str}")


def connect_redis_with_backoff():
    backoff_times = [1, 2, 4, 8, 16, 30]
    attempt = 0
    while not SHUTDOWN_EVENT.is_set():
        try:
            client = get_redis_client()
            client.ping()
            logger.info("Connected to Redis", extra={"task_id": None})
            return client
        except Exception as e:
            wait_time = backoff_times[min(attempt, len(backoff_times) - 1)]
            logger.error(
                f"Redis connection failed, retrying in {wait_time}s: {e}",
                extra={"task_id": None},
            )
            time.sleep(wait_time)
            attempt += 1


def signal_handler(signum, frame):
    logger.info("Shutdown signal received", extra={"task_id": None})
    SHUTDOWN_EVENT.set()


def main():
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    logger.info("Worker started, listening on task_queue", extra={"task_id": None})

    mongo_client = get_mongo_client()
    mongo_db = mongo_client.get_database()

    redis_client = connect_redis_with_backoff()

    while not SHUTDOWN_EVENT.is_set():
        try:
            result = redis_client.brpop("task_queue", timeout=5)
            if not result:
                continue

            _, item = result
            job = json.loads(item)
            task_id = job.get("taskId")

            if not task_id:
                logger.error("Invalid job format, skipping", extra={"task_id": None})
                continue

            process_task(mongo_db, job)

        except redis.ConnectionError:
            logger.error("Redis connection lost", extra={"task_id": None})
            redis_client = connect_redis_with_backoff()
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode job: {e}", extra={"task_id": None})
        except PyMongoError as e:
            logger.error(f"MongoDB error: {e}", extra={"task_id": None})
        except Exception as e:
            logger.error(f"Unexpected error: {e}", extra={"task_id": None})

    logger.info("Worker shutdown complete", extra={"task_id": None})
    mongo_client.close()
    redis_client.close()


if __name__ == "__main__":
    main()
