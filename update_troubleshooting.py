import sys

with open('docs/troubleshooting.md', 'r') as f:
    content = f.read()

# Define the block to be replaced
old_block = """    - Gemini Code Assist for individuals:
      [Available locations](https://developers.google.com/gemini-code-assist/resources/available-locations#americas)
    - Google AI Pro and Ultra where Gemini Code Assist (and Gemini CLI) is also
      available:"""

new_block = """    - Gemini Code Assist for individuals:
      [Available locations](https://developers.google.com/gemini-code-assist/resources/available-locations#americas)"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('docs/troubleshooting.md', 'w') as f:
        f.write(content)
    print("Updated docs/troubleshooting.md")
else:
    print("Could not find the block to replace.")
    print("--- Content snippet ---")
    start = content.find("Gemini Code Assist for individuals:")
    if start != -1:
        print(content[start:start+300])
