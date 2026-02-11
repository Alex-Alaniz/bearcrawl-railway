# BearCrawl Railway Deployment

Shared trial agent container for BearCrawl users.

## Services

1. **OpenClaw Gateway** (port 8080) - Main agent runtime
2. **Spawner API** (port 3001) - Agent management HTTP API

## Environment Variables

Required:
- `SETUP_PASSWORD` - Password for /setup wizard
- `SPAWNER_API_TOKEN` - Auth token for spawner API calls
- `DATABASE_URL` - Neon Postgres connection string
- `OPENCLAW_GATEWAY_TOKEN` - Gateway admin token
- `ANTHROPIC_API_KEY` - Claude API key

Optional:
- `BEARCRAWL_DEFAULT_MODEL` - Default model (default: anthropic/claude-sonnet-4-5)
- `BEARCRAWL_AGENTS_DIR` - Agent workspaces directory (default: /data/bearcrawl-agents)

## Railway Setup

1. Create new Railway project
2. Add **Volume** mounted at `/data`
3. Enable **Public Networking** on ports 8080 and 3001
4. Set environment variables
5. Deploy from GitHub (this repo)

## Spawner API Endpoints

- `GET /health` - Health check
- `POST /api/agents/spawn` - Spawn new agent
- `GET /api/agents` - List agents
- `GET /api/agents/:id/status` - Agent status
- `POST /api/agents/:id/message` - Send message to agent
- `DELETE /api/agents/:id` - Delete agent

All endpoints (except /health) require `Authorization: Bearer <SPAWNER_API_TOKEN>` header.

## Local Testing

```bash
# Install dependencies
npm install

# Set env vars
export SPAWNER_API_TOKEN=test-token
export DATABASE_URL=postgresql://...
export ANTHROPIC_API_KEY=sk-...

# Run services
./start.sh
```
