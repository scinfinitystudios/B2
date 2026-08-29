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
const spawnQueue = new Map();
let tntQueue = 0;
const BATCH_SIZE = 10;

function player() { return world.getAllPlayers()[0]; }
function queueSpawn(entityId, count) { const amount = Math.max(0, Math.floor(Number(count) || 0)); if (amount) spawnQueue.set(entityId, (spawnQueue.get(entityId) || 0) + amount); }
function aroundPlayer(target) { return { x: target.location.x, y: target.location.y, z: target.location.z }; }
function randomAround(target, minRadius = 3, maxRadius = 8) { const angle = Math.random() * Math.PI * 2; const radius = minRadius + Math.random() * (maxRadius - minRadius); return { x: Math.floor(target.location.x + Math.cos(angle) * radius), y: Math.floor(target.location.y + 1), z: Math.floor(target.location.z + Math.sin(angle) * radius) }; }
function processQueue() { const target = player(); if (!target) return; for (const [entityId, pending] of spawnQueue) { const amount = Math.min(pending, BATCH_SIZE); for (let i = 0; i < amount; i++) { try { target.dimension.spawnEntity(entityId, randomAround(target)); } catch (error) { console.warn(`[B2] Error generando ${entityId}: ${error}`); } } if (pending > amount) spawnQueue.set(entityId, pending - amount); else spawnQueue.delete(entityId); } }
function processTntQueue() {
  const target = player();
  if (!target || tntQueue <= 0) return;
  const amount = Math.min(tntQueue, BATCH_SIZE);
  for (let i = 0; i < amount; i++) {
    try {
      target.runCommand(`summon tnt ${target.location.x} ${target.location.y} ${target.location.z}`);
    } catch (error) {
      console.warn(`[B2] Error generando TNT: ${error}`);
    }
  }
  tntQueue -= amount;
}

system.runInterval(processQueue, 2);
system.runInterval(processTntQueue, 2);
const chargedQueue = { count: 0 };
function processChargedQueue() { const target = player(); if (!target || chargedQueue.count <= 0) return; const amount = Math.min(chargedQueue.count, BATCH_SIZE); for (let i = 0; i < amount; i++) { try { const creeper = target.dimension.spawnEntity('minecraft:creeper', randomAround(target, 4, 9)); try { creeper.triggerEvent('minecraft:become_charged'); } catch {} } catch (error) { console.warn(`[B2] Error generando creeper cargado: ${error}`); } } chargedQueue.count -= amount; }
system.runInterval(processChargedQueue, 2);
function showEvent(title, subtitle = '') { const target = player(); if (!target) return; try { target.onScreenDisplay.setTitle(title, { subtitle, fadeInDuration: 2, stayDuration: 30, fadeOutDuration: 8 }); } catch {} }
world.afterEvents.itemUse.subscribe((event) => { const target = event.source; if (target?.typeId !== 'minecraft:compass') return; showB2Menu(target); });
world.afterEvents.scriptEventReceive.subscribe((event) => {
  let data = {};
  try { data = JSON.parse(event.message || '{}'); } catch { data = { action: String(event.message || '').trim().toLowerCase() }; }
  if (event.id === GIFT_EVENT) { const name = String(data.giftName || '').trim().toLowerCase(); const repeat = Math.max(1, Math.floor(Number(data.repeatCount) || 1)); if (ROSE_NAMES.has(name)) { queueSpawn('minecraft:zombie', 2 * repeat); showEvent('🌹 ROSA', `+${2 * repeat} Zombies cerca de ti`); } else if (POPULAR_NAMES.has(name)) { queueSpawn('minecraft:spider', 5 * repeat); showEvent('🎁 POPULAR', `+${5 * repeat} Arañas cerca de ti`); } else if (LOVE_NAMES.has(name)) { queueSpawn('minecraft:witch', 5 * repeat); showEvent('🎁 QUIÉREME', `+${5 * repeat} Brujas cerca de ti`); } else if (HEART_NAMES.has(name)) { queueSpawn('minecraft:skeleton', 10 * repeat); showEvent('❣️ CORAZÓN', `+${10 * repeat} Esqueletos cerca de ti`); } else if (CAPYBARA_NAMES.has(name)) { chargedQueue.count += 10 * repeat; showEvent('🦫 CAPIBARA', `+${10 * repeat} Creepers cargados cerca de ti`); } }
  if (event.id === LIKES_EVENT) { const nextLikes = Math.max(totalLikes, Math.floor(Number(data.totalLikes) || 0)); const new50 = Math.floor(nextLikes / 50); const new100 = Math.floor(nextLikes / 100); while (triggered50 < new50) { triggered50++; queueSpawn('minecraft:creeper', 1); showEvent('👍 50 LIKES', '+1 Creeper cerca de ti'); } while (triggered100 < new100) { triggered100++; queueSpawn('minecraft:creeper', 3); showEvent('👍 100 LIKES', '+3 Creepers cerca de ti'); } totalLikes = nextLikes; }
  if (event.id === ACTION_EVENT) { if (data.action === 'follow') { tntQueue += 5; showEvent('➕ SEGUIR', '+5 TNT — explota exactamente donde estás'); } if (data.action === 'share') { giveEnchantedApple(); showEvent('↗️ COMPARTIR', '+1 Manzana encantada'); } }
});
function giveEnchantedApple() { const target = player(); if (!target) return; try { target.runCommand('give @s minecraft:enchanted_golden_apple 1'); } catch {} }
world.sendMessage('§6[B2] §fRetos TikTok cargados — eventos acumulables.');
