/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import {
  expandHomeDir,
  getDirectorySuggestions,
} from './directoryUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
const osActual = await vi.importActual<typeof import('node:os')>('node:os');

vi.mock('@google/gemini-cli-core', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@google/gemini-cli-core')>();
  return {
    ...original,
    homedir: () => mockHomeDir,
    loadServerHierarchicalMemory: vi.fn().mockResolvedValue({
      memoryContent: 'mock memory',
      fileCount: 10,
      filePaths: ['/a/b/c.md'],
    }),
  };
});

const mockHomeDir =
  process.platform === 'win32' ? 'C:\\Users\\testuser' : '/home/testuser';

vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof osActual>();
  return {
    ...original,
    homedir: vi.fn(() => mockHomeDir),
  };
});

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    // Keep these mocked just in case, but they shouldn't be called
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };
});

vi.mock('node:fs/promises', () => ({
  opendir: vi.fn(),
  stat: vi.fn(),
}));

interface MockDirent {
  name: string;
  isDirectory: () => boolean;
}

function createMockDir(entries: MockDirent[]) {
  let index = 0;
  const iterator = {
    async next() {
      if (index < entries.length) {
        return { value: entries[index++], done: false };
      }
      return { value: undefined, done: true };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };

  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('directoryUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('expandHomeDir', () => {
    it('should expand ~ to the home directory', () => {
      expect(expandHomeDir('~')).toBe(mockHomeDir);
    });

    it('should expand ~/path to the home directory path', () => {
      const expected = path.join(mockHomeDir, 'Documents');
      expect(expandHomeDir('~/Documents')).toBe(expected);
    });

    it('should expand %userprofile% on Windows', () => {
      if (process.platform === 'win32') {
        const expected = path.join(mockHomeDir, 'Desktop');
        expect(expandHomeDir('%userprofile%\\Desktop')).toBe(expected);
      }
    });

    it('should not change a path that does not need expansion', () => {
      const regularPath = path.join('usr', 'local', 'bin');
      expect(expandHomeDir(regularPath)).toBe(regularPath);
    });

    it('should return an empty string if input is empty', () => {
      expect(expandHomeDir('')).toBe('');
    });
  });

  describe('getDirectorySuggestions', () => {
    it('should return suggestions for an empty path', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: 'docs', isDirectory: () => true },
          { name: 'src', isDirectory: () => true },
          { name: 'file.txt', isDirectory: () => false },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('');
      expect(suggestions).toEqual([`docs${path.sep}`, `src${path.sep}`]);
    });

    it('should return suggestions for a partial path', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: 'docs', isDirectory: () => true },
          { name: 'src', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('d');
      expect(suggestions).toEqual([`docs${path.sep}`]);
    });

    it('should return suggestions for a path with trailing slash', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: 'sub', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('docs/');
      expect(suggestions).toEqual(['docs/sub/']);
    });

    it('should return suggestions for a path with ~', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: 'Downloads', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('~/');
      expect(suggestions).toEqual(['~/Downloads/']);
    });

    it('should return suggestions for a partial path with ~', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: 'Downloads', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('~/Down');
      expect(suggestions).toEqual(['~/Downloads/']);
    });

    it('should return suggestions for ../', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: 'other-project', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('../');
      expect(suggestions).toEqual(['../other-project/']);
    });

    it('should ignore hidden directories', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: '.git', isDirectory: () => true },
          { name: 'src', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('');
      expect(suggestions).toEqual([`src${path.sep}`]);
    });

    it('should show hidden directories when filter starts with .', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir([
          { name: '.git', isDirectory: () => true },
          { name: '.github', isDirectory: () => true },
          { name: '.vscode', isDirectory: () => true },
          { name: 'src', isDirectory: () => true },
        ]) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('.g');
      expect(suggestions).toEqual([`.git${path.sep}`, `.github${path.sep}`]);
    });

    it('should return empty array if directory does not exist', async () => {
      vi.mocked(fsPromises.stat).mockRejectedValue(new Error('ENOENT'));
      const suggestions = await getDirectorySuggestions('nonexistent/');
      expect(suggestions).toEqual([]);
    });

    it('should limit results to 50 suggestions', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);

      // Create 200 directories
      const manyDirs = Array.from({ length: 200 }, (_, i) => ({
        name: `dir${String(i).padStart(3, '0')}`,
        isDirectory: () => true,
      }));

      vi.mocked(fsPromises.opendir).mockResolvedValue(
        createMockDir(manyDirs) as unknown as fs.Dir,
      );

      const suggestions = await getDirectorySuggestions('');
      expect(suggestions).toHaveLength(50);
    });

    it('should terminate early after 150 matches for performance', async () => {
      vi.mocked(fsPromises.stat).mockResolvedValue({
        isDirectory: () => true,
      } as fs.Stats);

      // Create 200 directories
      const manyDirs = Array.from({ length: 200 }, (_, i) => ({
        name: `dir${String(i).padStart(3, '0')}`,
        isDirectory: () => true,
      }));

      const mockDir = createMockDir(manyDirs);
      vi.mocked(fsPromises.opendir).mockResolvedValue(
        mockDir as unknown as fs.Dir,
      );

      await getDirectorySuggestions('');

      // The close method should be called, indicating early termination
      expect(mockDir.close).toHaveBeenCalled();
    });
  });

  describe.skipIf(process.platform !== 'win32')(
    'getDirectorySuggestions (Windows)',
    () => {
      it('should handle %userprofile% expansion', async () => {
        vi.mocked(fsPromises.stat).mockResolvedValue({
          isDirectory: () => true,
        } as fs.Stats);
        vi.mocked(fsPromises.opendir).mockResolvedValue(
          createMockDir([
            { name: 'Documents', isDirectory: () => true },
            { name: 'Downloads', isDirectory: () => true },
          ]) as unknown as fs.Dir,
        );

        expect(await getDirectorySuggestions('%userprofile%\\')).toEqual([
          `%userprofile%\\Documents${path.sep}`,
          `%userprofile%\\Downloads${path.sep}`,
        ]);

        vi.mocked(fsPromises.opendir).mockResolvedValue(
          createMockDir([
            { name: 'Documents', isDirectory: () => true },
            { name: 'Downloads', isDirectory: () => true },
          ]) as unknown as fs.Dir,
        );

        expect(await getDirectorySuggestions('%userprofile%\\Doc')).toEqual([
          `%userprofile%\\Documents${path.sep}`,
        ]);
      });
    },
  );
});
