---
name: gemini-carbon
description: Invoke Gemini 4 Carbon (gemini-4-carbon) model using your Gemini API key for advanced reasoning, complex coding review, architectural analysis, and verification. Use whenever the user asks to "ask carbon", "run on carbon", "use gemini carbon", or "@gemini-carbon".
---

# Gemini Carbon Skill

This skill delegates tasks to the **Gemini 4 Carbon** (`gemini-4-carbon`) model using the `GEMINI_API_KEY` environment variable or the key file at `~/.gemini/gemini_api_key.env`.

## How to execute

Run commands from the repository root using the checkout-relative path:
```powershell
python .agents/skills/gemini-carbon/query_carbon.py "<prompt or instructions>"
```

For custom model override:
```powershell
python .agents/skills/gemini-carbon/query_carbon.py "<prompt>" --model gemini-4-carbon
```

## Credentials

The script reads your Gemini API key in order of precedence:
1. `GEMINI_API_KEY` environment variable
2. User home key file: `~/.gemini/gemini_api_key.env`
3. Repository `.env` file (`GEMINI_API_KEY=...`)
