from __future__ import annotations

from typing import Dict, Any, List
import re
from bs4 import BeautifulSoup  # lightweight DOM parsing for analysis only


def extract_palette(html: str) -> List[str]:
    colors = set()
    # Naive scan of hex colors in inline styles; external CSS isn't parsed here
    for m in re.finditer(r"#[0-9a-fA-F]{3,6}", html):
        colors.add(m.group(0).lower())
    return list(colors)[:12]


def find_checkout_selector(soup: BeautifulSoup) -> str | None:
    candidates = [
        "button.button--checkout",
        "button.checkout",
        "a.button--checkout",
        'button[aria-label*="checkout" i]',
        'button:matches-css-after(content:"checkout")',  # placeholder, not used by BeautifulSoup
    ]
    # Best-effort: look for text nodes containing checkout
    btn = soup.find(
        lambda t: t.name in ["button", "a"]
        and t.get_text(strip=True).lower().find("checkout") >= 0
    )
    if btn and btn.has_attr("class"):
        cls = btn.get("class")
        if cls:
            return f".{cls[0]}"
    return candidates[0]


def analyze_page(page) -> Dict[str, Any]:
    """Return lightweight signals: colors, headings, common targets, etc."""
    soup = BeautifulSoup(page.html, "html.parser")
    palette = extract_palette(page.html)
    headings = [h.get_text(strip=True) for h in soup.find_all(["h1", "h2"])][:10]
    checkout_sel = find_checkout_selector(soup)

    return {
        "palette": palette,
        "headings": headings,
        "targets": {
            "checkout": checkout_sel,
            "newsletter_modal": "#newsletter-modal, .newsletter-modal",
        },
        "soup_stats": {
            "num_divs": len(soup.find_all("div")),
            "num_imgs": len(soup.find_all("img")),
        },
    }
