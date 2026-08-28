import { system, world } from '@minecraft/server';

const GIFT_EVENT = 'b2:gift';
const ROSE_NAMES = new Set(['rose', 'rosa']);

function spawnZombies(count = 1) {
  const players = world.getAllPlayers();
  if (players.length === 0) return;

  const player = players[0];
  const base = player.location;
  const dimension = player.dimension;

  for (let i = 0; i < Math.min(Math.max(count, 1), 20); i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 4;

    system.runTimeout(() => {
      dimension.spawnEntity('minecraft:zombie', {
        x: base.x + Math.cos(angle) * radius,
        y: base.y,
        z: base.z + Math.sin(angle) * radius
      });
    }, i * 2);
  }
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== GIFT_EVENT) return;

  let data = {};
  try {
    data = JSON.parse(event.message || '{}');
  } catch {
    console.warn('[B2] Payload de regalo inválido.');
    return;
  }

  const giftName = String(data.giftName || '').trim().toLowerCase();
  if (!ROSE_NAMES.has(giftName)) return;

  const count = Number(data.repeatCount || 1);
  spawnZombies(count);

  world.sendMessage(`§a🌹 Rosa recibida §7→ §2${Math.min(Math.max(count, 1), 20)} zombie(s)`);
});

world.sendMessage('§6[B2] §fTikTok Zombie Add-On cargado.');
