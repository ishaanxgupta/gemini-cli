/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { A2AClientManager } from './a2a-client-manager.js';
import type { AgentCard } from '@a2a-js/sdk';
import { A2AClient } from '@a2a-js/sdk/client';
import { GoogleAuth } from 'google-auth-library';

import type { Config } from '../config/config.js';

vi.mock('@a2a-js/sdk/client', () => {
  const A2AClient = vi.fn();
  Object.assign(A2AClient, { fromCardUrl: vi.fn() });
  A2AClient.prototype.getAgentCard = vi.fn();
  A2AClient.prototype.sendMessage = vi.fn();
  A2AClient.prototype.getTask = vi.fn();
  A2AClient.prototype.cancelTask = vi.fn();
  return { A2AClient };
});

vi.mock('google-auth-library', () => {
  const GoogleAuth = vi.fn();
  GoogleAuth.prototype.getClient = vi.fn();
  // Ensure the instance returned by the constructor uses the prototype method
  GoogleAuth.mockImplementation(() => ({
    getClient: GoogleAuth.prototype.getClient,
  }));
  return { GoogleAuth };
});

describe('A2AClientManager', () => {
  let manager: A2AClientManager;
  const mockAgentCard: Partial<AgentCard> = { name: 'TestAgent' };
  const mockConfig = {
    getDebugMode: vi.fn().mockReturnValue(true),
  } as unknown as Config;

  beforeEach(() => {
    vi.clearAllMocks();
    A2AClientManager.resetInstanceForTesting();
    manager = A2AClientManager.getInstance(mockConfig);
    // Configure prototype spies
    (A2AClient.prototype.getAgentCard as Mock).mockResolvedValue({
      ...mockAgentCard,
      url: 'http://test.agent/real/endpoint',
    });
    (A2AClient.prototype.sendMessage as Mock).mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        kind: 'message',
        messageId: 'a',
        parts: [],
        role: 'agent',
      },
    });
    (A2AClient.prototype.getTask as Mock).mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        id: 'task123',
        contextId: 'a',
        kind: 'task',
        status: { state: 'completed' },
      },
    });
    (A2AClient.prototype.cancelTask as Mock).mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        id: 'task123',
        contextId: 'a',
        kind: 'task',
        status: { state: 'canceled' },
      },
    });

    // Create mock instance using the prototype methods so expectations on prototype work
    const mockClientInstance = {
      getAgentCard: A2AClient.prototype.getAgentCard,
      sendMessage: A2AClient.prototype.sendMessage,
      getTask: A2AClient.prototype.getTask,
      cancelTask: A2AClient.prototype.cancelTask,
    };

    vi.mocked(A2AClient).fromCardUrl.mockResolvedValue(
      mockClientInstance as unknown as A2AClient,
    );

    // Mock global.fetch for ADC tests
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    // Mock GoogleAuth
    (GoogleAuth.prototype.getClient as Mock).mockResolvedValue({
      getAccessToken: vi.fn().mockResolvedValue({ token: 'adc-token' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should enforce the singleton pattern', () => {
    const instance1 = A2AClientManager.getInstance(mockConfig);
    const instance2 = A2AClientManager.getInstance(mockConfig);
    expect(instance1).toBe(instance2);
  });

  describe('loadAgent', () => {
    it('should create and cache an A2AClient', async () => {
      const agentCard = await manager.loadAgent(
        'TestAgent',
        'http://test.agent/card',
      );
      expect(agentCard).toMatchObject(mockAgentCard);
      expect(manager.getAgentCard('TestAgent')).toBe(agentCard);
      expect(manager.getClient('TestAgent')).toBeDefined();
    });

    it('should throw an error if an agent with the same name is already loaded', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent/card');
      await expect(
        manager.loadAgent('TestAgent', 'http://another.agent/card'),
      ).rejects.toThrow("Agent with name 'TestAgent' is already loaded.");
    });

    it('should use ADC token when no access token is provided', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent/card');

      // Extract the fetch implementation from the options passed to fromCardUrl
      const options = vi.mocked(A2AClient).fromCardUrl.mock.calls[0][1]!;

      // Call fetchImpl with a URL that doesn't end in /a2a
      await options.fetchImpl!('https://example.com/some/api', {
        method: undefined, // Default is GET
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCalls = (global.fetch as Mock).mock.calls;
      const [url, init] = fetchCalls[0];
      expect(url).toBe('https://example.com/some/api');
      expect((init.headers as Headers).get('Authorization')).toBe(
        'Bearer adc-token',
      );
    });

    it('should use provided access token and NOT ADC when token is provided', async () => {
      await manager.loadAgent(
        'TestAgent',
        'http://test.agent',
        'provided-token',
      );

      // Extract fetchImpl
      const options = vi.mocked(A2AClient).fromCardUrl.mock.calls[0][1]!;

      // Call fetchImpl
      await options.fetchImpl!('https://example.com/api');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCalls = (global.fetch as Mock).mock.calls;
      const [url, init] = fetchCalls[0];
      expect(url).toBe('https://example.com/api');
      expect((init.headers as Headers).get('Authorization')).toBe(
        'Bearer provided-token',
      );
    });

    it('should strip trailing slash from Agent Card URL when method is undefined (default GET)', async () => {
      // Setup
      const fetchSpy = global.fetch as Mock;
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      });

      // Execute: call createFetchImpl directly (private method)
      const fetchImpl = (
        manager as unknown as {
          createFetchImpl: () => (url: string, init?: unknown) => unknown;
        }
      ).createFetchImpl();
      await fetchImpl('http://test.agent/card/');

      // Verify
      const fetchArgs = fetchSpy.mock.calls[0];
      const url = fetchArgs[0] as string;
      expect(url).toBe('http://test.agent/card'); // Should be stripped
    });
  });

  describe('sendMessage', () => {
    it('should send a message to the correct agent', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent');
      await manager.sendMessage('TestAgent', 'Hello');
      expect(A2AClient.prototype.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.anything(),
        }),
      );
    });

    it('should reuse contextId and taskId provided by the server', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent');

      // Mock first response with new IDs
      (A2AClient.prototype.sendMessage as Mock).mockResolvedValueOnce({
        result: {
          contextId: 'server-context-id',
          id: 'ctx-1',
          kind: 'task',
          status: { state: 'working' },
        },
      });

      // First message
      await manager.sendMessage('TestAgent', 'Hello');

      // Mock second response (continues task)
      (A2AClient.prototype.sendMessage as Mock).mockResolvedValueOnce({
        result: {
          id: 'ctx-1',
          contextId: 'server-context-id',
          status: { state: 'TASK_STATE_WORKING' },
        },
      });

      // Second message
      await manager.sendMessage('TestAgent', 'World');
      const secondCall = (A2AClient.prototype.sendMessage as Mock).mock
        .calls[1][0];

      expect(secondCall.message.contextId).toBe('server-context-id');
      expect(secondCall.message.taskId).toBe('ctx-1');
    });

    it('should rotate taskId upon completion', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent');

      // Mock first response indicating completion
      (A2AClient.prototype.sendMessage as Mock).mockResolvedValue({
        result: {
          id: 'task-1',
          contextId: 'ctx-1',
          status: { state: 'TASK_STATE_COMPLETED' },
        },
      });

      // First message (completes the task)
      await manager.sendMessage('TestAgent', 'Finish this');

      // Second message (should have NEW taskId, but SAME contextId)
      await manager.sendMessage('TestAgent', 'New task');
      const secondCall = (A2AClient.prototype.sendMessage as Mock).mock
        .calls[1][0];

      // taskId should be undefined because we deleted it, ensuring a new one will be generated/requested
      expect(secondCall.message.taskId).toBeUndefined();
      expect(secondCall.message.contextId).toBe('ctx-1');
    });

    it('should throw an error if the agent is not found', async () => {
      await expect(
        manager.sendMessage('NonExistentAgent', 'Hello'),
      ).rejects.toThrow("Agent 'NonExistentAgent' not found.");
    });
  });

  describe('getTask', () => {
    it('should get a task from the correct agent', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent');
      await manager.getTask('TestAgent', 'task123');
      expect(A2AClient.prototype.getTask).toHaveBeenCalledWith({
        id: 'task123',
      });
    });

    it('should throw an error if the agent is not found', async () => {
      await expect(
        manager.getTask('NonExistentAgent', 'task123'),
      ).rejects.toThrow("Agent 'NonExistentAgent' not found.");
    });
  });

  describe('cancelTask', () => {
    it('should cancel a task on the correct agent', async () => {
      await manager.loadAgent('TestAgent', 'http://test.agent');
      await manager.cancelTask('TestAgent', 'task123');
      expect(A2AClient.prototype.cancelTask).toHaveBeenCalledWith({
        id: 'task123',
      });
    });

    it('should throw an error if the agent is not found', async () => {
      await expect(
        manager.cancelTask('NonExistentAgent', 'task123'),
      ).rejects.toThrow("Agent 'NonExistentAgent' not found.");
    });
  });
});
