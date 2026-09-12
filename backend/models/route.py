from sqlalchemy import Column, Integer, String, Float, Text
from backend.database import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), unique=True, index=True, nullable=False) # Route A .. Route E
    route_name = Column(String(150), nullable=False)
    start_point = Column(String(100), nullable=False)
    end_point = Column(String(100), nullable=False)
    total_distance_km = Column(Float, default=0.0)
    estimated_duration_minutes = Column(Integer, default=30)
    stops_json = Column(Text, nullable=False)  # JSON serialized list of stops
    path_json = Column(Text, nullable=True)    # JSON serialized polyline coordinates
