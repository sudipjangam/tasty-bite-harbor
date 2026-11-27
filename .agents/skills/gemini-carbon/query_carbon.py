import os
import sys
import json
import argparse
import urllib.request
import urllib.error

def get_api_key():
    # 1. Environment variable
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key and key != "PASTE_YOUR_GEMINI_API_KEY_HERE":
        return key

    # 2. Global file
    user_home = os.path.expanduser("~")
    global_file = os.path.join(user_home, ".gemini", "gemini_api_key.env")
    if os.path.exists(global_file):
        with open(global_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val and val != "PASTE_YOUR_GEMINI_API_KEY_HERE":
                        return val

    # 3. Local .env file
    local_env = os.path.join(os.getcwd(), ".env")
    if os.path.exists(local_env):
        with open(local_env, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val and val != "PASTE_YOUR_GEMINI_API_KEY_HERE":
                        return val

    return None

def main():
    parser = argparse.ArgumentParser(
        description="Query Gemini Carbon model",
        usage="python query_carbon.py \"your prompt here\" [--model model-name] [--timeout seconds]"
    )
    parser.add_argument("prompt", help="Prompt or instructions for the model")
    parser.add_argument("--model", default="gemini-4-carbon", help="Model name (default: gemini-4-carbon)")
    default_timeout = int(os.environ.get("GEMINI_TIMEOUT", "1200"))
    parser.add_argument("--timeout", type=int, default=default_timeout, help="Request timeout in seconds (default: 1200)")

    args = parser.parse_args()
    prompt = args.prompt
    model = args.model
    timeout = args.timeout

    api_key = get_api_key()
    if not api_key:
        print("Error: GEMINI_API_KEY not found or still set to placeholder.", file=sys.stderr)
        print(r"Please set GEMINI_API_KEY environment variable or paste your API key in ~/.gemini/gemini_api_key.env", file=sys.stderr)
        sys.exit(1)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                print("Error: No response candidates returned.")
                print(json.dumps(data, indent=2))
                sys.exit(1)

            candidate = candidates[0]
            finish_reason = candidate.get("finishReason", "STOP")
            parts = candidate.get("content", {}).get("parts", [])
            output_text = "".join(p.get("text", "") for p in parts)

            if finish_reason == "SAFETY":
                print("Error: Content generation blocked by safety settings.", file=sys.stderr)
                sys.exit(1)

            if finish_reason == "MAX_TOKENS":
                if output_text:
                    print(output_text)
                print("Warning: Response incomplete (hit MAX_TOKENS).", file=sys.stderr)
                sys.exit(2)

            if finish_reason not in ("STOP", None):
                if output_text:
                    print(output_text)
                print(f"Error: Generation stopped with finishReason: {finish_reason}", file=sys.stderr)
                sys.exit(1)

            if not output_text:
                print("Error: No text content returned in response.", file=sys.stderr)
                sys.exit(1)

            print(output_text)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"API Error {e.code}: {e.reason}", file=sys.stderr)
        print(err_body, file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Network / Timeout error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Request failed: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
