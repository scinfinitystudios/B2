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
const BATCH_SIZE = 10;
function player() { return world.getAllPlayers()[0]; }
function queueSpawn(entityId, count) { const amount = Math.max(0, Math.floor(Number(count) || 0)); if (amount) spawnQueue.set(entityId, (spawnQueue.get(entityId) || 0) + amount); }
function processQueue() { const target = player(); if (!target) return; for (const [entityId, pending] of spawnQueue) { const amount = Math.min(pending, BATCH_SIZE); for (let i = 0; i < amount; i++) { const angle = Math.random() * Math.PI * 2; const radius = 3 + Math.random() * 5; try { target.dimension.spawnEntity(entityId, { x: target.location.x + Math.cos(angle) * radius, y: target.location.y, z: target.location.z + Math.sin(angle) * radius }); } catch (error) { console.warn(`[B2] Error generando ${entityId}: ${error}`); } } if (pending > amount) spawnQueue.set(entityId, pending - amount); else spawnQueue.delete(entityId); } }
system.runInterval(processQueue, 2);
function give(itemId, count) { const target = player(); if (!target) return; try { target.runCommand(`give @s ${itemId} ${Math.max(1, Math.floor(Number(count) || 1))}`); } catch (error) { console.warn(`[B2] Error dando ${itemId}: ${error}`); } }
const chargedQueue = { count: 0 };
function processChargedQueue() { const target = player(); if (!target || chargedQueue.count <= 0) return; const amount = Math.min(chargedQueue.count, BATCH_SIZE); for (let i = 0; i < amount; i++) { const angle = Math.random() * Math.PI * 2; const radius = 4 + Math.random() * 5; try { const creeper = target.dimension.spawnEntity('minecraft:creeper', { x: target.location.x + Math.cos(angle) * radius, y: target.location.y, z: target.location.z + Math.sin(angle) * radius }); try { creeper.triggerEvent('minecraft:become_charged'); } catch {} } catch (error) { console.warn(`[B2] Error generando creeper cargado: ${error}`); } } chargedQueue.count -= amount; }
system.runInterval(processChargedQueue, 2);
function showEvent(title, subtitle = '') { const target = player(); if (!target) return; try { target.onScreenDisplay.setTitle(title, { subtitle, fadeInDuration: 2, stayDuration: 30, fadeOutDuration: 8 }); } catch (error) { console.warn(`[B2] Error mostrando evento: ${error}`); } }
world.afterEvents.itemUse.subscribe((event) => { const target = event.source; if (target?.typeId !== 'minecraft:compass') return; showB2Menu(target); });
world.afterEvents.scriptEventReceive.subscribe((event) => {
  let data = {}; try { data = JSON.parse(event.message || '{}'); } catch { return; }
  if (event.id === GIFT_EVENT) { const name = String(data.giftName || '').trim().toLowerCase(); const repeat = Math.max(1, Math.floor(Number(data.repeatCount) || 1)); if (ROSE_NAMES.has(name)) { queueSpawn('minecraft:zombie', 2 * repeat); showEvent('🌹 ROSA', `+${2 * repeat} Zombies`); } else if (POPULAR_NAMES.has(name)) { queueSpawn('minecraft:spider', 5 * repeat); showEvent('🎁 POPULAR', `+${5 * repeat} Arañas`); } else if (LOVE_NAMES.has(name)) { queueSpawn('minecraft:witch', 5 * repeat); showEvent('🎁 QUIÉREME', `+${5 * repeat} Brujas`); } else if (HEART_NAMES.has(name)) { queueSpawn('minecraft:skeleton', 10 * repeat); showEvent('❣️ CORAZÓN', `+${10 * repeat} Esqueletos`); } else if (CAPYBARA_NAMES.has(name)) { chargedQueue.count += 10 * repeat; showEvent('🦫 CAPIBARA', `+${10 * repeat} Creepers cargados`); } }
  if (event.id === LIKES_EVENT) { const nextLikes = Math.max(totalLikes, Math.floor(Number(data.totalLikes) || 0)); const new50 = Math.floor(nextLikes / 50); const new100 = Math.floor(nextLikes / 100); while (triggered50 < new50) { triggered50++; queueSpawn('minecraft:creeper', 1); showEvent('👍 50 LIKES', '+1 Creeper'); } while (triggered100 < new100) { triggered100++; queueSpawn('minecraft:creeper', 2); showEvent('👍 100 LIKES', '+2 Creepers'); } totalLikes = nextLikes; }
  if (event.id === ACTION_EVENT) { if (data.action === 'follow') { give('minecraft:tnt', 5); showEvent('➕ SEGUIR', '+5 TNT'); } if (data.action === 'share') { give('minecraft:enchanted_golden_apple', 1); showEvent('↗️ COMPARTIR', '+1 Manzana encantada'); } }
});
world.sendMessage('§6[B2] §fRetos TikTok cargados — menú y eventos acumulables.');
