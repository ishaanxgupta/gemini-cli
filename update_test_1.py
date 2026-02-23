import sys

# Read file
with open('packages/core/src/scheduler/state-manager.test.ts', 'r') as f:
    content = f.read()

# Define the old test block to be replaced
# I'll use a more robust way to match the exact block content to avoid mistakes
old_test_content = """    it('should transition to awaiting_approval with details', () => {
      const call = createValidatingCall();
      stateManager.enqueue([call]);
      stateManager.dequeue();

      const details = {
        type: 'info' as const,
        title: 'Confirm',
        prompt: 'Proceed?',
        onConfirm: vi.fn(),
      };

      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        details,
      );

      const active = stateManager.firstActiveCall as WaitingToolCall;
      expect(active.status).toBe('awaiting_approval');
      expect(active.confirmationDetails).toEqual(details);
    });"""

new_test_content = """    it('should transition to awaiting_approval with details', () => {
      const call = createValidatingCall();
      stateManager.enqueue([call]);
      stateManager.dequeue();

      const details = {
        type: 'info' as const,
        title: 'Confirm',
        prompt: 'Proceed?',
      };

      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        { correlationId: '123', confirmationDetails: details },
      );

      const active = stateManager.firstActiveCall as WaitingToolCall;
      expect(active.status).toBe('awaiting_approval');
      expect(active.confirmationDetails).toEqual(details);
    });"""

if old_test_content in content:
    content = content.replace(old_test_content, new_test_content)
    with open('packages/core/src/scheduler/state-manager.test.ts', 'w') as f:
        f.write(content)
    print("Updated test 'should transition to awaiting_approval with details'.")
else:
    print("Could not find test content exactly. Printing a snippet around expected location.")
    start_idx = content.find("it('should transition to awaiting_approval with details'")
    if start_idx != -1:
        print(content[start_idx:start_idx+500])
    else:
        print("Test name not found.")
