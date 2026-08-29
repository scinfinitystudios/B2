import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { TikTokLive } from '@tiktool/live';

const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || 'toshi.bs3').replace(/^@/, '');
const TIKTOOL_API_KEY = process.env.TIKTOOL_API_KEY || '';
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

wss.on('connection', socket => {
  clients.add(socket);
  console.log(`Minecraft conectado (${clients.size}).`);
  sendCommand(socket, `scriptevent b2:connected ${JSON.stringify({ tiktokUsername: TIKTOK_USERNAME })}`);
  socket.on('close', () => clients.delete(socket));
  socket.on('error', error => console.error('WebSocket Minecraft:', error.message));
});

let live = null;
let connected = false;
let connecting = false;
let retryTimer = null;

function retry() {
  if (retryTimer || connected || connecting) return;
  retryTimer = setTimeout(() => { retryTimer = null; connectTikTok(); }, RETRY_MS);
  console.log('TikTok offline/no disponible. Reintentando en 10s...');
}

function userId(data) {
  return data?.user?.uniqueId || data?.uniqueId || 'unknown';
}

function connectTikTok() {
  if (connected || connecting) return;
  if (!TIKTOOL_API_KEY) {
    console.error('Falta TIKTOOL_API_KEY. Configúrala en Termux antes de ejecutar npm start.');
    return;
  }

  connecting = true;
  live = new TikTokLive({
    uniqueId: TIKTOK_USERNAME,
    apiKey: TIKTOOL_API_KEY
  });

  live.on('connected', data => {
    connected = true;
    connecting = false;
    console.log(`TikTok conectado: @${TIKTOK_USERNAME}${data?.roomId ? ` | roomId: ${data.roomId}` : ''}`);
  });

  live.on('error', error => {
    console.error('Error TikTok:', error?.message || error);
    connected = false;
    connecting = false;
    retry();
  });

  live.on('disconnected', () => {
    connected = false;
    connecting = false;
    console.log('TikTok desconectado.');
    retry();
  });

  live.on('streamEnd', () => {
    connected = false;
    connecting = false;
    console.log('LIVE terminado. Esperando el próximo...');
    retry();
  });

  // Likes: enviamos el total al add-on; main.js controla los múltiplos de 50/100.
  live.on('like', data => {
    const totalLikes = Number(data.totalLikes ?? data.totalLikeCount ?? data.likeCount ?? 0);
    if (totalLikes > 0) sendEvent('b2:likes', { totalLikes });
  });

  live.on('follow', data => {
    sendEvent('b2:action', { action: 'follow', username: userId(data) });
    console.log('➕ Follow → 5 TNT');
  });

  live.on('share', data => {
    sendEvent('b2:action', { action: 'share', username: userId(data) });
    console.log('↗️ Share → manzana encantada');
  });

  live.on('gift', data => {
    const name = String(data.giftName || data.giftDetails?.giftName || '').trim();
    const id = Number(data.giftId ?? data.giftDetails?.giftId ?? 0);
    const repeatCount = Math.max(1, Number(data.repeatCount || 1));
    console.log(`🎁 Regalo: ${name || 'desconocido'} (${id}) x${repeatCount}`);
    sendEvent('b2:gift', {
      username: userId(data),
      nickname: data.user?.nickname || data.nickname || 'TikTok',
      giftName: name,
      giftId: id,
      repeatCount,
      giftType: Number(data.giftType ?? data.giftDetails?.giftType ?? 1),
      diamondCount: Number(data.diamondCount ?? data.giftDetails?.diamondCount ?? 1),
      repeatEnd: data.repeatEnd ? 1 : 0
    });
  });

  Promise.resolve(live.connect()).catch(error => {
    console.error('Error conectando TikTok:', error?.message || error);
    connected = false;
    connecting = false;
    retry();
  });
}

wss.on('listening', () => {
  console.log(`B2 listo en ws://localhost:${MC_PORT}`);
  console.log(`TikTok: @${TIKTOK_USERNAME}`);
  console.log(`Minecraft: /connect localhost:${MC_PORT}`);
});

console.log('B2 - TikTok LIVE → Minecraft Bedrock');
console.log('Proveedor TikTok: TikTool');
connectTikTok();
