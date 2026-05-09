#!/bin/bash
set -e
BASE=http://localhost:5000

echo "=== Testing Health ==="
curl -sf $BASE/api/health | jq .

echo "=== Testing Register ==="
REGISTER=$(curl -sf -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Password123"}')
echo $REGISTER | jq .
TOKEN=$(echo $REGISTER | jq -r '.token')

echo "=== Testing Login ==="
LOGIN=$(curl -sf -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}')
TOKEN=$(echo $LOGIN | jq -r '.token')
echo "Token: $TOKEN"

echo "=== Creating Task ==="
TASK=$(curl -sf -X POST $BASE/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Task","inputText":"hello world","operation":"uppercase"}')
TASK_ID=$(echo $TASK | jq -r '._id')
echo "Task ID: $TASK_ID"

echo "=== Waiting for worker to process ==="
sleep 5

echo "=== Checking Task Result ==="
curl -sf $BASE/api/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{status: .status, result: .result, logs: .logs}'

echo "=== ALL TESTS PASSED ==="
