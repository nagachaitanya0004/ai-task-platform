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

# Shutdown event for graceful termination (ISSUE 5)
shutdown_event = threading.Event()

def handle_shutdown(signum, frame):
    logger.info("Shutdown signal received, finishing current task...")
    shutdown_event.set()

signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)

def wait_for_redis(max_retries=10):
    """Startup retry loop to ensure Redis is available (ISSUE 1)"""
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
    """Startup retry loop to ensure MongoDB is available"""
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
            
        # Append logs using $push and set other fields using $set together (ISSUE 4)
        if log_message:
            update_doc["$push"] = {
                "logs": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "error" if status == "failed" else "info",
                    "message": log_message
                }
            }

        # Convert task_id string to proper ObjectId to prevent silent failures (ISSUE 2)
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
        # Simulate some processing delay
        time.sleep(2)
        
        result = None
        if operation == 'summarize':
            if not input_text:
                raise ValueError("No input text provided for summarize operation")
            result = f"Summary of: {input_text[:50]}..."
            time.sleep(1)
        elif operation == 'analyze':
            if not input_text:
                raise ValueError("No input text provided for analyze operation")
            result = {"sentiment": "positive", "score": 0.95, "text": input_text[:30]}
            time.sleep(1)
        elif operation == 'extract':
            if not input_text:
                raise ValueError("No input text provided for extract operation")
            result = ["Entity1", "Entity2", "Entity3"]
            time.sleep(1)
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

    logger.info(f"Listening for jobs on queue: {QUEUE_NAME}")

    while not shutdown_event.is_set():
        try:
            # BLPOP blocks until an item is available or timeout 
            # 1 second timeout allows us to check shutdown_event periodically
            item = redis_client.blpop(QUEUE_NAME, timeout=1)
            
            if item:
                _, message = item
                logger.info(f"Received message: {message}")
                
                # Prevent silent drops on bad JSON (ISSUE 3)
                try:
                    job = json.loads(message)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in queue: {message}, error: {e}")
                    continue
                
                process_task(db, job)
                
        except redis.RedisError as e:
            logger.error(f"Redis connection error: {e}")
            time.sleep(2)
            # Reconnect automatically
            try:
                redis_client = wait_for_redis(max_retries=3)
            except RuntimeError:
                pass
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}")
            time.sleep(2)

    logger.info("Worker stopped gracefully.")

if __name__ == "__main__":
    main()
