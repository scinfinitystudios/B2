import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || 'toshi.bs3').replace(/^@/, '');
const MC_PORT = Number(process.env.MC_PORT || 3000);
const RETRY_MS = 10_000;
const clients = new Set();
const wss = new WebSocketServer({ port: MC_PORT });

function sendCommand(socket, commandLine) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify({
    header: { version: 1, requestId: randomUUID(), messageType: 'commandRequest', messagePurpose: 'commandRequest' },
    body: { version: 1, origin: { type: 'player' }, commandLine }
  }));
}

function sendEvent(id, payload) {
  const message = JSON.stringify(payload);
  for (const socket of clients) sendCommand(socket, `scriptevent ${id} ${message}`);
}

function giftName(data) {
  return String(data.giftDetails?.giftName || data.giftDetails?.name || data.extendedGiftInfo?.name || data.giftName || '').trim();
}

function giftId(data) {
  return Number(data.giftId ?? data.giftDetails?.giftId ?? 0);
}

wss.on('connection', socket => {
  clients.add(socket);
  console.log(`Minecraft conectado (${clients.size}).`);
  sendCommand(socket, `scriptevent b2:connected ${JSON.stringify({ tiktokUsername: TIKTOK_USERNAME })}`);
  socket.on('close', () => clients.delete(socket));
  socket.on('error', error => console.error('WebSocket Minecraft:', error.message));
});

const tiktok = new TikTokLiveConnection(TIKTOK_USERNAME, {
  processInitialData: false,
  enableExtendedGiftInfo: true
});
let connected = false;
let connecting = false;
let retryTimer = null;

function retry() {
  if (retryTimer || connected || connecting) return;
  retryTimer = setTimeout(() => { retryTimer = null; connect(); }, RETRY_MS);
  console.log('TikTok offline. Reintentando en 10s...');
}

async function connect() {
  if (connected || connecting) return;
  connecting = true;
  try { await tiktok.connect(); }
  catch (error) { console.error('TikTok:', error?.message || error); retry(); }
  finally { connecting = false; }
}

tiktok.on(ControlEvent.CONNECTED, state => {
  connected = true;
  console.log(`TikTok conectado: @${TIKTOK_USERNAME} | roomId: ${state.roomId}`);
});
tiktok.on(ControlEvent.ERROR, ({ info, exception }) => { console.error('Error TikTok:', info || exception?.message || exception); if (!connected) retry(); });
tiktok.on(ControlEvent.DISCONNECTED, () => { connected = false; retry(); });
tiktok.on(WebcastEvent.STREAM_END, () => { connected = false; console.log('LIVE terminado. Esperando el próximo...'); retry(); });

// Likes: enviamos el total recibido al add-on; el add-on decide cada múltiplo de 50/100.
tiktok.on(WebcastEvent.LIKE, data => {
  const totalLikes = Number(data.totalLikeCount ?? data.likeCount ?? data.likeCountDelta ?? 0);
  if (totalLikes > 0) sendEvent('b2:likes', { totalLikes });
});

tiktok.on(WebcastEvent.FOLLOW, data => {
  sendEvent('b2:action', { action: 'follow', username: data.user?.uniqueId || data.uniqueId || 'unknown' });
  console.log('➕ Follow → 5 TNT');
});

tiktok.on(WebcastEvent.SHARE, data => {
  sendEvent('b2:action', { action: 'share', username: data.user?.uniqueId || data.uniqueId || 'unknown' });
  console.log('↗️ Share → manzana encantada');
});

tiktok.on(WebcastEvent.GIFT, data => {
  const name = giftName(data);
  const id = giftId(data);
  const repeatCount = Number(data.repeatCount || 1);
  console.log(`🎁 Regalo: ${name || 'desconocido'} (${id}) x${repeatCount}`);
  sendEvent('b2:gift', {
    username: data.user?.uniqueId || data.uniqueId || 'unknown',
    nickname: data.user?.nickname || data.nickname || 'TikTok',
    giftName: name,
    giftId: id,
    repeatCount,
    giftType: Number(data.giftDetails?.giftType ?? data.giftType ?? 1),
    diamondCount: Number(data.giftDetails?.diamondCount ?? data.diamondCount ?? data.extendedGiftInfo?.diamondCount ?? 1),
    repeatEnd: data.repeatEnd ? 1 : 0
  });
});

wss.on('listening', () => {
  console.log(`B2 listo en ws://localhost:${MC_PORT}`);
  console.log(`TikTok: @${TIKTOK_USERNAME}`);
  console.log(`Minecraft: /connect localhost:${MC_PORT}`);
});

console.log('B2 - TikTok LIVE → Minecraft Bedrock');
connect();
