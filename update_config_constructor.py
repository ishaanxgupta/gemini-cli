import sys

filename = 'packages/core/src/config/config.ts'

with open(filename, 'r') as f:
    content = f.read()

anchor = """    this.telemetrySettings = {
      enabled: params.telemetry?.enabled ?? false,"""

insertion = """      performanceMonitoringEnabled: params.telemetry?.performanceMonitoringEnabled,"""

if anchor in content:
    new_content = content.replace(anchor, anchor + "\n" + insertion)
    with open(filename, 'w') as f:
        f.write(new_content)
    print("Fixed constructor in config.ts")
else:
    print("Could not find anchor in config.ts")
