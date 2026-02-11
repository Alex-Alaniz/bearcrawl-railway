#!/usr/bin/env node
/**
 * BearCrawl Session Spawner Service
 *
 * HTTP API for managing OpenClaw agents on Railway.
 * Consumer agents run on Railway (NOT Mac mini). Mac mini runs only internal Claude CTO.
 * Provides endpoints that the Vercel-hosted bearcrawl-api can call
 * to create, manage, and communicate with user agents.
 * 
 * Uses `openclaw agents add/delete/list` CLI commands (verified against OpenClaw 2026.2.6).
 * 
 * Setup:
 *   npm install express
 *   npx tsx services/session-spawner.ts
 *   (or: node --loader tsx services/session-spawner.ts)
 */

import express from 'express';
import { spawnUserAgent, listAgents, agentExists, sendToAgent, deleteAgent } from '../lib/openclaw-session';

const app = express();
const PORT = process.env.SESSION_SPAWNER_PORT || 3001;
const API_TOKEN = process.env.SPAWNER_API_TOKEN;

app.use(express.json());

// Simple auth middleware
app.use((req, res, next) => {
  if (API_TOKEN && req.path !== '/health') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token !== API_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    service: 'BearCrawl Session Spawner',
    status: 'healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Spawn a new agent
app.post('/api/agents/spawn', async (req, res) => {
  try {
    const { label, userId, email, walletAddress, tier = 'trial' } = req.body;

    if (!label || !userId || !email) {
      return res.status(400).json({ error: 'Missing required fields: label, userId, email' });
    }

    console.log(`🐻 Spawning agent: ${label} (tier: ${tier})`);

    const result = await spawnUserAgent({ userId, email, walletAddress: walletAddress || '', tier, label });

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to spawn agent', details: result.error });
    }

    res.json({
      success: true,
      agentId: result.agentId,
      label: result.label,
      tier,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('💥 Spawn error:', error);
    res.status(500).json({ error: 'Failed to spawn agent', details: error.message });
  }
});

// List agents
app.get('/api/agents', async (_req, res) => {
  try {
    const agents = await listAgents();
    const bearcrawlAgents = agents.filter(a => a.id?.startsWith('bearcrawl-'));
    res.json({ success: true, count: bearcrawlAgents.length, agents: bearcrawlAgents });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list agents', details: error.message });
  }
});

// Check agent status
app.get('/api/agents/:agentId/status', async (req, res) => {
  try {
    const exists = await agentExists(req.params.agentId);
    res.json({ success: true, agentId: req.params.agentId, active: exists });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check agent status', details: error.message });
  }
});

// Send message to agent
app.post('/api/agents/:agentId/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message field' });

    await sendToAgent(req.params.agentId, message);
    res.json({ success: true, agentId: req.params.agentId, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Delete agent
app.delete('/api/agents/:agentId', async (req, res) => {
  try {
    await deleteAgent(req.params.agentId);
    res.json({ success: true, agentId: req.params.agentId });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete agent', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🐻⚡ BearCrawl Session Spawner v2.0');
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Auth: ${API_TOKEN ? 'enabled' : 'disabled (set SPAWNER_API_TOKEN)'}`);
  console.log('Ready to spawn agents! 🚀');
});
