import re

filepath = 'packages/core/src/scheduler/confirmation.test.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Replace all instances of "confirmed: true," with "confirmed: true,\n        outcome: ToolConfirmationOutcome.ProceedOnce,"
# BUT only if outcome is not already there.
# It seems the regex approach might be tricky if not careful.
# Let's look at the specific calls.

# Case 1: awaitConfirmation test
content = content.replace(
    """      emitResponse({
        type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
        correlationId,
        confirmed: true,
      });""",
    """      emitResponse({
        type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
        correlationId,
        confirmed: true,
        outcome: ToolConfirmationOutcome.ProceedOnce,
      });"""
)

# Case 2: resolveConfirmation (ProceedOnce)
# Note: The correlation ID is hardcoded in the test file I read.
content = content.replace(
    """      emitResponse({
        type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
        correlationId: '123e4567-e89b-12d3-a456-426614174000',
        confirmed: true,
      });""",
    """      emitResponse({
        type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
        correlationId: '123e4567-e89b-12d3-a456-426614174000',
        confirmed: true,
        outcome: ToolConfirmationOutcome.ProceedOnce,
      });"""
)

# The replace above will handle multiple occurrences if they are identical.
# Let's check if the strings match exactly what I read.
# In 'fire hooks if enabled' test:
#       emitResponse({
#         type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
#         correlationId: '123e4567-e89b-12d3-a456-426614174000',
#         confirmed: true,
#       });
# This is identical to the one in 'should return ProceedOnce after successful user confirmation'.
# So one replace call should cover both.

with open(filepath, 'w') as f:
    f.write(content)

print("Updated confirmation.test.ts")
