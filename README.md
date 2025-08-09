
To install packages
```commandline
uv sync
```

To run 
```commandline
PYTHONPATH=$PWD uv run uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
