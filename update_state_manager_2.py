import sys

with open('packages/core/src/scheduler/state-manager.ts', 'r') as f:
    content = f.read()

# Replace type definition
old_type_def = """    let confirmationDetails:
      | ToolCallConfirmationDetails
      | SerializableConfirmationDetails;"""

new_type_def = """    let confirmationDetails: SerializableConfirmationDetails;"""

# Replace logic block
old_logic_block = """    if (this.isEventDrivenApprovalData(data)) {
      correlationId = data.correlationId;
      confirmationDetails = data.confirmationDetails;
    } else {
      // TODO: Remove legacy callback shape once event-driven migration is complete
      confirmationDetails = data as ToolCallConfirmationDetails;
    }"""

new_logic_block = """    if (!this.isEventDrivenApprovalData(data)) {
      throw new Error(
        `Invalid data for 'awaiting_approval' transition (callId: ${call.request.callId})`,
      );
    }
    correlationId = data.correlationId;
    confirmationDetails = data.confirmationDetails;"""

updated = False
if old_type_def in content:
    content = content.replace(old_type_def, new_type_def)
    print("Updated type definition.")
    updated = True
else:
    print("Could not find type definition block.")

if old_logic_block in content:
    content = content.replace(old_logic_block, new_logic_block)
    print("Updated logic block.")
    updated = True
else:
    print("Could not find logic block.")

if updated:
    with open('packages/core/src/scheduler/state-manager.ts', 'w') as f:
        f.write(content)
