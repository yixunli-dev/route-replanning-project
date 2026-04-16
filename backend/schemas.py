from pydantic import BaseModel
from typing import List


class Coordinate(BaseModel):
    lat: float
    lon: float


class AlternativePath(BaseModel):
    rank: int
    path: List[int]
    cost: float
    node_count: int
    coordinates: List[Coordinate]


class ReplanRequest(BaseModel):
    start_address: str
    end_address: str
    dist: int
    k: int
    congestion_start_index: int
    congestion_end_index: int
    congestion_multiplier: float


class ReplanResponse(BaseModel):
    source: int
    target: int
    original_path: List[int]
    original_cost: float
    original_node_count: int
    original_coordinates: List[Coordinate]
    alternative_paths: List[AlternativePath]
    did_route_change: bool
    original_distance_miles: float
    original_duration_minutes: float