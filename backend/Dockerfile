# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Final stage
FROM node:20-alpine

# Set non-root user
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

RUN chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["npm", "start"]
