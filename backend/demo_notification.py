"""
Demo script to trigger a live portal notification in PrithviNet.

Usage:
    python demo_notification.py

Optional environment variables:
    PRITHVINET_BASE_URL=http://127.0.0.1:8000
    PRITHVINET_TOKEN=<jwt token>

This script sends a demo notification event to the backend so the
portal can display a popup notification and update the live feed.
"""

from __future__ import annotations

import json
import os
import sys
from urllib import request, error


BASE_URL = os.getenv("PRITHVINET_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
TOKEN = os.getenv("PRITHVINET_TOKEN", "").strip()

DEMO_PAYLOAD = {
    "title": "📅 Meeting Required: Pollution threshold exceeded",
    "message": (
        "Demo event: PM2.5 exceeded the safe limit at Industrial Zone A. "
        "Please schedule a compliance review meeting on the portal."
    ),
    "notif_type": "meeting",
    "severity": "high",
    "location_id": 1,
    "industry_id": 1,
}


def build_request() -> request.Request:
    body = json.dumps(DEMO_PAYLOAD).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    return request.Request(
        url=f"{BASE_URL}/alerts/demo-notification",
        data=body,
        headers=headers,
        method="POST",
    )


def main() -> int:
    print(f"Sending demo notification to: {BASE_URL}/alerts/demo-notification")

    req = build_request()

    try:
        with request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
            print(f"Status: {response.status}")
            if raw:
                try:
                    parsed = json.loads(raw)
                    print(json.dumps(parsed, indent=2))
                except json.JSONDecodeError:
                    print(raw)
            else:
                print("No response body returned.")
        print("\nDemo notification sent successfully.")
        print("Open the portal dashboard to see the popup/live notification.")
        return 0

    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP error: {exc.code}")
        print(body)
        print(
            "\nIf this endpoint requires auth, set PRITHVINET_TOKEN before running."
        )
        return 1

    except error.URLError as exc:
        print(f"Connection error: {exc.reason}")
        print(
            "\nMake sure the backend server is running, for example:"
            "\npython -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"
        )
        return 1

    except Exception as exc:
        print(f"Unexpected error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
