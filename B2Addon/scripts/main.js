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
  return world.getAllPlayers()[0];
}

function runAtPlayer(target, command) {
  if (!target) return false;
  try { target.runCommand(command); return true; }
  catch (error) { console.warn(`[B2] ${command} -> ${error}`); return false; }
}

function summon(target, entityId, count) {
  for (let i = 0; i < count; i++) runAtPlayer(target, `summon ${entityId} ~ ~ ~`);
}

function giveEnchantedApple(target) {
  runAtPlayer(target, 'give @s minecraft:enchanted_golden_apple 1');
}

function showEvent(target, title, subtitle = '') {
  if (!target) return;
  try { target.onScreenDisplay.setTitle(title, { subtitle, fadeInDuration: 2, stayDuration: 30, fadeOutDuration: 8 }); } catch {}
}

world.afterEvents.itemUse.subscribe((event) => {
  const target = event.source;
  if (target?.typeId !== 'minecraft:player') return;
  if (event.itemStack?.typeId === 'minecraft:compass') showB2Menu(target);
});

// Script events are exposed by system.afterEvents in the Bedrock Script API.
system.afterEvents.scriptEventReceive.subscribe((event) => {
  const target = getTarget(event);
  let data = {};
  const message = String(event.message || '').trim();
  try { data = JSON.parse(message); }
  catch { data = { action: message.toLowerCase() }; }

  if (event.id === GIFT_EVENT) {
    const name = String(data.giftName || '').trim().toLowerCase();
    const repeat = Math.max(1, Math.floor(Number(data.repeatCount) || 1));
    if (ROSE_NAMES.has(name)) {
      summon(target, 'minecraft:zombie', 2 * repeat);
      showEvent(target, '🌹 ROSA', `+${2 * repeat} Zombies`);
    } else if (POPULAR_NAMES.has(name)) {
      summon(target, 'minecraft:spider', 5 * repeat);
      showEvent(target, '🎁 POPULAR', `+${5 * repeat} Arañas`);
    } else if (LOVE_NAMES.has(name)) {
      summon(target, 'minecraft:witch', 5 * repeat);
      showEvent(target, '🎁 QUIÉREME', `+${5 * repeat} Brujas`);
    } else if (HEART_NAMES.has(name)) {
      summon(target, 'minecraft:skeleton', 10 * repeat);
      showEvent(target, '❣️ CORAZÓN', `+${10 * repeat} Esqueletos`);
    } else if (CAPYBARA_NAMES.has(name)) {
      for (let i = 0; i < 10 * repeat; i++) {
        try {
          const creeper = target.dimension.spawnEntity('minecraft:creeper', target.location);
          try { creeper.triggerEvent('minecraft:become_charged'); } catch {}
        } catch (error) { console.warn(`[B2] Error creeper cargado: ${error}`); }
      }
      showEvent(target, '🦫 CAPIBARA', `+${10 * repeat} Creepers cargados`);
    }
  }

  if (event.id === LIKES_EVENT) {
    const nextLikes = Math.max(totalLikes, Math.floor(Number(data.totalLikes) || 0));
    const new50 = Math.floor(nextLikes / 50);
    const new100 = Math.floor(nextLikes / 100);
    while (triggered50 < new50) { triggered50++; summon(target, 'minecraft:creeper', 1); showEvent(target, '👍 50 LIKES', '+1 Creeper'); }
    while (triggered100 < new100) { triggered100++; summon(target, 'minecraft:creeper', 3); showEvent(target, '👍 100 LIKES', '+3 Creepers'); }
    totalLikes = nextLikes;
  }

  if (event.id === ACTION_EVENT) {
    const action = String(data.action || '').trim().toLowerCase();
    if (action === 'follow') {
      summon(target, 'minecraft:tnt', 5);
      showEvent(target, '➕ SEGUIR', '+5 TNT donde estás');
    }
    if (action === 'share') {
      giveEnchantedApple(target);
      showEvent(target, '↗️ COMPARTIR', '+1 Manzana encantada');
    }
  }
});

world.sendMessage('§6[B2] §fRetos TikTok cargados — eventos acumulables.');
