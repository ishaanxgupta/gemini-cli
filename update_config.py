import sys

with open('packages/core/src/config/config.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if 'searchTimeout?: number;' in line and 'ConfigParameters' in lines[max(0, i-20)]:
             # Check if ignorePatterns is already there to avoid duplication if run multiple times
             if i+1 < len(lines) and 'ignorePatterns' in lines[i+1]: continue
             new_lines.append('    ignorePatterns?: string[];\n')
    elif 'searchTimeout: number;' in line and 'class Config' in ''.join(lines[max(0, i-200):i]): # Context for class Config is far up
             if i+1 < len(lines) and 'ignorePatterns' in lines[i+1]: continue
             new_lines.append('    ignorePatterns: string[];\n')
    elif 'DEFAULT_FILE_FILTERING_OPTIONS.searchTimeout ??' in line:
             # The next line is likely the value (5000,)
             pass # Handled by finding the line with 5000, inside the context of constructor
    elif 'getFileExclusions(): FileExclusions {' in line:
             if 'getCustomExcludes' in lines[i-1]: continue
             # Insert method before getFileExclusions
             new_lines.insert(-1, '  getCustomExcludes(): string[] {\n    return this.fileFiltering.ignorePatterns;\n  }\n\n')

# Handling the constructor initialization part is tricky with simple line iteration because '5000,' is ambiguous.
# Let's verify the constructor part separately or use a more robust search.

# Re-reading to apply specific logic for constructor
with open('packages/core/src/config/config.ts', 'r') as f:
    content = f.read()

# 1. ConfigParameters
if 'ignorePatterns?: string[];' not in content:
    content = content.replace('searchTimeout?: number;', 'searchTimeout?: number;\n    ignorePatterns?: string[];', 1)

# 2. Config class properties (need to be careful not to match interface again if same string)
# The interface one has 'searchTimeout?: number;'
# The class one has 'searchTimeout: number;' (no question mark)
if 'ignorePatterns: string[];' not in content:
    content = content.replace('searchTimeout: number;', 'searchTimeout: number;\n    ignorePatterns: string[];', 1)

# 3. Constructor
if 'ignorePatterns: params.fileFiltering?.ignorePatterns ?? [],' not in content:
    # Look for the block
    search_str = 'DEFAULT_FILE_FILTERING_OPTIONS.searchTimeout ??'
    # Find the occurrence in the constructor
    # It is followed by a line with value and comma
    import re
    # We want to insert after the searchTimeout value line
    # The pattern is: searchTimeout: ... DEFAULT ... ?? ... value,
    # But it spans multiple lines.

    # We can search for the closing brace of fileFiltering object in constructor?
    # It looks like:
    #       searchTimeout:
    #         params.fileFiltering?.searchTimeout ??
    #         DEFAULT_FILE_FILTERING_OPTIONS.searchTimeout ??
    #         5000,
    #     };

    # We can replace '5000,' with '5000,\n      ignorePatterns: params.fileFiltering?.ignorePatterns ?? [],'
    # But 5000 might appear elsewhere.
    # The context is key.

    snippet = 'DEFAULT_FILE_FILTERING_OPTIONS.searchTimeout ??'
    idx = content.find(snippet)
    if idx != -1:
        # Find the next comma
        comma_idx = content.find(',', idx)
        if comma_idx != -1:
             # Insert after the comma
             content = content[:comma_idx+1] + '\n      ignorePatterns: params.fileFiltering?.ignorePatterns ?? [],' + content[comma_idx+1:]

# 4. Method
if 'getCustomExcludes(): string[]' not in content:
    content = content.replace('getFileExclusions(): FileExclusions {', 'getCustomExcludes(): string[] {\n    return this.fileFiltering.ignorePatterns;\n  }\n\n  getFileExclusions(): FileExclusions {')

with open('packages/core/src/config/config.ts', 'w') as f:
    f.write(content)
