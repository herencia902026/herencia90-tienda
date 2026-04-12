import { db } from './supabase.js';

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => today().substring(0, 7);

export async function handleAyuda() {
  return `🏆 *H90 Assistant — Herencia 90*\n\n` +
    `*Registrar:*\n` +
    `• \`venta colombia L 90000\`\n` +
    `• \`venta real madrid negra L 100000 costo 13.44\`\n` +
    `• \`gasto envio cajas 22000\`\n` +
    `• \`gasto publicidad instagram 50000\`\n\n` +
    `*Consultar:*\n` +
    `• \`caja\` — saldo actual\n` +
    `• \`stock colombia\` — inventario de un equipo\n` +
    `• \`ventas hoy\` / \`ventas mes\`\n` +
    `• \`resumen\` — resumen del mes\n` +
    `• \`top\` — camisetas más vendidas\n` +
    `• \`pendientes\` — pedidos sin enviar\n\n` +
    `*Pedidos:*\n` +
    `• \`pedido Juan García - Colombia L - Bogotá\``;
}

export async function handleCaja() {
  const { data } = await db.from('transacciones').select('tipo, monto');
  const ingresos = data.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0);
  const gastos = data.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0);
  const caja = ingresos - gastos;
  return `💵 *Caja actual:* ${fmt.format(caja)}\n📈 Ingresos totales: ${fmt.format(ingresos)}\n📉 Gastos totales: ${fmt.format(gastos)}`;
}

export async function handleVenta({ equipo, talla, precio, costoUsd }) {
  const trm = 3714;
  const trans = {
    id: Date.now(),
    tipo: 'ingreso',
    categoria: 'Venta de Producto',
    fecha: today(),
    monto: precio,
    usd_amount: precio / trm,
    trm,
    descripcion: `Camiseta ${equipo} talla ${talla} $${fmt.format(precio)}`,
    costo_usd_asociado: costoUsd
  };
  const { error } = await db.from('transacciones').insert(trans);
  if (error) return `❌ Error guardando venta: ${error.message}`;

  const { data: prods } = await db.from('productos')
    .select('id, equipo, tallas')
    .ilike('equipo', `%${equipo}%`);

  if (prods && prods.length === 1) {
    const prod = prods[0];
    const tallas = prod.tallas;
    if (tallas[talla] > 0) {
      tallas[talla] = tallas[talla] - 1;
      await db.from('productos').update({ tallas }).eq('id', prod.id);
      const alerta = tallas[talla] === 0 ? `\n⚠️ *Stock talla ${talla} agotado*` :
                     tallas[talla] <= 2 ? `\n⚡ Solo quedan ${tallas[talla]} en talla ${talla}` : '';
      return `✅ *Venta registrada*\n📦 ${prod.equipo} — Talla ${talla}\n💰 ${fmt.format(precio)}${alerta}`;
    }
  }

  return `✅ *Venta registrada*\n📦 ${equipo} — Talla ${talla}\n💰 ${fmt.format(precio)}\n_(stock no actualizado — producto no identificado exactamente)_`;
}

export async function handleGasto({ categoria, descripcion, monto }) {
  const trans = {
    id: Date.now(),
    tipo: 'gasto',
    categoria,
    fecha: today(),
    monto,
    usd_amount: monto / 3714,
    trm: 3714,
    descripcion,
    costo_usd_asociado: 0
  };
  const { error } = await db.from('transacciones').insert(trans);
  if (error) return `❌ Error guardando gasto: ${error.message}`;
  return `✅ *Gasto registrado*\n📁 ${categoria}\n📝 ${descripcion}\n💸 -${fmt.format(monto)}`;
}

export async function handleStock({ busqueda }) {
  let query = db.from('productos').select('equipo, tallas, precio, costo_usd');
  if (busqueda) query = query.ilike('equipo', `%${busqueda}%`);
  const { data } = await query.order('equipo');
  if (!data || data.length === 0) return `❌ No encontré productos con "${busqueda}"`;

  let msg = busqueda ? `📦 *Stock — "${busqueda}":*\n\n` : `📦 *Inventario completo:*\n\n`;
  data.forEach(p => {
    const t = p.tallas;
    const total = (t.S||0) + (t.M||0) + (t.L||0) + (t.XL||0);
    const emoji = total === 0 ? '🔴' : total <= 3 ? '🟡' : '🟢';
    msg += `${emoji} *${p.equipo}*\n`;
    msg += `   S:${t.S||0} M:${t.M||0} L:${t.L||0} XL:${t.XL||0} | Total: ${total}\n`;
  });
  return msg;
}

