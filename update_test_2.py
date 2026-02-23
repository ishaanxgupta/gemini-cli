import sys

with open('packages/core/src/scheduler/state-manager.test.ts', 'r') as f:
    content = f.read()

old_test_content = """    it('should preserve diff when cancelling an edit tool call', () => {
      const call = createValidatingCall();
      stateManager.enqueue([call]);
      stateManager.dequeue();

      const details = {
        type: 'edit' as const,
        title: 'Edit',
        fileName: 'test.txt',
        filePath: '/path/to/test.txt',
        fileDiff: 'diff',
        originalContent: 'old',
        newContent: 'new',
        onConfirm: vi.fn(),
      };

      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        details,
      );
      stateManager.updateStatus(
        call.request.callId,
        'cancelled',
        'User said no',
      );
      stateManager.finalizeCall(call.request.callId);

      const completed = stateManager.completedBatch[0] as CancelledToolCall;
      expect(completed.status).toBe('cancelled');
      expect(completed.response.resultDisplay).toEqual({
        fileDiff: 'diff',
        fileName: 'test.txt',
        filePath: '/path/to/test.txt',
        originalContent: 'old',
        newContent: 'new',
      });
    });"""

new_test_content = """    it('should preserve diff when cancelling an edit tool call', () => {
      const call = createValidatingCall();
      stateManager.enqueue([call]);
      stateManager.dequeue();

      const details = {
        type: 'edit' as const,
        title: 'Edit',
        fileName: 'test.txt',
        filePath: '/path/to/test.txt',
        fileDiff: 'diff',
        originalContent: 'old',
        newContent: 'new',
      };

      stateManager.updateStatus(
        call.request.callId,
        'awaiting_approval',
        { correlationId: '123', confirmationDetails: details },
      );
      stateManager.updateStatus(
        call.request.callId,
        'cancelled',
        'User said no',
      );
      stateManager.finalizeCall(call.request.callId);

      const completed = stateManager.completedBatch[0] as CancelledToolCall;
      expect(completed.status).toBe('cancelled');
      expect(completed.response.resultDisplay).toEqual({
        fileDiff: 'diff',
        fileName: 'test.txt',
        filePath: '/path/to/test.txt',
        originalContent: 'old',
        newContent: 'new',
      });
    });"""

if old_test_content in content:
    content = content.replace(old_test_content, new_test_content)
    with open('packages/core/src/scheduler/state-manager.test.ts', 'w') as f:
        f.write(content)
    print("Updated test 'should preserve diff when cancelling an edit tool call'.")
else:
    print("Could not find test content.")
