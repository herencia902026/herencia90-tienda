import { sendMessage } from './lib/telegram.js';
import { parseMessage } from './lib/parser.js';
import {
  handleAyuda, handleCaja, handleVenta, handleGasto,
  handleStock, handleVentas, handleResumen, handleTop,
  handlePedido, handlePendientes
} from './lib/commands.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const { message } = req.body;
    if (!message || !message.text) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text;

    const allowedChat = process.env.TELEGRAM_CHAT_ID;
    if (allowedChat && String(chatId) !== String(allowedChat)) {
      await sendMessage(chatId, '⛔ No estás autorizado para usar este bot.');
      return res.status(200).json({ ok: true });
    }

    const parsed = parseMessage(text);
    let reply;

    switch (parsed.cmd) {
      case 'ayuda':      reply = await handleAyuda(); break;
      case 'caja':       reply = await handleCaja(); break;
      case 'venta':      reply = await handleVenta(parsed); break;
      case 'gasto':      reply = await handleGasto(parsed); break;
      case 'stock':      reply = await handleStock(parsed); break;
      case 'ventas':     reply = await handleVentas(parsed); break;
      case 'resumen':    reply = await handleResumen(); break;
      case 'top':        reply = await handleTop(); break;
      case 'pedido':     reply = await handlePedido(parsed); break;
      case 'pendientes': reply = await handlePendientes(); break;
      case 'error':      reply = `❌ ${parsed.msg}`; break;
      default:
        reply = `🤔 No entendí ese comando.\nEscribe *ayuda* para ver lo que puedo hacer.`;
    }

    await sendMessage(chatId, reply);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Bot error:', err);
    return res.status(200).json({ ok: true });
  }
}
