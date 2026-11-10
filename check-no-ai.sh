#!/bin/sh
# Fails if any AI SDK, AI import or AI key shows up in the app. JobHunt OS has no AI inside.
bad=0
grep -niE '"(openai|@anthropic-ai/[a-z-]+|langchain|@langchain/[a-z-]+|cohere-ai|@google/generative-ai|ai)"\s*:' api/package.json web/package.json && bad=1
grep -rniE "from ['\"](openai|@anthropic-ai|langchain|@google/generative-ai)|(OPENAI|ANTHROPIC|GEMINI)_API_KEY|api\.openai\.com|api\.anthropic\.com" api/src web/src && bad=1
[ $bad = 1 ] && { echo "AI dependency found"; exit 1; }
echo "OK: no AI SDKs, imports or keys in the app"
