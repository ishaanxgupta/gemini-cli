import sys

filename = 'packages/cli/src/config/settingsSchema.ts'

with open(filename, 'r') as f:
    content = f.read()

anchor = """      enabled: {
        type: 'boolean',
        description: 'Enables telemetry emission.',
      },"""

insertion = """      performanceMonitoringEnabled: {
        type: 'boolean',
        description: 'Enables performance monitoring (defaults to telemetry enabled setting).',
      },"""

if anchor in content:
    new_content = content.replace(anchor, anchor + "\n" + insertion)
    with open(filename, 'w') as f:
        f.write(new_content)
    print("Fixed settingsSchema.ts")
else:
    print("Could not find anchor in settingsSchema.ts")
