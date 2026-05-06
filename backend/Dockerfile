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

CMD ["npm", "start"]
