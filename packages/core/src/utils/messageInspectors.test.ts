/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { isFunctionResponse, isFunctionCall } from './messageInspectors';
import type { Content } from '@google/genai';

describe('isFunctionResponse', () => {
  it('should return true when role is user and all parts are function responses', () => {
    const content: Content = {
      role: 'user',
      parts: [
        { functionResponse: { name: 'func1', response: {} } },
        { functionResponse: { name: 'func2', response: {} } },
      ],
    };
    expect(isFunctionResponse(content)).toBe(true);
  });

  it('should return false when role is not user', () => {
    const content: Content = {
      role: 'model',
      parts: [{ functionResponse: { name: 'func1', response: {} } }],
    };
    expect(isFunctionResponse(content)).toBe(false);
  });

  it('should return false when parts are missing', () => {
    const content: Content = {
      role: 'user',
    };
    expect(isFunctionResponse(content)).toBe(false);
  });

  it('should return true when parts array is empty', () => {
    const content: Content = {
      role: 'user',
      parts: [],
    };
    expect(isFunctionResponse(content)).toBe(true);
  });

  it('should return false when some parts are not function responses', () => {
    const content: Content = {
      role: 'user',
      parts: [
        { functionResponse: { name: 'func1', response: {} } },
        { text: 'hello' },
      ],
    };
    expect(isFunctionResponse(content)).toBe(false);
  });
});

describe('isFunctionCall', () => {
  it('should return true when role is model and all parts are function calls', () => {
    const content: Content = {
      role: 'model',
      parts: [
        { functionCall: { name: 'func1', args: {} } },
        { functionCall: { name: 'func2', args: {} } },
      ],
    };
    expect(isFunctionCall(content)).toBe(true);
  });

  it('should return false when role is not model', () => {
    const content: Content = {
      role: 'user',
      parts: [{ functionCall: { name: 'func1', args: {} } }],
    };
    expect(isFunctionCall(content)).toBe(false);
  });

  it('should return false when parts are missing', () => {
    const content: Content = {
      role: 'model',
    };
    expect(isFunctionCall(content)).toBe(false);
  });

  it('should return true when parts array is empty', () => {
     const content: Content = {
      role: 'model',
      parts: [],
    };
    expect(isFunctionCall(content)).toBe(true);
  });

  it('should return false when some parts are not function calls', () => {
    const content: Content = {
      role: 'model',
      parts: [
        { functionCall: { name: 'func1', args: {} } },
        { text: 'hello' },
      ],
    };
    expect(isFunctionCall(content)).toBe(false);
  });
});
