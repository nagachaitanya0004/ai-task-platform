# AI Task Platform

A production-grade MERN + Python worker monorepo.

## Components
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Worker**: Python 3.11
- **Databases**: MongoDB and Redis

## Running the Application
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Start all services using Docker Compose:
   ```bash
   docker-compose up --build
   ```
3. Access the Frontend at `http://localhost:80`
4. Access the Backend API at `http://localhost:5000`
