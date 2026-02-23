/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { isApiError, isStructuredError } from './quotaErrorDetection.js';

describe('quotaErrorDetection', () => {
  describe('isApiError', () => {
    it('should return true for a valid ApiError object', () => {
      const error = {
        error: {
          code: 429,
          message: 'Quota exceeded',
          status: 'RESOURCE_EXHAUSTED',
          details: [],
        },
      };
      expect(isApiError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiError(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isApiError('error')).toBe(false);
      expect(isApiError(123)).toBe(false);
      expect(isApiError(true)).toBe(false);
    });

    it('should return false if "error" property is missing', () => {
      expect(isApiError({})).toBe(false);
      expect(isApiError({ other: {} })).toBe(false);
    });

    it('should return false if "error" property is not an object', () => {
      expect(isApiError({ error: 'not an object' })).toBe(false);
      expect(isApiError({ error: 123 })).toBe(false);
    });

    it('should return false if "error" property is null', () => {
      // This test case is expected to crash the current implementation
      expect(isApiError({ error: null })).toBe(false);
    });

    it('should return false if "message" property is missing in nested error object', () => {
      expect(isApiError({ error: { code: 429 } })).toBe(false);
    });

    it('should return true if minimum required properties are present', () => {
      expect(isApiError({ error: { message: 'some error' } })).toBe(true);
    });
  });

  describe('isStructuredError', () => {
    it('should return true for a valid StructuredError object', () => {
      const error = {
        message: 'Something went wrong',
        status: 500,
      };
      expect(isStructuredError(error)).toBe(true);
    });

    it('should return true for a StructuredError with only message', () => {
      const error = {
        message: 'Something went wrong',
      };
      expect(isStructuredError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isStructuredError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isStructuredError(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isStructuredError('error')).toBe(false);
      expect(isStructuredError(123)).toBe(false);
    });

    it('should return false if "message" property is missing', () => {
      expect(isStructuredError({})).toBe(false);
      expect(isStructuredError({ status: 500 })).toBe(false);
    });

    it('should return false if "message" property is not a string', () => {
      expect(isStructuredError({ message: 123 })).toBe(false);
      expect(isStructuredError({ message: {} })).toBe(false);
    });
  });
});
