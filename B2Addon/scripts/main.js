import { system, world } from '@minecraft/server';
import { showB2Menu } from './menu.js';

const GIFT_EVENT = 'b2:gift';
const LIKES_EVENT = 'b2:likes';
const ACTION_EVENT = 'b2:action';
const ROSE_NAMES = new Set(['rose', 'rosa']);
const POPULAR_NAMES = new Set(['popular']);
const LOVE_NAMES = new Set(['love me', 'quiereme', 'quiéreme']);
const HEART_NAMES = new Set(['heart', 'corazon', 'corazón']);
const CAPYBARA_NAMES = new Set(['capybara', 'capibara']);
let totalLikes = 0;
let triggered50 = 0;
let triggered100 = 0;

function getTarget(event) {
  if (event?.sourceEntity?.typeId === 'minecraft:player') return event.sourceEntity;
  if (event?.initiator?.typeId === 'minecraft:player') return event.initiator;
  const players = world.getAllPlayers();
  return players.length ? players[0] : undefined;
}

function summon(target, entityId, count) {
  if (!target) return;
  for (let i = 0; i < count; i++) {
    try {
      target.dimension.spawnEntity(entityId, {
        x: target.location.x,
        y: target.location.y,
        z: target.location.z
      });
    } catch (error) {
      console.warn(`[B2] Error generando ${entityId}: ${error}`);
    }
  }
}

function summonTnt(target, count) {
  if (!target) return;
  for (let i = 0; i < count; i++) {
    try {
      target.runCommand('summon tnt ~ ~ ~');
    } catch (error) {
      console.warn(`[B2] Error generando TNT: ${error}`);
    }
  }
}

function giveEnchantedApple(target) {
  if (!target) return;
  try { target.runCommand('give @s minecraft:enchanted_golden_apple 1'); }
  catch (error) { console.warn(`[B2] Error dando manzana: ${error}`); }
}

function showEvent(target, title, subtitle = '') {
  if (!target) return;
  try {
    target.onScreenDisplay.setTitle(title, {
      subtitle,
      fadeInDuration: 2,
      stayDuration: 30,
      fadeOutDuration: 8
    });
  } catch {}
}

world.afterEvents.itemUse.subscribe((event) => {
  const target = event.source;
  if (target?.typeId !== 'minecraft:player') return;
  if (event.itemStack?.typeId === 'minecraft:compass') showB2Menu(target);
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
  const target = getTarget(event);
  if (!target) return;

  const message = String(event.message ?? '').trim();
  let data = {};
  try {
    data = message ? JSON.parse(message) : {};
  } catch {
    data = { action: message.toLowerCase(), giftName: message.toLowerCase() };
  }

  if (event.id === GIFT_EVENT) {
    const name = String(data.giftName || data.gift || '').trim().toLowerCase();
    const repeat = Math.max(1, Math.floor(Number(data.repeatCount) || 1));

    if (ROSE_NAMES.has(name)) {
      summon(target, 'minecraft:zombie', 2 * repeat);
      showEvent(target, '🌹 ROSA', `+${2 * repeat} Zombies cerca de ti`);
    } else if (POPULAR_NAMES.has(name)) {
      summon(target, 'minecraft:spider', 5 * repeat);
      showEvent(target, '🎁 POPULAR', `+${5 * repeat} Arañas cerca de ti`);
    } else if (LOVE_NAMES.has(name)) {
      summon(target, 'minecraft:witch', 5 * repeat);
      showEvent(target, '🎁 QUIÉREME', `+${5 * repeat} Brujas cerca de ti`);
    } else if (HEART_NAMES.has(name)) {
      summon(target, 'minecraft:skeleton', 10 * repeat);
      showEvent(target, '❣️ CORAZÓN', `+${10 * repeat} Esqueletos cerca de ti`);
    } else if (CAPYBARA_NAMES.has(name)) {
      for (let i = 0; i < 10 * repeat; i++) {
        try {
          const creeper = target.dimension.spawnEntity('minecraft:creeper', {
            x: target.location.x,
            y: target.location.y,
            z: target.location.z
          });
          try { creeper.triggerEvent('minecraft:become_charged'); } catch {}
        } catch (error) {
          console.warn(`[B2] Error generando creeper cargado: ${error}`);
        }
      }
      showEvent(target, '🦫 CAPIBARA', `+${10 * repeat} Creepers cargados cerca de ti`);
    }
    return;
  }

  if (event.id === LIKES_EVENT) {
    const nextLikes = Math.max(totalLikes, Math.floor(Number(data.totalLikes) || 0));
    const new50 = Math.floor(nextLikes / 50);
    const new100 = Math.floor(nextLikes / 100);

    while (triggered50 < new50) {
      triggered50++;
      summon(target, 'minecraft:creeper', 1);
      showEvent(target, '👍 50 LIKES', '+1 Creeper cerca de ti');
    }

    while (triggered100 < new100) {
      triggered100++;
      summon(target, 'minecraft:creeper', 3);
      showEvent(target, '👍 100 LIKES', '+3 Creepers cerca de ti');
    }

    totalLikes = nextLikes;
    return;
  }

  if (event.id === ACTION_EVENT) {
    const action = String(data.action || message).trim().toLowerCase();

    if (action === 'follow') {
      summonTnt(target, 5);
      showEvent(target, '➕ SEGUIR', '+5 TNT donde estás');
    } else if (action === 'share') {
      giveEnchantedApple(target);
      showEvent(target, '↗️ COMPARTIR', '+1 Manzana encantada');
    }
  }
});

world.sendMessage('§6[B2] §fRetos TikTok cargados — eventos acumulables.');
