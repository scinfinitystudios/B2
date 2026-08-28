# B2 🌹🧟

Puente ligero para conectar **TikTok LIVE con Minecraft Bedrock** desde Node.js/Termux.

## Objetivo

```text
TikTok LIVE
   ↓
🌹 Rose / Rosa
   ↓
B2
   ↓ WebSocket
Minecraft Bedrock
   ↓
TNTCoin
   ↓
🧟 Zombie
```

B2 usa `tiktok-live-connector` para recibir eventos de TikTok LIVE y el protocolo WebSocket de Minecraft Bedrock para enviar `/scriptevent` al mundo. La librería de TikTok es no oficial y no requiere iniciar sesión para leer un LIVE público. citeturn3search0

## Instalación en Android / Termux

```bash
git clone https://github.com/scinfinitystudios/B2.git
cd B2
npm install
```

## Iniciar

Por defecto B2 usa `toshi.bs3` y el puerto `3000`:

```bash
npm start
```

También puedes cambiar el usuario:

```bash
TIKTOK_USERNAME=tu_usuario npm start
```

## Conectar Minecraft

Con B2 ejecutándose, abre el mundo de Minecraft con TNTCoin y ejecuta:

```text
/connect localhost:3000
```

El protocolo WebSocket de Bedrock permite enviar comandos mediante paquetes `commandRequest`; `/scriptevent` permite entregar un ID y un payload al sistema de scripts. citeturn2search0turn1search1

## Rosa → Zombie

B2 detecta los regalos cuyo nombre sea `Rose` o `Rosa` y envía:

```text
/scriptevent tntcoin:gift { ... }
```

TNTCoin ya escucha `tntcoin:gift` y espera `username`, `nickname`, `giftName`, `giftId`, `repeatCount`, `giftType`, `diamondCount` y `repeatEnd`. citeturn7file0turn10file0

Después, la acción **Gift** configurada en TNTCoin puede ser **Summon → minecraft:zombie**. TNTCoin documenta soporte para eventos de Gift y acciones Summon. citeturn1search4

## Estado

- [x] Servidor WebSocket para Minecraft
- [x] Conexión con TikTok LIVE
- [x] Detección de Rose/Rosa
- [x] Conversión a `tntcoin:gift`
- [ ] Prueba real con un LIVE
- [ ] Configuración final de Gift → Summon Zombie

> Nota: TikTokLiveConnector no es una API oficial de TikTok; funciona leyendo el servicio Webcast interno de TikTok. citeturn3search0
