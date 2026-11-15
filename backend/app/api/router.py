from fastapi import APIRouter

from app.api.routes import astronomy, data, health, missions, physics, sites, terrain

api_router = APIRouter(prefix="/api")
for module in (health, sites, astronomy, terrain, missions, physics, data):
    api_router.include_router(module.router)
