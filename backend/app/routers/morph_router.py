from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from openai import OpenAI

from app.helpers import fetch_instructions

router = APIRouter()
client = OpenAI(api_key=os.getenv("MORPH_API_KEY"), base_url="https://api.morphllm.com/v1")


class MorphRequest(BaseModel):
    prompt: str
    persona_id: str | None = "1"
    model: str | None = "morph-v3-fast"


@router.post("/morph")
async def morph(req: MorphRequest):
    res = fetch_instructions(req.persona_id)
    try:
        content = "<instruction>{}</instruction>\n<code>{}</code>\n<update>{}</update>".format(
            res.get("instructions"), req.prompt, res.get("code_snippet")
        )
        resp =  client.chat.completions.create(
            model=req.model or "morph-v3-fast",
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ],
        )
        return {"content": resp.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
