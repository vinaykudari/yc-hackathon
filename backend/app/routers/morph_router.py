from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os, re
from app.helpers import fetch_instructions, make_code_snippet

router = APIRouter()

class MorphRequest(BaseModel):
    prompt: str
    persona_id: str | None = "1"
    model: str | None = "morph-v3-large"

def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z0-9_-]*\n", "", s)
        s = re.sub(r"\n```$", "", s)
    return s.strip()

def _classify(s: str) -> str:
    t = s.strip()
    if t.lower().startswith("<!doctype") or re.search(r"<html|<head|<body", t, re.I):
        return "html"
    if re.search(r"<script\b", t, re.I) and not re.search(r"<html|<head|<body", t, re.I):
        return "js"
    if re.search(r"[a-z-]+\s*:\s*[^;]+;", t) and "<" not in t and ">" not in t:
        return "css"
    if re.search(r"\bdocument\.|\bwindow\.|=>|\bfunction\b|\(\s*function", t):
        return "js"
    return "js"

def _extract_inner_script(s: str) -> str:
    m = re.search(r"<script[^>]*>([\s\S]*?)</script>", s, re.I)
    return m.group(1).strip() if m else s


@router.post("/morph")
async def morph(req: MorphRequest):
    try:
        instr = fetch_instructions(req.persona_id)
        client = OpenAI(api_key=os.getenv("MORPH_API_KEY"), base_url="https://api.morphllm.com/v1")
        snippet = make_code_snippet(code=req.prompt, instruction=instr.get("instructions", ""))
        code = req.prompt

        # Focus the prompt on transformation only
        input_content = "<instruction>{}</instruction>\n<code>{}</code>\n<update>{}</update>".format(
            instr.get("instructions", ""), code, snippet
        )

        resp = client.chat.completions.create(
            model=req.model or "morph-v3-large",
            messages=[{"role": "user", "content": input_content}]
        )

        ai_response = _strip_fences(resp.choices[0].message.content or "")

        print(f"AI Response: \n{ai_response}")

        # Handle mixed content - extract only the JS part
        if ai_response.strip().startswith('<!DOCTYPE') and '(function()' in ai_response:
            parts = ai_response.split('</html>')
            if len(parts) > 1:
                js_content = parts[1].strip()
                print(f"Extracted JS only: \n{js_content}")

                return {
                    "content": js_content,  # Return only JavaScript
                    "metadata": {"kind": "js", "transformation_only": True}
                }

        # If it's already just JavaScript, return as-is
        if ai_response.strip().startswith('(function()') or 'ensureStyles' in ai_response:
            return {
                "content": ai_response,
                "metadata": {"kind": "js", "transformation_only": True}
            }

        # Fallback to original logic
        kind = _classify(ai_response)
        if kind == "js":
            ai_response = _extract_inner_script(ai_response)

        print(f"response to extension: {ai_response}")

        return {
            "content": ai_response,
            "metadata": {"kind": kind}
        }

    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



