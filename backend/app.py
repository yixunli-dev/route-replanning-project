from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import ReplanRequest, ReplanResponse
from backend.service import run_replanning_pipeline_by_addresses, preload_graph


app = FastAPI(
    title="Route Replanning API",
    description="Backend API for dynamic route replanning with congestion simulation and K-shortest paths",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Pre-load the road network graph on server start."""
    preload_graph()


@app.get("/")
def health_check():
    return {"message": "Route Replanning API is running"}


@app.post("/api/routes/replan", response_model=ReplanResponse)
def replan_route(request: ReplanRequest):
    try:
        result = run_replanning_pipeline_by_addresses(
            start_address=request.start_address,
            end_address=request.end_address,
            dist=request.dist,
            k=request.k,
            congestion_start_index=request.congestion_start_index,
            congestion_end_index=request.congestion_end_index,
            congestion_multiplier=request.congestion_multiplier
        )
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))