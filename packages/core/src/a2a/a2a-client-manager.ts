/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AgentCard,
  CancelTaskResponse,
  GetTaskResponse,
  MessageSendParams,
  SendMessageResponse,
} from '@a2a-js/sdk';
import { A2AClient, type A2AClientOptions } from '@a2a-js/sdk/client';
import { GoogleAuth } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Config } from '../config/config.js';

// TODO: uncomment
// const AGENT_CARD_WELL_KNOWN_PATH = '/.well-known/agent-card.json';

/**
 * Manages A2A clients and caches loaded agent information.
 * Follows a singleton pattern to ensure a single client instance.
 */
export class A2AClientManager {
  private static instance: A2AClientManager;

  // TODO: Each agent should manage their own context/taskIds/card/etc
  private contextIds = new Map<string, string>();
  private taskIds = new Map<string, string>();
  private clients = new Map<string, A2AClient>();
  private agentCards = new Map<string, AgentCard>();
  private config: Config;

  private auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  private constructor(config: Config) {
    this.config = config;
  }

  /**
   * Gets the singleton instance of the A2AClientManager.
   */
  static getInstance(config?: Config): A2AClientManager {
    if (!A2AClientManager.instance) {
      if (!config) {
        throw new Error('A2AClientManager requires config to be initialized.');
      }
      A2AClientManager.instance = new A2AClientManager(config);
    }
    return A2AClientManager.instance;
  }

  /**
   * Resets the singleton instance. Only for testing purposes.
   * @internal
   */
  static resetInstanceForTesting() {
    // @ts-expect-error - Resetting singleton for testing
    A2AClientManager.instance = undefined;
  }

