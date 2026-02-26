import re

# Fix tos-privacy.md
filepath_tos = 'docs/tos-privacy.md'
with open(filepath_tos, 'r') as f:
    content = f.read()

# The link is: https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#usage-statistics
# It seems the anchor might be wrong or the file path.
# In configuration.md, I saw '## telemetry'. So maybe #telemetry is the anchor?
# The error says "Rejected status code ... Not Found".
# Let's try changing it to a relative link which is safer: ../get-started/configuration.md#telemetry
# Or just update the anchor if it's supposed to be absolute.
# Let's check if 'usage-statistics' exists in configuration.md. I checked and it returned nothing.
# 'telemetry' exists.
# So I will change it to point to telemetry.

content = content.replace(
    'https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#usage-statistics',
    'https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md#telemetry'
)

with open(filepath_tos, 'w') as f:
    f.write(content)

print(f"Updated {filepath_tos}")

# Fix troubleshooting.md
filepath_troubleshoot = 'docs/troubleshooting.md'
with open(filepath_troubleshoot, 'r') as f:
    content = f.read()

# The link is: https://developers.google.com/gemini-code-assist/resources/locations-pro-ultra
# The fetched page shows: https://developers.google.com/gemini-code-assist/resources/available-locations
# And inside it mentions "Google AI Pro and Ultra subscriptions availability".
# So I will update the link to available-locations.

content = content.replace(
    'https://developers.google.com/gemini-code-assist/resources/locations-pro-ultra',
    'https://developers.google.com/gemini-code-assist/resources/available-locations'
)

with open(filepath_troubleshoot, 'w') as f:
    f.write(content)

print(f"Updated {filepath_troubleshoot}")
