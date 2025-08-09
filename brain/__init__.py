"""
Brain module: analyzes page artifacts and user profiles to produce
Morph Apply-ready update payloads for CSS/JS/HTML.

This folder is intentionally standalone so it can be moved under the
backend later without merge conflicts.
"""

from .brain import run_brain
from .models import (
    BrainRequest,
    BrainOutput,
    UserProfile,
    SiteProfile,
    PageContext,
    Intent,
)

__all__ = [
    "run_brain",
    "BrainRequest",
    "BrainOutput",
    "UserProfile",
    "SiteProfile",
    "PageContext",
    "Intent",
]
