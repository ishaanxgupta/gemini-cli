import sys

with open('packages/cli/src/config/settingsSchema.ts', 'r') as f:
    content = f.read()

snippet = """          enableFuzzySearch: {
            type: 'boolean',
            label: 'Enable Fuzzy Search',
            category: 'Context',
            requiresRestart: true,
            default: true,
            description: 'Enable fuzzy search when searching for files.',
            showInDialog: true,
          },"""

new_snippet = """          ignorePatterns: {
            type: 'array',
            label: 'Ignore Patterns',
            category: 'Context',
            requiresRestart: true,
            default: undefined as string[] | undefined,
            description: 'List of glob patterns to ignore.',
            showInDialog: false,
            items: { type: 'string' },
            mergeStrategy: MergeStrategy.UNION,
          },"""

if 'ignorePatterns:' not in content:
    # Find the insertion point: after enableFuzzySearch block
    idx = content.find(snippet)
    if idx != -1:
        end_idx = idx + len(snippet)
        content = content[:end_idx] + '\n' + new_snippet + content[end_idx:]
    else:
        print("Could not find insertion point")
        sys.exit(1)

with open('packages/cli/src/config/settingsSchema.ts', 'w') as f:
    f.write(content)
