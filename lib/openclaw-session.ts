/**
 * OpenClaw Agent Management
 * 
 * Uses the `openclaw` CLI to create/manage isolated agents for BearCrawl users.
 * 
 * Actual CLI commands (verified against OpenClaw 2026.2.6):
 *   openclaw agents add <name> --workspace <dir> --model <id> --non-interactive --json
 *   openclaw agents list --json
 *   openclaw agents delete <name>
 *   openclaw agent -m "message" --agent <id>
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const exec = promisify(execCallback);

const AGENTS_BASE_DIR = process.env.BEARCRAWL_AGENTS_DIR || '/tmp/bearcrawl-agents';
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || 'openclaw';
const DEFAULT_MODEL = process.env.BEARCRAWL_DEFAULT_MODEL || 'anthropic/claude-sonnet-4-5';

// Tier configuration
const TIER_CONFIG = {
  trial: { model: DEFAULT_MODEL, tools: ['web_search'] },
  cub: { model: DEFAULT_MODEL, tools: ['web_search', 'web_fetch'] },
  grizzly: { model: DEFAULT_MODEL, tools: ['web_search', 'web_fetch', 'exec', 'message'] },
  kodiak: { model: 'anthropic/claude-opus-4-6', tools: ['web_search', 'web_fetch', 'exec', 'message', 'browser', 'nodes'] },
} as const;

type Tier = keyof typeof TIER_CONFIG;

interface AgentSpawnRequest {
  userId: string;
  email: string;
  walletAddress: string;
  tier: Tier;
  label: string;
}

interface AgentSpawnResult {
  agentId: string;
  label: string;
  success: boolean;
  error?: string;
}

interface AgentInfo {
  id: string;
  identityName?: string;
  workspace?: string;
  model?: string;
  isDefault?: boolean;
}

/**
 * Run an openclaw CLI command and return stdout
 */
async function runCli(args: string, timeoutMs = 30000): Promise<string> {
  const { stdout } = await exec(`${OPENCLAW_BIN} ${args}`, {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
  });
  return stdout.trim();
}

/**
 * Create workspace directory and write AGENTS.md for a user's agent
 */
async function createWorkspace(label: string, request: AgentSpawnRequest): Promise<string> {
  const workspaceDir = path.join(AGENTS_BASE_DIR, label);
  await mkdir(workspaceDir, { recursive: true });

  const config = TIER_CONFIG[request.tier] || TIER_CONFIG.trial;

  const agentsMd = `# BearCrawl Agent — ${request.email}

## Identity
- **User:** ${request.email}
- **Tier:** ${request.tier.toUpperCase()}
- **Wallet:** ${request.walletAddress}
- **User ID:** ${request.userId}

## Guidelines
- Be helpful, friendly, and professional
- Never share the user's private information
- Always ask for confirmation before spending money
- Learn from interactions to improve assistance

## Available Tools
${config.tools.map(t => `- ${t}`).join('\n')}
`;

  await writeFile(path.join(workspaceDir, 'AGENTS.md'), agentsMd);
  return workspaceDir;
}

/**
 * Spawn a new isolated OpenClaw agent for a BearCrawl user
 */
export async function spawnUserAgent(request: AgentSpawnRequest): Promise<AgentSpawnResult> {
  try {
    const config = TIER_CONFIG[request.tier] || TIER_CONFIG.trial;

    // 1. Create workspace
    const workspaceDir = await createWorkspace(request.label, request);
    console.log(`✓ Workspace created: ${workspaceDir}`);

    // 2. Create agent via CLI
    const output = await runCli(
      `agents add "${request.label}" --workspace "${workspaceDir}" --model "${config.model}" --non-interactive --json`
    );

    let result: any;
    try {
      result = JSON.parse(output);
    } catch {
      // CLI may not return valid JSON; treat stdout as success indicator
      result = { id: request.label };
    }

    console.log(`✓ Agent created: ${result.id || request.label}`);

    return {
      agentId: result.id || request.label,
      label: request.label,
      success: true,
    };
  } catch (error) {
    console.error('❌ Failed to spawn agent:', error);
    return {
      agentId: '',
      label: request.label,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all OpenClaw agents
 */
export async function listAgents(): Promise<AgentInfo[]> {
  try {
    const output = await runCli('agents list --json');
    return JSON.parse(output);
  } catch {
    return [];
  }
}

/**
 * Check if a specific agent exists and is configured
 */
export async function agentExists(agentId: string): Promise<boolean> {
  const agents = await listAgents();
  return agents.some(a => a.id === agentId);
}

/**
 * Send a message to an agent
 */
export async function sendToAgent(agentId: string, message: string): Promise<void> {
  await runCli(`agent -m "${message.replace(/"/g, '\\"')}" --agent "${agentId}"`);
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  await runCli(`agents delete "${agentId}"`);
}

/**
 * Generate the task/identity text for an agent (used in AGENTS.md)
 */
export function generateAgentTask(request: AgentSpawnRequest): string {
  const config = TIER_CONFIG[request.tier] || TIER_CONFIG.trial;
  return `You are a personal AI assistant for ${request.email} (BearCrawl ${request.tier.toUpperCase()} tier).

Available tools: ${config.tools.join(', ')}

Be helpful, friendly, professional. Never share private info. Ask before spending money.`;
}
