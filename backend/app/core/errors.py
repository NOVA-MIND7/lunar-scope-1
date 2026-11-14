"""Uniform error responses: {"error": {"code", "message", "details"}}."""
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

import logging

logger = logging.getLogger("lunar_scope")


class NotImplementedPhaseError(HTTPException):
    """Raised by endpoints whose scientific implementation is scheduled for a later phase."""

    def __init__(self, capability: str):
        super().__init__(
            status_code=501,
            detail={
                "code": "not_implemented",
                "message": f"{capability} is not implemented yet. No results are returned rather than invented ones.",
            },
        )


def _body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"error": error}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            return JSONResponse(
                _body(exc.detail["code"], exc.detail.get("message", ""), exc.detail.get("details")),
                status_code=exc.status_code,
            )
        code = "not_found" if exc.status_code == 404 else "http_error"
        return JSONResponse(_body(code, str(exc.detail)), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"loc": list(e.get("loc", [])), "msg": e.get("msg", ""), "type": e.get("type", "")}
            for e in exc.errors()
        ]
        return JSONResponse(
            _body("validation_error", "Request validation failed.", details), status_code=422
        )

    @app.exception_handler(Exception)
    async def unhandled_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(_body("internal_error", "An unexpected error occurred."), status_code=500)
