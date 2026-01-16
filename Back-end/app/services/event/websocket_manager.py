from fastapi import WebSocket
from typing import Dict, List, Any
import asyncio


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        conns = self.active_connections.get(user_id)
        if not conns:
            return
        try:
            conns.remove(websocket)
        except ValueError:
            pass
        if not conns:
            self.active_connections.pop(user_id, None)

    async def broadcast_to_user(self, user_id: str, message: Any):
        conns = list(self.active_connections.get(user_id, []))
        if not conns:
            return
        tasks = [ws.send_json(message) for ws in conns]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast(self, message: Any):
        tasks = [
            ws.send_json(message)
            for conns in self.active_connections.values()
            for ws in conns
        ]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


websocket_manager = WebSocketManager()
