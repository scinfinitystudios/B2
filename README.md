# B2 🌹🧟

Puente ligero para conectar **TikTok LIVE con Minecraft Bedrock** desde Node.js/Termux.

## Objetivo

```text
TikTok LIVE
   ↓
 Termux
   ↓
   B2
   ↓
Minecraft Bedrock
   ↓
interacción 
```

B2 usa `tiktok-live-connector` para recibir eventos de TikTok LIVE y el protocolo WebSocket de Minecraft Bedrock para enviar `/scriptevent` al mundo. La librería de TikTok es no oficial y puede leer un LIVE público sin iniciar sesión.

## Instalación en Android / Termux

```bash
git clone https://github.com/scinfinitystudios/B2.git
cd B2
npm install
```

## Iniciar

Por defecto B2 usa `@nombre de tu tik tok live` y el puerto `3000`:

```bash
npm start
```

También puedes cambiar el usuario:

```bash
TIKTOK_USERNAME=tu_usuario npm start
```

Si la cuenta todavía no está LIVE, B2 reintentará la conexión automáticamente.

## Conectar Minecraft

Con B2 ejecutándose, abre el mundo de Minecraft con TNTCoin y ejecuta:

```text
/connect localhost:3000
```

El protocolo WebSocket de Bedrock permite enviar comandos mediante paquetes `commandRequest`; `/scriptevent` permite entregar un ID y un payload al sistema de scripts.

## Rosa → Zombie

B2 detecta los regalos cuyo nombre sea `rosa` o `popukar` y envía:

```text
/scriptevent tntcoin:gift { ... }
```

TNTCoin ya escucha `tntcoin:gift` y espera `username`, `nickname`, `giftName`, `giftId`, `repeatCount`, `giftType`, `diamondCount` y `repeatEnd`.
Zombie

> Nota: TikTokLiveConnector no es una API oficial de TikTok; funciona leyendo el servicio Webcast interno de TikTok.