  private logToFile(level: string, message: string, ...args: unknown[]) {
    if (!this.config.getDebugMode()) {
      return;
    }
    const logFile = path.join(process.cwd(), 'agent_logs');
    const timestamp = new Date().toISOString();
    const formattedArgs = args
      .map((arg) => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      })
      .join(' ');
    const logEntry = `[${timestamp}] [${level}] ${message} ${formattedArgs}\n`;
    try {
      fs.appendFileSync(logFile, logEntry);
    } catch (_e) {
      // Ignore logging errors
    }
  }

  /**
   * Loads an agent by fetching its AgentCard and caches the client.
   * @param name The name to assign to the agent.
   * @param agentCardUrl The base URL (Agent Card URL) of the agent.
   * @param token Optional bearer token for authentication.
   * @returns The loaded AgentCard.
   */
  async loadAgent(
    name: string,
    agentCardUrl: string,
    accessToken?: string,
  ): Promise<AgentCard> {
    if (this.clients.has(name)) {
      throw new Error(`Agent with name '${name}' is already loaded.`);
    }

    // 1. Create the client with options to fetch the Agent Card from the exact URL
    // The user suggested using the input URL directly as the card path.
    // By setting agentCardPath to empty string, we tell the SDK to use the base URL (which we pass as the input URL)
    // to fetch the card, instead of appending a default path.
    const cardOptions: A2AClientOptions = {
      agentCardPath: '',
      fetchImpl: this.createFetchImpl(accessToken),
    };

    const client = await A2AClient.fromCardUrl(agentCardUrl, cardOptions);
    const agentCard = await client.getAgentCard();

    this.logToFile(
      'INFO',
      `Loaded AgentCard for ${name}:`,
      JSON.stringify(agentCard, null, 2),
    );

    this.clients.set(name, client);
    this.agentCards.set(name, agentCard);

    return agentCard;
  }

  /**
   * Sends a message to a loaded agent.
   * @param agentName The name of the agent to send the message to.
   * @param message The message content.
   * @returns The response from the agent.
   */
  async sendMessage(
    agentName: string,
    message: string,
  ): Promise<SendMessageResponse> {
    const client = this.clients.get(agentName);
    if (!client) {
      throw new Error(`Agent '${agentName}' not found.`);
    }

    const contextId = this.contextIds.get(agentName);
    const taskId = this.taskIds.get(agentName);

    const messageParams: MessageSendParams = {
      message: {
        kind: 'message',
        role: 'user',
        messageId: uuidv4(),
        parts: [{ kind: 'text', text: message }],
        contextId,
        taskId,
      },
      configuration: {
        blocking: true,
      },
    };

    this.logToFile(
      'INFO',
      'DEBUG: A2AClientManager.sendMessage params:',
      JSON.stringify(messageParams, null, 2),
    );

    const response = await client.sendMessage(messageParams);

    this.logToFile(
      'INFO',
      'DEBUG: A2AClientManager.sendMessage response:',
      JSON.stringify(response, null, 2),
    );

    // The SDK expects the result to be directly in 'result',
    // but if the service returns { task: ... }, that whole object IS the result.
    // Our fetchImpl hack handles unwrapping, so response.result should be the Task/Message response.
    const result = (response as { result?: unknown }).result as
      | {
          contextId?: string;
          task?: { contextId?: string };
          id?: string;
          status?: { state?: string };
        }
      | undefined;

    if (result) {
      // Capture Context ID from response (Server generates it)
      if (result.contextId) {
        this.contextIds.set(agentName, result.contextId);
      } else if (result.task?.contextId) {
        // Fallback if it's nested in task
        this.contextIds.set(agentName, result.task.contextId);
      }

      // Capture Task ID from response (Server generates it)
      // If it's a Task response, it has an 'id'
      if (result.id) {
        this.taskIds.set(agentName, result.id);
      }

      // Check for task completion to clear the taskId
      if (
        'status' in result &&
        (result.status as { state?: string })?.state === 'TASK_STATE_COMPLETED'
      ) {
        this.taskIds.delete(agentName);
      }
    }

    return response;
  }

  /**
   * Retrieves a loaded agent card.
   * @param name The name of the agent.
   * @returns The agent card, or undefined if not found.
   */
  getAgentCard(name: string): AgentCard | undefined {
    return this.agentCards.get(name);
  }

  /**
   * Retrieves a loaded client.
   * @param name The name of the agent.
   * @returns The client, or undefined if not found.
   */
  getClient(name: string): A2AClient | undefined {
    return this.clients.get(name);
  }

  /**
   * Retrieves a task from an agent.
   * @param agentName The name of the agent.
   * @param taskId The ID of the task to retrieve.
   * @returns The task details.
   */
  async getTask(agentName: string, taskId: string): Promise<GetTaskResponse> {
    const client = this.clients.get(agentName);
    if (!client) {
      throw new Error(`Agent '${agentName}' not found.`);
    }
    return client.getTask({ id: taskId });
  }

  /**
   * Cancels a task on an agent.
   * @param agentName The name of the agent.
   * @param taskId The ID of the task to cancel.
   * @returns The cancellation response.
   */
  async cancelTask(
    agentName: string,
    taskId: string,
  ): Promise<CancelTaskResponse> {
    const client = this.clients.get(agentName);
    if (!client) {
      throw new Error(`Agent '${agentName}' not found.`);
    }
    return client.cancelTask({ id: taskId });
  }

  private createFetchImpl(accessToken?: string) {
    return async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      let urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      // HACK: The A2A SDK appends a trailing slash when agentCardPath is empty string,
      // but the service (Vertex Reasoning Engine) often rejects .../card/ with 501 or 404.
      // We strip it here to match the exact URL provided.
      // Note: init.method is undefined for default GET requests.
      if (
        (!init?.method || init.method === 'GET') &&
        urlStr.endsWith('/card/')
      ) {
        urlStr = urlStr.replace(/\/$/, '');
      }

      // HACK: Protocol Adapter (JSON-RPC -> REST)
      // The A2A SDK behaves as a strict JSON-RPC 2.0 client, sending all requests to
      // the single endpoint defined in AgentCard.url (e.g., .../a2a) with the method
      // inside the JSON body (e.g., { method: "message/send" }).
      //
      // However, the Vertex Reasoning Engine exposes a REST-like API where the method
      // is part of the URL (e.g., .../a2a/v1/message:send).
      //
      // Therefore, we must rewrite the URL and unwrap/wrap the JSON-RPC payload to
      // bridge this gap. This is NOT just a configuration issue; it's a protocol mismatch.
      if (
        init?.method === 'POST' &&
        (urlStr.endsWith('/a2a') || urlStr.endsWith('/a2a/'))
      ) {
        urlStr = urlStr.replace(/\/a2a\/?$/, '/a2a/v1/message:send');
      }

      // HACK: Unwrap JSON-RPC body for Reasoning Engine
      let body = init?.body;
      let originalRequestId: number | string | undefined;

      if (typeof body === 'string' && body.includes('"jsonrpc"')) {
        try {
          const jsonBody = JSON.parse(body);
          originalRequestId = jsonBody.id; // Capture ID for response wrapping

          if (jsonBody.jsonrpc && jsonBody.params && jsonBody.params.message) {
            const message = jsonBody.params.message;

            // 1. Remove 'kind'
            if (message.kind) {
              delete message.kind;
            }

            // 2. Transform role
            if (message.role === 'user') {
              message.role = 'ROLE_USER';
            }

            // 3. Transform parts -> content & Simplify
            if (message.parts) {
              // Map parts to the simpler structure used in the notebook: { text: "..." }
              // avoiding 'kind' field if possible
              message.content = message.parts.map((part: unknown) => {
                const p = part as { kind?: string; text?: string };
                if (p.kind === 'text' && p.text) {
                  return { text: p.text };
                }
                return part;
              });
              delete message.parts;
            }

            body = JSON.stringify(jsonBody.params);
          }
        } catch (e) {
          this.logToFile('ERROR', 'Failed to parse/unwrap JSON-RPC body:', e);
        }
      }

      this.logToFile('INFO', 'A2AClient fetch:', init?.method, urlStr);
      if (body) {
        this.logToFile('INFO', 'A2AClient body:', body);
      }

      const headers = new Headers(init?.headers);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      } else {
        try {
          const client = await this.auth.getClient();
          const token = await client.getAccessToken();
          if (token.token) {
            headers.set('Authorization', `Bearer ${token.token}`);
          }
        } catch (e) {
          this.logToFile('ERROR', 'Failed to get ADC token:', e);
        }
      }
      const newInit = { ...init, headers, body };

      const response = await fetch(urlStr, newInit);

      if (!response.ok) {
        try {
          const errorBody = await response.clone().text();
          this.logToFile(
            'ERROR',
            `A2AClient fetch error response: ${response.status} ${response.statusText}`,
            errorBody,
          );
        } catch (e) {
          this.logToFile('ERROR', 'Failed to read error response body:', e);
        }
      }

      // HACK: Wrap REST response back into JSON-RPC if we unwrapped the request
      if (originalRequestId !== undefined && response.ok) {
        try {
          const responseData = await response.json();
          // The SDK expects the result to be directly in 'result',
          // but if the service returns { task: ... }, that whole object IS the result.
          // Unwrap 'task' if present (Reasoning Engine returns { task: ... }, SDK expects Task object)
          const result = responseData.task ? responseData.task : responseData;
          const wrappedResponse = {
            jsonrpc: '2.0',
            id: originalRequestId,
            result,
          };
          this.logToFile(
            'INFO',
            'A2AClient wrapped response:',
            JSON.stringify(wrappedResponse),
          );

          return new Response(JSON.stringify(wrappedResponse), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch (e) {
          this.logToFile('ERROR', 'Failed to wrap response:', e);
          // If wrapping fails, return original response (it might be consumed already though, so careful)
          // Since we consumed .json(), we can't reuse 'response'.
          // But usually we succeed. If not, the SDK will likely fail anyway.
        }
      }

      return response;
    };
  }
}
