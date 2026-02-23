import sys

with open('packages/core/src/scheduler/state-manager.ts', 'r') as f:
    content = f.read()

old_block = """    data:
      | ToolCallConfirmationDetails
      | {
          correlationId: string;
          confirmationDetails: SerializableConfirmationDetails;
        },"""

new_block = """    data: {
      correlationId: string;
      confirmationDetails: SerializableConfirmationDetails;
    },"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('packages/core/src/scheduler/state-manager.ts', 'w') as f:
        f.write(content)
    print("Successfully updated updateStatus signature.")
else:
    print("Could not find the block to replace.")
    # Print a snippet to see why it failed
    start = content.find("updateStatus(")
    if start != -1:
        print("Snippet found around updateStatus:")
        print(content[start:start+300])
