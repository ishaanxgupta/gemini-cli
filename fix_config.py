import sys

filename = 'packages/core/src/config/config.ts'

with open(filename, 'r') as f:
    content = f.read()

bad_block = """  getTelemetryEnabled(): boolean {
    return this.telemetrySettings.enabled ?? false;

  getPerformanceMonitoringEnabled(): boolean {
    return this.telemetrySettings.performanceMonitoringEnabled ?? this.getTelemetryEnabled();
  }
  }"""

good_block = """  getTelemetryEnabled(): boolean {
    return this.telemetrySettings.enabled ?? false;
  }

  getPerformanceMonitoringEnabled(): boolean {
    return this.telemetrySettings.performanceMonitoringEnabled ?? this.getTelemetryEnabled();
  }"""

if bad_block in content:
    new_content = content.replace(bad_block, good_block)
    with open(filename, 'w') as f:
        f.write(new_content)
    print("Fixed config.ts")
else:
    print("Could not find the bad block to fix")
    # Debug: print surrounding lines if possible, or just fail
    start_idx = content.find("getTelemetryEnabled(): boolean {")
    if start_idx != -1:
        print("Found getTelemetryEnabled start, here is what follows:")
        print(content[start_idx:start_idx+300])
