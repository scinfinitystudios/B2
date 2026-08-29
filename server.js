import { randomUUID } from 'node:crypto';
import WebSocket, { WebSocketServer } from 'ws';

const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || 'toshi.bs3').replace(/^@/, '');
const TIKTOOL_API_KEY = process.env.TIKTOOL_API_KEY || '';
const MC_PORT = Number(process.env.MC_PORT || 3000);
const RETRY_MS = 10_000;

const clients = new Set();
const wss = new WebSocketServer({ port: MC_PORT });

function sendCommand(socket, commandLine) {
  if (socket.readyState !== WebSocket.OPEN) return;
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
      overworld: 'default',
      commandLine: commandLine.startsWith('/') ? commandLine : `/${commandLine}`
    }
  }));
}

function sendEvent(id, payload) {
  const message = JSON.stringify(payload);
  for (const socket of clients) sendCommand(socket, `scriptevent ${id} ${message}`);
}

function userId(data) {
  return data?.user?.uniqueId || data?.uniqueId || 'unknown';
}

wss.on('connection', socket => {
  clients.add(socket);
  console.log(`Minecraft conectado (${clients.size}).`);

  socket.send(JSON.stringify({
    header: {
      version: 1,
      requestId: randomUUID(),
      messageType: 'commandRequest',
      messagePurpose: 'subscribe'
    },
    body: { eventName: 'PlayerMessage' }
  }));

  socket.on('message', raw => {
    try {
      const packet = JSON.parse(raw.toString());
      if (packet?.header?.messagePurpose === 'commandResponse') {
        const status = packet.body?.statusCode;
        if (typeof status === 'number' && status < 0) {
          console.warn(`[B2] Minecraft command error ${status}: ${packet.body?.statusMessage || ''}`);
        }
      }
    } catch {
      console.warn('[B2] Mensaje WebSocket de Minecraft no válido.');
    }
  });

  socket.on('close', () => {
    clients.delete(socket);
    console.log(`Minecraft desconectado (${clients.size}).`);
  });

  socket.on('error', error => console.error('WebSocket Minecraft:', error.message));
});

let tikTokSocket = null;
let retryTimer = null;

function scheduleTikTokReconnect() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectTikTok();
  }, RETRY_MS);
  console.log('TikTok offline. Reintentando en 10s...');
}

function handleTikTokEvent(type, data) {
  if (!type) return;

  // The direct TikTool WebSocket sends { event, data }.
  // Keep the payload shape intact so likes/gifts/social actions are reliable.
  if (type === 'like') {
    const likeCount = Number(data?.likeCount ?? 0);
    const totalLikes = Number(data?.totalLikes ?? likeCount);
    console.log(`❤️ Like: ${userId(data)} +${likeCount} (total: ${totalLikes})`);
    if (likeCount > 0 || totalLikes > 0) {
      sendEvent('b2:likes', {
        totalLikes,
        likeCount,
        username: userId(data)
      });
    }
    return;
  }

  if (type === 'social') {
    const action = String(data?.action || '').toLowerCase();
    const username = userId(data);
    console.log(`📣 Social: ${action || 'unknown'} → ${username}`);
    if (action === 'follow' || action === 'share') {
      sendEvent('b2:action', { action, username });
    }
    return;
  }

  // Some TikTool clients expose follow/share as separate event names.
  if (type === 'follow' || type === 'share') {
    const username = userId(data);
    console.log(`${type === 'follow' ? '➕ Follow' : '↗️ Share'}: ${username}`);
    sendEvent('b2:action', { action: type, username });
    return;
  }

  if (type === 'gift') {
    const giftName = String(data?.giftName || '').trim();
    const giftId = Number(data?.giftId ?? 0);
    const repeatCount = Math.max(1, Number(data?.repeatCount || 1));
    console.log(`🎁 Regalo: ${giftName || 'desconocido'} (${giftId}) x${repeatCount}`);
    sendEvent('b2:gift', {
      username: userId(data),
      nickname: data?.user?.nickname || data?.nickname || 'TikTok',
      giftName,
      giftId,
      repeatCount,
      giftType: Number(data?.giftType ?? 1),
      diamondCount: Number(data?.diamondCount ?? 1),
      repeatEnd: data?.repeatEnd ? 1 : 0
    });
    return;
  }

  // Useful diagnostics without flooding Termux with every unrelated event.
  if (type !== 'connected' && type !== 'roomInfo') {
    console.log(`📦 TikTok evento: ${type}`);
  }
}

function connectTikTok() {
  if (!TIKTOOL_API_KEY) {
    console.error('Falta TIKTOOL_API_KEY. Configúrala en Termux antes de ejecutar npm start.');
    return;
  }

  if (tikTokSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(tikTokSocket.readyState)) return;

  const url = `wss://api.tik.tools?uniqueId=${encodeURIComponent(TIKTOK_USERNAME)}&apiKey=${encodeURIComponent(TIKTOOL_API_KEY)}`;
  console.log(`Conectando TikTok: @${TIKTOK_USERNAME}...`);

  tikTokSocket = new WebSocket(url);

  tikTokSocket.on('open', () => {
    console.log(`TikTok conectado: @${TIKTOK_USERNAME}`);
  });

  tikTokSocket.on('message', raw => {
    try {
      const message = JSON.parse(raw.toString());
      const type = message?.event || message?.type;
      const data = message?.data || {};
      handleTikTokEvent(type, data);
    } catch (error) {
      console.warn('[B2] Evento TikTok no válido:', error?.message || error);
    }
  });

  tikTokSocket.on('error', error => {
    console.error('Error TikTok:', error?.message || error);
  });

  tikTokSocket.on('close', (code, reason) => {
    const text = reason?.toString?.() || '';
    tikTokSocket = null;
    console.log(`TikTok desconectado (${code}${text ? `: ${text}` : ''}).`);
    scheduleTikTokReconnect();
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
