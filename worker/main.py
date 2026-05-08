import os
import time
import json
import signal
import threading
import logging
from datetime import datetime
import redis
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/aitasks')
QUEUE_NAME = 'task_queue'

# Shutdown event for graceful termination
shutdown_event = threading.Event()

def handle_shutdown(signum, frame):
    logger.info("Shutdown signal received, finishing current task...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)

def wait_for_redis(max_retries=10):
    for attempt in range(max_retries):
        try:
            r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            r.ping()
            logger.info("Successfully connected to Redis.")
            return r
        except Exception as e:
            wait = min(2 ** attempt, 30)
            logger.warning(f"Redis not ready (attempt {attempt+1}), retrying in {wait}s: {e}")
            if shutdown_event.is_set():
                raise RuntimeError("Shutdown requested during Redis connection.")
            time.sleep(wait)
    raise RuntimeError("Could not connect to Redis after multiple retries")

def wait_for_mongo(max_retries=10):
    for attempt in range(max_retries):
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            logger.info("Successfully connected to MongoDB.")
            db_name = MONGO_URI.split('/')[-1].split('?')[0]
            if not db_name:
                db_name = 'aitasks'
            return client[db_name]
        except Exception as e:
            wait = min(2 ** attempt, 30)
            logger.warning(f"MongoDB not ready (attempt {attempt+1}), retrying in {wait}s: {e}")
            if shutdown_event.is_set():
                raise RuntimeError("Shutdown requested during MongoDB connection.")
            time.sleep(wait)
    raise RuntimeError("Could not connect to MongoDB after multiple retries")

def update_task(db, task_id, status, result=None, error=None, log_message=None):
    try:
        update_doc = {
            "$set": {
                "status": status,
                "updatedAt": datetime.utcnow()
            }
        }
        
        if result is not None:
            update_doc["$set"]["result"] = result
        if error is not None:
            update_doc["$set"]["error"] = error
            
        if log_message:
            update_doc["$push"] = {
                "logs": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "error" if status == "failed" else "info",
                    "message": log_message
                }
            }

        db.tasks.update_one({"_id": ObjectId(task_id)}, update_doc)
        logger.info(f"Task {task_id} updated to {status}.")
    except Exception as e:
        logger.error(f"Failed to update task {task_id}: {e}")

def process_task(db, job):
    task_id = job.get('taskId')
    operation = job.get('operation')
    input_text = job.get('inputText')

    if not task_id or not operation:
        logger.error("Invalid job payload: missing taskId or operation")
        return

    update_task(db, task_id, "running", log_message=f"Started processing operation: {operation}")

    try:
        # Simulate processing delay
        time.sleep(2)
        
        result = None
        if operation == 'uppercase':
            result = input_text.upper()
        elif operation == 'lowercase':
            result = input_text.lower()
        elif operation == 'reverse':
            result = input_text[::-1]
        elif operation == 'wordcount':
            result = len(input_text.split())
        else:
            raise ValueError(f"Unknown operation: {operation}")

        update_task(db, task_id, "success", result=result, log_message="Task completed successfully")
    except Exception as e:
        logger.error(f"Error processing task {task_id}: {e}")
        update_task(db, task_id, "failed", error=str(e), log_message=f"Task failed with error: {str(e)}")

def main():
    logger.info("Starting AI Task Worker...")
    try:
        redis_client = wait_for_redis()
        db = wait_for_mongo()
    except RuntimeError as e:
        logger.error(str(e))
        return

    while not shutdown_event.is_set():
        try:
            item = redis_client.blpop(QUEUE_NAME, timeout=1)
            if item:
                _, message = item
                try:
                    job = json.loads(message)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON: {e}")
                    continue
                process_task(db, job)
        except redis.RedisError as e:
            logger.error(f"Redis error: {e}")
            time.sleep(2)
            try:
                redis_client = wait_for_redis(max_retries=3)
            except RuntimeError: pass
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(2)

    logger.info("Worker stopped gracefully.")

if __name__ == "__main__":
    main()
