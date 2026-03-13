"""
Realtime WebSocket notification manager for PrithviNet.

This service keeps lightweight in-memory WebSocket subscriptions and broadcasts
portal notifications to connected dashboard clients.

Usage:
- Register websocket clients with `manager.connect(user_id, websocket)`
- Remove them with `manager.disconnect(user_id, websocket)`
- Broadcast payloads with `manager.send_to_user(...)` or `manager.broadcast(...)`

The payload shape is intentionally simple JSON so the frontend can directly
append it to its notification list and show popup toasts.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import WebSocket


@dataclass
class RealtimeNotificationPayload:
    id: Optional[int]
    title: str
    message: str
    notif_type: str = "alert"
    alert_id: Optional[int] = None
    user_id: Optional[int] = None
    is_read: bool = False
    created_at: str = ""

    def to_message(self) -> Dict[str, Any]:
        payload = asdict(self)
        if not payload["created_at"]:
            payload["created_at"] = datetime.now(timezone.utc).isoformat()

        return {
            "event": "notification.created",
            "notification": payload,
        }


class RealtimeNotificationManager:
    """
    In-memory connection manager keyed by user_id.

    Notes:
    - Multiple browser tabs per user are supported.
    - This is process-local storage. If you later scale to multiple workers,
      move this to Redis/pub-sub or another shared broker.
    """

    def __init__(self) -> None:
        self._connections: Dict[int, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(user_id, []).append(websocket)

        await self._safe_send_json(
            websocket,
            {
                "event": "connection.ready",
                "user_id": user_id,
                "connected_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(user_id, [])
            if websocket in sockets:
                sockets.remove(websocket)

            if not sockets and user_id in self._connections:
                self._connections.pop(user_id, None)

    async def send_to_user(
        self,
        user_id: int,
        *,
        title: str,
        message: str,
        notif_type: str = "alert",
        notification_id: Optional[int] = None,
        alert_id: Optional[int] = None,
        is_read: bool = False,
        created_at: Optional[str] = None,
    ) -> None:
        payload = RealtimeNotificationPayload(
            id=notification_id,
            title=title,
            message=message,
            notif_type=notif_type,
            alert_id=alert_id,
            user_id=user_id,
            is_read=is_read,
            created_at=created_at or datetime.now(timezone.utc).isoformat(),
        ).to_message()

        await self._send_payload_to_user(user_id, payload)

    async def send_notification_record(self, notification: Any) -> None:
        """
        Broadcast a DB notification model/object to its target user.

        Expected attributes:
        - id
        - user_id
        - alert_id
        - title
        - message
        - notif_type
        - is_read
        - created_at
        """
        created_at = getattr(notification, "created_at", None)
        await self.send_to_user(
            getattr(notification, "user_id"),
            title=getattr(notification, "title"),
            message=getattr(notification, "message"),
            notif_type=getattr(notification, "notif_type", "alert"),
            notification_id=getattr(notification, "id", None),
            alert_id=getattr(notification, "alert_id", None),
            is_read=getattr(notification, "is_read", False),
            created_at=created_at.isoformat() if created_at else None,
        )

    async def broadcast(
        self,
        *,
        title: str,
        message: str,
        notif_type: str = "alert",
        alert_id: Optional[int] = None,
    ) -> None:
        async with self._lock:
            user_ids = list(self._connections.keys())

        if not user_ids:
            return

        await asyncio.gather(
            *[
                self.send_to_user(
                    user_id,
                    title=title,
                    message=message,
                    notif_type=notif_type,
                    alert_id=alert_id,
                )
                for user_id in user_ids
            ],
            return_exceptions=True,
        )

    async def heartbeat(self, interval_seconds: int = 25) -> None:
        """
        Optional background coroutine to keep some proxies/connections warm.
        """
        while True:
            await asyncio.sleep(interval_seconds)

            async with self._lock:
                snapshot = {
                    user_id: list(sockets)
                    for user_id, sockets in self._connections.items()
                }

            tasks = []
            for user_id, sockets in snapshot.items():
                for socket in sockets:
                    tasks.append(
                        self._safe_send_json(
                            socket,
                            {
                                "event": "connection.ping",
                                "user_id": user_id,
                                "ts": datetime.now(timezone.utc).isoformat(),
                            },
                        )
                    )

            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    async def active_connection_count(self) -> int:
        async with self._lock:
            return sum(len(sockets) for sockets in self._connections.values())

    async def active_user_count(self) -> int:
        async with self._lock:
            return len(self._connections)

    async def _send_payload_to_user(
        self,
        user_id: int,
        payload: Dict[str, Any],
    ) -> None:
        async with self._lock:
            sockets = list(self._connections.get(user_id, []))

        if not sockets:
            return

        stale: List[WebSocket] = []
        for socket in sockets:
            ok = await self._safe_send_json(socket, payload)
            if not ok:
                stale.append(socket)

        if stale:
            async with self._lock:
                current = self._connections.get(user_id, [])
                for socket in stale:
                    if socket in current:
                        current.remove(socket)
                if not current and user_id in self._connections:
                    self._connections.pop(user_id, None)

    async def _safe_send_json(
        self,
        websocket: WebSocket,
        payload: Dict[str, Any],
    ) -> bool:
        try:
            await websocket.send_text(json.dumps(payload, default=str))
            return True
        except Exception:
            return False


manager = RealtimeNotificationManager()
