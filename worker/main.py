import os
import json
import time
import datetime
from bson.objectid import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import redis

# Configuration
MONGO_URI = os.getenv("MONGO_URI")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Wait for services to be ready
time.sleep(5)

def get_mongo_client():
    client = MongoClient(MONGO_URI)
    return client

def get_redis_client():
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def process_job(job):
    operation = job.get('operation')
    input_text = job.get('inputText', '')
    
    if operation == 'uppercase':
        return input_text.upper()
    elif operation == 'lowercase':
        return input_text.lower()
    elif operation == 'reverse':
        return input_text[::-1]
    elif operation == 'wordcount':
        return str(len(input_text.split()))
    else:
        raise ValueError(f"Unknown operation: {operation}")

def main():
    print("Worker starting up...")
    try:
        mongo_client = get_mongo_client()
        # Ensure database and collection names match backend
        db = mongo_client.get_database() 
        tasks_collection = db.tasks
        
        redis_client = get_redis_client()
        redis_client.ping()
        print("Connected to Redis and MongoDB.")
    except Exception as e:
        print(f"Failed to connect to services: {e}")
        return

    while True:
        try:
            # BRPOP blocks until an item is available or timeout (5 seconds)
            result = redis_client.brpop("task_queue", timeout=5)
            if not result:
                continue
                
            queue_name, item = result
            job = json.loads(item)
            task_id = job.get('taskId')
            
            if not task_id:
                print("Invalid job format, skipping")
                continue

            print(f"Received job for task {task_id}")
            
            start_time = datetime.datetime.utcnow().isoformat()
            
            # Update status to running
            tasks_collection.update_one(
                {'_id': ObjectId(task_id)},
                {
                    '$set': {'status': 'running', 'updatedAt': datetime.datetime.utcnow()},
                    '$push': {'logs': f"Job started at {start_time}"}
                }
            )
            
            try:
                # Process the job
                output = process_job(job)
                
                # Success
                end_time = datetime.datetime.utcnow().isoformat()
                tasks_collection.update_one(
                    {'_id': ObjectId(task_id)},
                    {
                        '$set': {
                            'status': 'success', 
                            'result': output,
                            'updatedAt': datetime.datetime.utcnow()
                        },
                        '$push': {'logs': f"Completed at {end_time}"}
                    }
                )
                print(f"Task {task_id} completed successfully")
                
            except Exception as e:
                # Task failed during processing
                error_time = datetime.datetime.utcnow().isoformat()
                tasks_collection.update_one(
                    {'_id': ObjectId(task_id)},
                    {
                        '$set': {
                            'status': 'failed',
                            'updatedAt': datetime.datetime.utcnow()
                        },
                        '$push': {'logs': f"Failed at {error_time} with error: {str(e)}"}
                    }
                )
                print(f"Task {task_id} failed: {e}")

        except json.JSONDecodeError:
            print("Failed to decode job from queue")
        except PyMongoError as e:
            print(f"MongoDB error: {e}")
        except redis.RedisError as e:
            print(f"Redis error: {e}")
            time.sleep(1) # brief pause on redis errors
        except Exception as e:
            print(f"Unexpected error in worker loop: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
