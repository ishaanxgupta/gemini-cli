import sys

filename = 'packages/core/src/telemetry/metrics.ts'

with open(filename, 'r') as f:
    content = f.read()

anchor = """export function initializePerformanceMonitoring(config: Config): void {
  const meter = getMeter();
  if (!meter) return;"""

insertion = """
  console.log('DEBUG: config proto keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(config)));"""

if anchor in content:
    new_content = content.replace(anchor, anchor + insertion)
    with open(filename, 'w') as f:
        f.write(new_content)
    print("Added debug logging to metrics.ts")
else:
    print("Could not find anchor in metrics.ts")
