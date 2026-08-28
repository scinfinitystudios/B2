import { system, world } from '@minecraft/server';

const GIFT_EVENT = 'b2:gift';
const LIKES_EVENT = 'b2:likes';
const ACTION_EVENT = 'b2:action';
const ROSE_NAMES = new Set(['rose', 'rosa']);
const POPULAR_NAMES = new Set(['popular']);
const LOVE_NAMES = new Set(['love me', 'quiereme', 'quiéreme']);
const HEART_NAMES = new Set(['heart', 'corazon', 'corazón']);
const CAPYBARA_NAMES = new Set(['capybara']);

let totalLikes = 0;
let triggered50 = 0;
let triggered100 = 0;

function player() {
  return world.getAllPlayers()[0];
}

function spawn(entityId, count) {
  const target = player();
  if (!target) return;
  const amount = Math.max(0, Math.min(Math.floor(Number(count) || 0), 100));
  const dimension = target.dimension;
  const base = target.location;

  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 5;
    system.runTimeout(() => {
      dimension.spawnEntity(entityId, {
        x: base.x + Math.cos(angle) * radius,
        y: base.y,
        z: base.z + Math.sin(angle) * radius
      });
    }, i * 2);
  }
}

function give(itemId, count) {
  const target = player();
  if (!target) return;
  target.runCommand(`give @s ${itemId} ${Math.max(1, Math.floor(Number(count) || 1))}`);
}

function chargedCreepers(count) {
  const target = player();
  if (!target) return;
  const dimension = target.dimension;
  const base = target.location;
  const amount = Math.min(Math.max(Math.floor(Number(count) || 0), 0), 50);

  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 5;
    system.runTimeout(() => {
      const creeper = dimension.spawnEntity('minecraft:creeper', {
        x: base.x + Math.cos(angle) * radius,
        y: base.y,
        z: base.z + Math.sin(angle) * radius
      });
      try { creeper.triggerEvent('minecraft:become_charged'); } catch {}
    }, i * 2);
  }
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === GIFT_EVENT) {
    let data = {};
    try { data = JSON.parse(event.message || '{}'); } catch { return; }
    const name = String(data.giftName || '').trim().toLowerCase();
    const repeat = Math.max(1, Math.floor(Number(data.repeatCount) || 1));

    if (ROSE_NAMES.has(name)) spawn('minecraft:zombie', 2 * repeat);
    else if (POPULAR_NAMES.has(name)) spawn('minecraft:spider', 5 * repeat);
    else if (LOVE_NAMES.has(name)) spawn('minecraft:witch', 5 * repeat);
    else if (HEART_NAMES.has(name)) spawn('minecraft:skeleton', 10 * repeat);
    else if (CAPYBARA_NAMES.has(name)) chargedCreepers(10 * repeat);
  }

  if (event.id === LIKES_EVENT) {
    let data = {};
    try { data = JSON.parse(event.message || '{}'); } catch { return; }
    const nextLikes = Math.max(totalLikes, Math.floor(Number(data.totalLikes) || 0));
    const new50 = Math.floor(nextLikes / 50);
    const new100 = Math.floor(nextLikes / 100);

    // Acumulativo: cada múltiplo alcanzado vuelve a activar el reto.
    while (triggered50 < new50) {
      triggered50++;
      spawn('minecraft:creeper', 1);
    }
    while (triggered100 < new100) {
      triggered100++;
      spawn('minecraft:creeper', 2);
    }
    totalLikes = nextLikes;
    world.sendMessage(`§e[B2] §fLikes acumulados: §b${totalLikes}`);
  }

  if (event.id === ACTION_EVENT) {
    let data = {};
    try { data = JSON.parse(event.message || '{}'); } catch { return; }
    if (data.action === 'follow') give('minecraft:tnt', 5);
    if (data.action === 'share') give('minecraft:enchanted_golden_apple', 1);
  }
});

world.sendMessage('§6[B2] §fRetos TikTok cargados.');
