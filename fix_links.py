import sys

# Fix docs/tos-privacy.md
with open('docs/tos-privacy.md', 'r') as f:
    content = f.read()

# Replace broken usage statistics link
# The anchor in configuration.md is #usage-statistics
# The old link might have been different or the anchor was removed/renamed
# Checking configuration.md content from previous read_file output:
# "## Usage statistics" exists, which usually generates #usage-statistics
# However, the link checker complained about docs/get-started/configuration.md#usage-statistics
# Let's check if the file path is correct relative to docs/tos-privacy.md
# docs/tos-privacy.md is in docs/
# docs/get-started/configuration.md is in docs/get-started/
# So the link should be get-started/configuration.md#usage-statistics
# But the error message said: [404] https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#usage-statistics
# This suggests an absolute URL was used.
# Let's look at the content of docs/tos-privacy.md again.
# "Usage Statistics Configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#usage-statistics)."
# It seems the file path in the repo might be different or the branch name 'main' causes issues if checking on a PR branch?
# Or maybe the file was moved?
# configuration.md is at docs/get-started/configuration.md
# Let's change it to a relative link to be safer and avoid branch issues.
# From docs/tos-privacy.md to docs/get-started/configuration.md: ./get-started/configuration.md

old_link = "https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#usage-statistics"
new_link = "./get-started/configuration.md#usage-statistics"
content = content.replace(old_link, new_link)

with open('docs/tos-privacy.md', 'w') as f:
    f.write(content)

# Fix docs/troubleshooting.md
with open('docs/troubleshooting.md', 'r') as f:
    content = f.read()

# Replace broken locations-pro-ultra link
# The link checker said: [404] https://developers.google.com/gemini-code-assist/resources/locations-pro-ultra
# I visited https://developers.google.com/gemini-code-assist/resources/available-locations
# It lists "Google AI Pro and Ultra subscriptions availability" on the same page.
# So I should point to available-locations instead.

old_url = "https://developers.google.com/gemini-code-assist/resources/locations-pro-ultra"
new_url = "https://developers.google.com/gemini-code-assist/resources/available-locations"
content = content.replace(old_url, new_url)

with open('docs/troubleshooting.md', 'w') as f:
    f.write(content)

print("Successfully updated links in docs/tos-privacy.md and docs/troubleshooting.md")
