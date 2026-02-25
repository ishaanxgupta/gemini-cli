import re
import sys

filename = 'packages/core/src/telemetry/metrics.test.ts'

with open(filename, 'r') as f:
    content = f.read()

# Pattern for mockConfig with getTelemetryEnabled: () => true
# Use re.MULTILINE isn't strictly necessary if we match line by line but we are matching against whole content.
# The previous grep showed simple one-liners.

pattern_true = r"(getTelemetryEnabled:\s*\(\)\s*=>\s*true,)"
replacement_true = r"\1\n      getPerformanceMonitoringEnabled: () => true,"

# Pattern for mockConfig with getTelemetryEnabled: () => false
# We want to capture the comment too if present on the same line.
pattern_false = r"(getTelemetryEnabled:\s*\(\)\s*=>\s*false,[^\n]*)"
replacement_false = r"\1\n          getPerformanceMonitoringEnabled: () => false,"

new_content = re.sub(pattern_true, replacement_true, content)
new_content = re.sub(pattern_false, replacement_false, new_content)

if new_content != content:
    with open(filename, 'w') as f:
        f.write(new_content)
    print("Fixed mock configs in metrics.test.ts")
else:
    print("No changes made to metrics.test.ts")
