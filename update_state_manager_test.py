import sys

with open('packages/core/src/scheduler/state-manager.test.ts', 'r') as f:
    content = f.read()

# Update 'should transition to awaiting_approval with details'
old_test_1 = """      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        details,
      );

      const active = stateManager.firstActiveCall as WaitingToolCall;
      expect(active.status).toBe('awaiting_approval');
      expect(active.confirmationDetails).toEqual(details);"""

new_test_1 = """      const correlationId = 'test-correlation-id';
      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        {
          correlationId,
          confirmationDetails: details,
        },
      );

      const active = stateManager.firstActiveCall as WaitingToolCall;
      expect(active.status).toBe('awaiting_approval');
      expect(active.confirmationDetails).toEqual(details);
      expect(active.correlationId).toBe(correlationId);"""

content = content.replace(old_test_1, new_test_1)

# Update 'should preserve diff when cancelling an edit tool call'
old_test_2 = """      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        details,
      );"""

new_test_2 = """      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        {
          correlationId: 'test-correlation-id',
          confirmationDetails: details,
        },
      );"""

content = content.replace(old_test_2, new_test_2)

with open('packages/core/src/scheduler/state-manager.test.ts', 'w') as f:
    f.write(content)

print("Successfully updated packages/core/src/scheduler/state-manager.test.ts")
