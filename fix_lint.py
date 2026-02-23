import sys

with open('packages/core/src/scheduler/state-manager.ts', 'r') as f:
    content = f.read()

old_block = """    let confirmationDetails: SerializableConfirmationDetails;
    let correlationId: string | undefined;

    if (!this.isEventDrivenApprovalData(data)) {
      throw new Error(
        `Invalid data for 'awaiting_approval' transition (callId: ${call.request.callId})`,
      );
    }
    correlationId = data.correlationId;
    confirmationDetails = data.confirmationDetails;"""

new_block = """    if (!this.isEventDrivenApprovalData(data)) {
      throw new Error(
        `Invalid data for 'awaiting_approval' transition (callId: ${call.request.callId})`,
      );
    }
    const { correlationId, confirmationDetails } = data;"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('packages/core/src/scheduler/state-manager.ts', 'w') as f:
        f.write(content)
    print("Fixed lint issue.")
else:
    print("Could not find block.")
