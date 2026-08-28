import { ActionFormData } from '@minecraft/server-ui';

export async function showB2Menu(player) {
  const form = new ActionFormData()
    .title('B2')
    .body('Eventos TikTok • acumulables ♾️')
    .button('➕ Seguir\n5 TNT')
    .button('👍 Likes\n50 → 1 Creeper\n100 → 2 Creepers')
    .button('🌹 Rosa\n2 Zombies')
    .button('🎁 Popular\n5 Arañas')
    .button('🎁 Quiéreme\n5 Brujas')
    .button('❣️ Corazón\n10 Esqueletos')
    .button('🦫 Capibara\n10 Creepers cargados')
    .button('↗️ Compartir\n1 Manzana encantada');

  try {
    const result = await form.show(player);
    if (result.canceled) return;
    player.sendMessage('§6[B2] §fEste menú es informativo: los eventos se activan mediante los eventos TikTok.');
  } catch (error) {
    console.warn(`[B2] Error mostrando menú: ${error}`);
  }
}
