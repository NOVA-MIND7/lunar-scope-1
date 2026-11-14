from fastapi import APIRouter

from app.api.routes import astronomy, health, missions, sites, terrain

api_router = APIRouter(prefix="/api")
for module in (health, sites, astronomy, terrain, missions):
    api_router.include_router(module.router)
