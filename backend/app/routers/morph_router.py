from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import anyio
from openai import OpenAI

router = APIRouter()
client = OpenAI(api_key=os.getenv("MORPH_API_KEY"), base_url="https://api.morphllm.com/v1")


class MorphRequest(BaseModel):
    prompt: str
    model: str | None = "morph-v3-fast"


@router.post("/morph")
async def morph(req: MorphRequest):
    try:
        def run():
            return client.chat.completions.create(
                model=req.model or "morph-v3-fast",
                messages=[{"role": "user", "content": req.prompt}],
            )

        resp = await anyio.to_thread.run_sync(run)
        return {"content": resp.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
