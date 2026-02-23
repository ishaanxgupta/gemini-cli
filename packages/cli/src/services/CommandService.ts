/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '@google/gemini-cli-core';
import type { SlashCommand } from '../ui/commands/types.js';
import type { ICommandLoader } from './types.js';

/**
 * Orchestrates the discovery and loading of all slash commands for the CLI.
 *
 * This service operates on a provider-based loader pattern. It is initialized
 * with an array of `ICommandLoader` instances, each responsible for fetching
 * commands from a specific source (e.g., built-in code, local files).
 *
 * The CommandService is responsible for invoking these loaders, aggregating their
 * results, and resolving any name conflicts. This architecture allows the command
 * system to be extended with new sources without modifying the service itself.
 */

/**
 * Helper to create a lookup map for a list of commands, indexing by name and aliases.
 */
function createLookupMap(commands: readonly SlashCommand[]): Map<string, SlashCommand> {
  const map = new Map<string, SlashCommand>();
  // Pass 1: Names
  for (const cmd of commands) {
    if (!map.has(cmd.name)) {
      map.set(cmd.name, cmd);
    }
  }
  // Pass 2: Aliases
  for (const cmd of commands) {
    if (cmd.altNames) {
      for (const alias of cmd.altNames) {
        if (!map.has(alias)) {
          map.set(alias, cmd);
        }
      }
    }
  }
  return map;
}

export class CommandService {
  /**
   * Private constructor to enforce the use of the async factory.
   * @param commands A readonly array of the fully loaded and de-duplicated commands.
   */
  private constructor(private readonly commands: readonly SlashCommand[], private readonly commandMap: Map<string, SlashCommand>) {}

  /**
   * Asynchronously creates and initializes a new CommandService instance.
   *
   * This factory method orchestrates the entire command loading process. It
   * runs all provided loaders in parallel, aggregates their results, handles
   * name conflicts for extension commands by renaming them, and then returns a
   * fully constructed `CommandService` instance.
   *
   * Conflict resolution:
   * - Extension commands that conflict with existing commands are renamed to
   *   `extensionName.commandName`
   * - Non-extension commands (built-in, user, project) override earlier commands
   *   with the same name based on loader order
   *
   * @param loaders An array of objects that conform to the `ICommandLoader`
   *   interface. Built-in commands should come first, followed by FileCommandLoader.
   * @param signal An AbortSignal to cancel the loading process.
   * @returns A promise that resolves to a new, fully initialized `CommandService` instance.
   */
  static async create(
    loaders: ICommandLoader[],
    signal: AbortSignal,
  ): Promise<CommandService> {
    const results = await Promise.allSettled(
      loaders.map((loader) => loader.loadCommands(signal)),
    );

    const allCommands: SlashCommand[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allCommands.push(...result.value);
      } else {
        debugLogger.debug('A command loader failed:', result.reason);
      }
    }

    const commandMap = new Map<string, SlashCommand>();
    for (const cmd of allCommands) {
      let finalName = cmd.name;

      // Extension commands get renamed if they conflict with existing commands
      if (cmd.extensionName && commandMap.has(cmd.name)) {
        let renamedName = `${cmd.extensionName}.${cmd.name}`;
        let suffix = 1;

        // Keep trying until we find a name that doesn't conflict
        while (commandMap.has(renamedName)) {
          renamedName = `${cmd.extensionName}.${cmd.name}${suffix}`;
          suffix++;
        }

        finalName = renamedName;
      }

      commandMap.set(finalName, {
        ...cmd,
        name: finalName,
      });
    }

    // Recursively enrich commands with subCommandsMap
    const enrichCommand = (cmd: SlashCommand): SlashCommand => {
      let newSubCommands = cmd.subCommands;
      let subMap: Map<string, SlashCommand> | undefined;

      if (cmd.subCommands && cmd.subCommands.length > 0) {
        newSubCommands = cmd.subCommands.map(enrichCommand);
        subMap = createLookupMap(newSubCommands);
      }

      if (subMap) {
        // Return a shallow copy with the map attached
        return { ...cmd, subCommands: newSubCommands, subCommandsMap: subMap };
      }
      return cmd;
    };

    const enrichedCommands = Array.from(commandMap.values()).map(enrichCommand);
    const rootMap = createLookupMap(enrichedCommands);
    const finalCommands = Object.freeze(enrichedCommands);

    return new CommandService(finalCommands, rootMap);
  }

  /**
   * Retrieves the currently loaded and de-duplicated list of slash commands.
   *
   * This method is a safe accessor for the service's state. It returns a
   * readonly array, preventing consumers from modifying the service's internal state.
   *
   * @returns A readonly, unified array of available `SlashCommand` objects.
   */
  getCommands(): readonly SlashCommand[] {
    return this.commands;
  }

  /**
   * Retrieves the lookup map for top-level commands.
   * keys include command names and aliases.
   */
  getCommandMap(): Map<string, SlashCommand> {
    return this.commandMap;
  }
}
