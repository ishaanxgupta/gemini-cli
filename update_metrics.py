import sys

filename = 'packages/core/src/telemetry/metrics.ts'

with open(filename, 'r') as f:
    content = f.read()

old_block = """  // Check if performance monitoring is enabled in config
  // For now, enable performance monitoring when telemetry is enabled
  // TODO: Add specific performance monitoring settings to config
  isPerformanceMonitoringEnabled = config.getTelemetryEnabled();"""

new_block = """  // Check if performance monitoring is enabled in config
  isPerformanceMonitoringEnabled = config.getPerformanceMonitoringEnabled();"""

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(filename, 'w') as f:
        f.write(new_content)
    print("Fixed metrics.ts")
else:
    print("Could not find the block in metrics.ts")
