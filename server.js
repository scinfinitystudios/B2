import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || 'toshi.bs3').replace(/^@/, '');
const MC_PORT = Number(process.env.MC_PORT || 3000);
const ROSE_NAMES = new Set(['rose', 'rosa']);

const clients = new Set();
const wss = new WebSocketServer({ port: MC_PORT });

function minecraftCommand(socket, commandLine) {
  if (socket.readyState !== 1) return;

  socket.send(JSON.stringify({
    header: {
      version: 1,
      requestId: randomUUID(),
      messageType: 'commandRequest',
      messagePurpose: 'commandRequest'
    },
    body: {
      version: 1,
      origin: { type: 'player' },
      commandLine
    }
  }));
}

function sendScriptEvent(id, payload) {
  const json = JSON.stringify(payload);
  for (const socket of clients) {
    minecraftCommand(socket, `scriptevent ${id} ${json}`);
  }
}

function getGiftName(data) {
  return (
    data.giftDetails?.giftName ||
    data.giftDetails?.name ||
    data.extendedGiftInfo?.name ||
    data.giftName ||
    ''
  ).trim();
}

function getGiftId(data) {
  return Number(data.giftId ?? data.giftDetails?.giftId ?? 0);
}

wss.on('connection', socket => {
  clients.add(socket);
  console.log('Minecraft conectado.');

  sendScriptEvent('tntcoin:connected', {
    tiktokUsername: TIKTOK_USERNAME
  });

  socket.on('close', () => {
    clients.delete(socket);
    console.log('Minecraft desconectado.');
  });

  socket.on('error', error => {
    console.error('Error WebSocket Minecraft:', error.message);
  });
});

const tiktok = new TikTokLiveConnection(TIKTOK_USERNAME, {
  processInitialData: false,
  enableExtendedGiftInfo: true
});

tiktok.on(ControlEvent.CONNECTED, state => {
  console.log(`TikTok conectado: @${TIKTOK_USERNAME} | roomId: ${state.roomId}`);
});

tiktok.on(ControlEvent.ERROR, ({ info, exception }) => {
  console.error('Error TikTok:', info || exception?.message || exception);
});

tiktok.on(ControlEvent.DISCONNECTED, () => {
  console.log('TikTok desconectado.');
});

tiktok.on(WebcastEvent.GIFT, data => {
  const giftName = getGiftName(data);
  const normalizedName = giftName.toLowerCase();

  console.log(`Regalo recibido: ${giftName || 'desconocido'} (${getGiftId(data)})`);

  if (!ROSE_NAMES.has(normalizedName)) return;

  // TNTCoin espera exactamente estas propiedades para tntcoin:gift.
  sendScriptEvent('tntcoin:gift', {
    username: data.user?.uniqueId || data.uniqueId || 'unknown',
    nickname: data.user?.nickname || data.nickname || 'TikTok',
    giftName: giftName || 'Rose',
    giftId: getGiftId(data),
    repeatCount: Number(data.repeatCount || 1),
    giftType: Number(data.giftDetails?.giftType ?? data.giftType ?? 1),
    diamondCount: Number(
      data.giftDetails?.diamondCount ??
      data.diamondCount ??
      data.extendedGiftInfo?.diamondCount ??
      1
    ),
    repeatEnd: data.repeatEnd ? 1 : 0
  });

  console.log('🌹 Rosa enviada a Minecraft → tntcoin:gift');
});

wss.on('listening', () => {
  console.log(`B2 listo en ws://localhost:${MC_PORT}`);
  console.log(`TikTok configurado: @${TIKTOK_USERNAME}`);
  console.log('En Minecraft usa: /connect localhost:' + MC_PORT);
});

console.log('B2 - TikTok LIVE → Minecraft Bedrock');
console.log('Iniciando conexión con TikTok...');

tiktok.connect().catch(error => {
  console.error('No se pudo conectar a TikTok LIVE.');
  console.error(error?.message || error);
  console.error('Comprueba que la cuenta esté LIVE y que el usuario sea correcto.');
});
