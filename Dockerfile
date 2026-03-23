# BearCrawl Railway Deployment
# OpenClaw Gateway + Spawner Service for shared trial agents

FROM node:22-slim

# Install OpenClaw
RUN npm install -g openclaw@2026.3.13

# Create workspace directories
RUN mkdir -p /data/.openclaw /data/workspace /app
WORKDIR /app

# Copy spawner service files
COPY package.json package-lock.json* ./
COPY services/ ./services/
COPY lib/ ./lib/

# Install dependencies
RUN npm install

# Expose ports
# 8080: OpenClaw Gateway
# 3001: Spawner API
EXPOSE 8080 3001

# Environment defaults
ENV PORT=8080
ENV OPENCLAW_STATE_DIR=/data/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/data/workspace
ENV BEARCRAWL_AGENTS_DIR=/data/bearcrawl-agents
ENV SESSION_SPAWNER_PORT=3001
ENV NODE_ENV=production

# Start script that runs both services
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
