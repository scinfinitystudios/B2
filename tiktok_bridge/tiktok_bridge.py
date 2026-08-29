"""B2 TikTok LIVE event adapter.

This file intentionally separates TikTok event handling from the Minecraft
transport. The transport can later be connected to the method used by the
user's Bedrock setup to send /scriptevent commands.
"""

import json
import os
from typing import Any, Callable

try:
    from TikTokLive import TikTokLiveClient
    from TikTokLive.events import ConnectEvent, FollowEvent, GiftEvent, LikeEvent, ShareEvent
except ImportError as exc:
    raise SystemExit(
        "TikTokLive no está instalado. En Termux ejecuta: pip install TikTokLive"
    ) from exc

TIKTOK_USERNAME = os.environ.get("B2_TIKTOK_USERNAME", "@TU_USUARIO")


def send_scriptevent(event_id: str, payload: dict[str, Any]) -> None:
    """Transport hook.

    For now this prints the exact command that must reach Minecraft. Keeping
    this function isolated lets us replace the transport without changing the
    TikTok event handlers.
    """
    message = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    print(f"[B2→Minecraft] /scriptevent {event_id} {message}", flush=True)


client = TikTokLiveClient(unique_id=TIKTOK_USERNAME)


@client.on(ConnectEvent)
async def on_connect(event: ConnectEvent) -> None:
    print(f"[TikTok] Conectado a @{event.unique_id} | Room ID: {client.room_id}")


@client.on(FollowEvent)
async def on_follow(event: FollowEvent) -> None:
    send_scriptevent("b2:action", {"action": "follow"})


@client.on(ShareEvent)
async def on_share(event: ShareEvent) -> None:
    send_scriptevent("b2:action", {"action": "share"})


@client.on(LikeEvent)
async def on_like(event: LikeEvent) -> None:
    total = getattr(event, "total", None)
    count = getattr(event, "count", 1) or 1
    if total is not None:
        send_scriptevent("b2:likes", {"totalLikes": int(total)})
    else:
        print(f"[TikTok] Likes recibidos: +{count} (sin total disponible)")


@client.on(GiftEvent)
async def on_gift(event: GiftEvent) -> None:
    gift = getattr(event, "gift", None)
    name = str(getattr(gift, "name", "")).strip().lower()
    repeat = int(getattr(event, "repeat_count", 1) or 1)

    gift_map = {
        "rose": "rose",
        "rosa": "rose",
        "popular": "popular",
        "love me": "love me",
        "quiéreme": "love me",
        "quiereme": "love me",
        "heart": "heart",
        "corazón": "heart",
        "corazon": "heart",
        "capybara": "capibara",
        "capibara": "capibara",
    }

    normalized = gift_map.get(name)
    if normalized is None:
        print(f"[TikTok] Regalo no configurado: {name!r}")
        return

    send_scriptevent(
        "b2:gift",
        {"giftName": normalized, "repeatCount": max(1, repeat)},
    )


if __name__ == "__main__":
    if TIKTOK_USERNAME == "@TU_USUARIO":
        print("⚠️ Configura B2_TIKTOK_USERNAME antes de iniciar el puente.")
        print("Ejemplo: export B2_TIKTOK_USERNAME='@tu_usuario'")
        raise SystemExit(2)

    print("🚀 B2 TikTok Bridge iniciado")
    client.run()