export async function handleVentas({ periodo }) {
  let query = db.from('transacciones').select('*').eq('tipo', 'ingreso').eq('categoria', 'Venta de Producto');
  const hoy = today();
  const mes = thisMonth();
  if (periodo === 'hoy') query = query.eq('fecha', hoy);
  else if (periodo === 'mes') query = query.like('fecha', `${mes}%`);

  const { data } = await query.order('fecha', { ascending: false });
  if (!data || data.length === 0) return `📊 No hay ventas registradas ${periodo === 'hoy' ? 'hoy' : periodo === 'mes' ? 'este mes' : ''}.`;

  const total = data.reduce((s, t) => s + Number(t.monto), 0);
  const ganancia = data.reduce((s, t) => s + Number(t.monto) - (Number(t.costo_usd_asociado) * Number(t.trm)), 0);

  let msg = `📊 *Ventas ${periodo === 'hoy' ? 'de hoy' : periodo === 'mes' ? 'del mes' : 'totales'}:*\n\n`;
  data.slice(0, 10).forEach(t => {
    msg += `• ${t.descripcion} — ${fmt.format(t.monto)}\n`;
  });
  if (data.length > 10) msg += `_...y ${data.length - 10} más_\n`;
  msg += `\n💰 *Total vendido:* ${fmt.format(total)}`;
  msg += `\n💎 *Ganancia neta:* ${fmt.format(ganancia)}`;
  return msg;
}

export async function handleResumen() {
  const mes = thisMonth();
  const { data } = await db.from('transacciones').select('*').like('fecha', `${mes}%`);
  if (!data || data.length === 0) return `📋 No hay transacciones este mes.`;

  const ingresos = data.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0);
  const gastos = data.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0);
  const ventas = data.filter(t => t.tipo === 'ingreso' && t.categoria === 'Venta de Producto');
  const totalVentas = ventas.reduce((s, t) => s + Number(t.monto), 0);
  const ganancia = ventas.reduce((s, t) => s + Number(t.monto) - (Number(t.costo_usd_asociado) * Number(t.trm)), 0);

  const [y, m] = mes.split('-');
  const nombreMes = new Date(y, m - 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' });

  return `📋 *Resumen ${nombreMes}*\n\n` +
    `📈 Ingresos totales: ${fmt.format(ingresos)}\n` +
    `📉 Gastos totales: ${fmt.format(gastos)}\n` +
    `💰 Saldo del mes: ${fmt.format(ingresos - gastos)}\n\n` +
    `👕 Ventas de camisetas: ${ventas.length} unidades\n` +
    `💵 Total vendido: ${fmt.format(totalVentas)}\n` +
    `💎 Ganancia neta: ${fmt.format(ganancia)}`;
}

export async function handleTop() {
  const { data } = await db.from('transacciones')
    .select('descripcion, monto')
    .eq('tipo', 'ingreso')
    .eq('categoria', 'Venta de Producto');

  if (!data || data.length === 0) return '📊 No hay ventas registradas aún.';

  const conteo = {};
  data.forEach(t => {
    const key = t.descripcion.split(' talla ')[0].replace('Camiseta ', '');
    conteo[key] = (conteo[key] || 0) + 1;
  });

  const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let msg = '🏆 *Top camisetas más vendidas:*\n\n';
  sorted.forEach(([nombre, cant], i) => {
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    msg += `${medallas[i]} ${nombre}: ${cant} unidad${cant > 1 ? 'es' : ''}\n`;
  });
  return msg;
}

export async function handlePedido({ descripcion }) {
  const trans = {
    id: Date.now(),
    tipo: 'gasto',
    categoria: 'Envíos Nacionales',
    fecha: today(),
    monto: 0,
    usd_amount: 0,
    trm: 3714,
    descripcion: `[PENDIENTE] ${descripcion}`,
    costo_usd_asociado: 0
  };
  const { error } = await db.from('transacciones').insert(trans);
  if (error) return `❌ Error: ${error.message}`;
  return `📦 *Pedido registrado como pendiente:*\n${descripcion}\n\nCuando lo envíes, regístralo con \`gasto envio [valor]\``;
}

export async function handlePendientes() {
  const { data } = await db.from('transacciones')
    .select('fecha, descripcion')
    .like('descripcion', '[PENDIENTE]%')
    .order('fecha', { ascending: false });

  if (!data || data.length === 0) return '✅ No hay pedidos pendientes.';
  let msg = '📦 *Pedidos pendientes:*\n\n';
  data.forEach(t => { msg += `• ${t.fecha} — ${t.descripcion.replace('[PENDIENTE] ', '')}\n`; });
  return msg;
}
