import sys

with open('packages/core/src/scheduler/state-manager.ts', 'r') as f:
    content = f.read()

# Replace updateStatus signature
old_signature = """  updateStatus(
    callId: string,
    status: 'awaiting_approval',
    data:
      | ToolCallConfirmationDetails
      | {
          correlationId: string;
          confirmationDetails: SerializableConfirmationDetails;
        },
  ): void;"""

new_signature = """  updateStatus(
    callId: string,
    status: 'awaiting_approval',
    data: {
      correlationId: string;
      confirmationDetails: SerializableConfirmationDetails;
    },
  ): void;"""

content = content.replace(old_signature, new_signature)

# Replace toAwaitingApproval logic
old_logic = """    let confirmationDetails:
      | ToolCallConfirmationDetails
      | SerializableConfirmationDetails;
    let correlationId: string | undefined;

    if (this.isEventDrivenApprovalData(data)) {
      correlationId = data.correlationId;
      confirmationDetails = data.confirmationDetails;
    } else {
      // TODO: Remove legacy callback shape once event-driven migration is complete
      confirmationDetails = data as ToolCallConfirmationDetails;
    }

    return {
      request: call.request,
      tool: call.tool,
      status: 'awaiting_approval',
      correlationId,
      confirmationDetails,
      startTime: 'startTime' in call ? call.startTime : undefined,
      outcome: call.outcome,
      invocation: call.invocation,
    };"""

new_logic = """    if (!this.isEventDrivenApprovalData(data)) {
      throw new Error(
        `Invalid data for 'awaiting_approval' transition (callId: ${call.request.callId})`,
      );
    }

    return {
      request: call.request,
      tool: call.tool,
      status: 'awaiting_approval',
      correlationId: data.correlationId,
      confirmationDetails: data.confirmationDetails,
      startTime: 'startTime' in call ? call.startTime : undefined,
      outcome: call.outcome,
      invocation: call.invocation,
    };"""

content = content.replace(old_logic, new_logic)

with open('packages/core/src/scheduler/state-manager.ts', 'w') as f:
    f.write(content)

print("Successfully updated packages/core/src/scheduler/state-manager.ts")
