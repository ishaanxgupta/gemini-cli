import os

filepath = 'packages/core/src/test-utils/mock-message-bus.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Add import
if "import { ToolConfirmationOutcome } from '../tools/tools.js';" not in content:
    content = content.replace(
        "import { MessageBusType, type Message } from '../confirmation-bus/types.js';",
        "import { MessageBusType, type Message } from '../confirmation-bus/types.js';\nimport { ToolConfirmationOutcome } from '../tools/tools.js';"
    )

# Update allow case
content = content.replace(
    "confirmed: true,",
    "confirmed: true,\n          outcome: ToolConfirmationOutcome.ProceedOnce,"
)

# Update deny case
# We need to be careful because 'confirmed: false' appears in both deny and ask_user cases.
# But in deny case, it doesn't have requiresUserConfirmation.

if "confirmed: false," in content:
    # This is a bit tricky with simple replace. Let's use more context.

    # Deny case
    content = content.replace(
        """      } else if (this.defaultToolDecision === 'deny') {
        this.emit(MessageBusType.TOOL_CONFIRMATION_RESPONSE, {
          type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
          correlationId: message.correlationId,
          confirmed: false,
        });""",
        """      } else if (this.defaultToolDecision === 'deny') {
        this.emit(MessageBusType.TOOL_CONFIRMATION_RESPONSE, {
          type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
          correlationId: message.correlationId,
          confirmed: false,
          outcome: ToolConfirmationOutcome.Cancel,
        });"""
    )

with open(filepath, 'w') as f:
    f.write(content)

print("Updated mock-message-bus.ts")
