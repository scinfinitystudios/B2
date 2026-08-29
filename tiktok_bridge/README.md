# B2 TikTok LIVE Bridge

Puente para Termux: recibe eventos de TikTok LIVE y los convierte en `scriptevent` para el Add-On B2.

## Arquitectura

TikTok LIVE → `tiktok_bridge.py` → Minecraft/bridge local → `/scriptevent b2:*`

El puente está separado del Add-On para que el `B2Addon/` siga siendo independiente.

## Eventos B2

- Follow → `b2:action` / `follow`
- Share → `b2:action` / `share`
- Rose → `b2:gift` / `rose`
- Popular → `b2:gift` / `popular`
- Love Me → `b2:gift` / `love me`
- Heart → `b2:gift` / `heart`
- Capybara → `b2:gift` / `capibara`
- Likes → `b2:likes` con el total acumulado

## Termux

El script se ejecutará en Termux. La conexión con Minecraft se deja como una capa configurable porque Termux no puede ejecutar directamente un comando dentro de una instancia de Minecraft Bedrock sin un canal externo.

No se guardan contraseñas, cookies ni tokens de TikTok.
