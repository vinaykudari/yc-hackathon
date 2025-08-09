from openai import OpenAI
import os

def fetch_instructions(persona_id):
    return {
        "instructions": """
        Apply the update instructions
        
        """,
        "update_instructions": """
            body {background-color: red}
        """
    }

def morph(code, instruction):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    content = """
    
    """
    resp =  client.chat.completions.create(
        model="",
        messages=[
            {
                "role": "user",
                "content": content
            }
        ],
    )
    resp = resp.choices[0].message.content
    return {"content": resp}