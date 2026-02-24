import re

filepath = 'packages/core/src/scheduler/confirmation.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Replace the fallback block
pattern = re.compile(
    r'outcome:\s*response\.outcome\s*\?\?\s*// TODO: Remove legacy confirmed boolean fallback once migration complete\s*\(response\.confirmed\s*\?\s*ToolConfirmationOutcome\.ProceedOnce\s*:\s*ToolConfirmationOutcome\.Cancel\),',
    re.DOTALL
)

replacement = 'outcome: response.outcome!,'

# Check if the pattern matches
if pattern.search(content):
    new_content = pattern.sub(replacement, content)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("Fallback removed successfully.")
else:
    print("Pattern not found. Check whitespace or formatting.")
    # Fallback to a simpler replacement if regex fails due to whitespace
    # Let's try to match slightly looser

    start_marker = "outcome:\n            response.outcome ??"
    if start_marker in content:
        # Find the end of the expression
        start_idx = content.find(start_marker)
        # We look for the next comma
        end_idx = content.find(",", start_idx)
        if end_idx != -1:
            # Check if it looks like what we expect
            snippet = content[start_idx:end_idx]
            if "TODO: Remove legacy confirmed boolean fallback" in snippet:
                new_content = content[:start_idx] + "outcome: response.outcome!" + content[end_idx:]
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print("Fallback removed using string manipulation.")
            else:
                print("Found start marker but snippet didn't match expectation.")
        else:
             print("Could not find end of expression.")
    else:
        print("Could not find start marker.")
