from datetime import datetime, timezone, timedelta

from fastapi import FastAPI

app = FastAPI()

@app.get("/api/hello")
async def hello():
    KST = timezone(timedelta(hours=9))
    now = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
    return {"message": f"Hello Studio Wit API - {now}"}
