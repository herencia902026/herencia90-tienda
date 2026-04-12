const CATEGORIAS_GASTO = {
  'envio': 'Envíos Nacionales',
  'envíos': 'Envíos Nacionales',
  'caja': 'Material Empaques',
  'cajas': 'Material Empaques',
  'empaque': 'Material Empaques',
  'publicidad': 'Publicidad Pauta',
  'pauta': 'Publicidad Pauta',
  'comision': 'Comisión / PayPal',
  'comisión': 'Comisión / PayPal',
  'paypal': 'Comisión / PayPal',
  'varios': 'Varios',
  'otro': 'Varios'
};

export function parseMessage(text) {
  const raw = text.trim().toLowerCase();

  if (raw === 'ayuda' || raw === '/ayuda' || raw === '/help' || raw === '/start') {
    return { cmd: 'ayuda' };
  }

  if (raw === 'caja' || raw === '/caja') {
    return { cmd: 'caja' };
  }

  if (raw === 'resumen' || raw === '/resumen') {
    return { cmd: 'resumen' };
  }

  if (raw.startsWith('top') || raw === '/top') {
    return { cmd: 'top' };
  }

  if (raw.startsWith('ventas')) {
    const periodo = raw.includes('hoy') ? 'hoy' : raw.includes('mes') ? 'mes' : 'todo';
    return { cmd: 'ventas', periodo };
  }

  if (raw.startsWith('stock') || raw.startsWith('/stock')) {
    const busqueda = raw.replace(/^\/?(stock)\s*/i, '').trim();
    return { cmd: 'stock', busqueda: busqueda || null };
  }

  if (raw.startsWith('pedido') || raw.startsWith('/pedido')) {
    const desc = text.replace(/^\/?(pedido)\s*/i, '').trim();
    return { cmd: 'pedido', descripcion: desc };
  }

  if (raw === 'pendientes' || raw === '/pendientes') {
    return { cmd: 'pendientes' };
  }

  const ventaMatch = raw.match(/^\/?(venta|vendí|vendi)\s+(.+)/i);
  if (ventaMatch) {
    const resto = text.replace(/^\/?(venta|vendí|vendi)\s+/i, '').trim();
    const tallaMatch = resto.match(/\b(XS|S|M|L|XL|XXL)\b/i);
    const precioMatch = resto.match(/\b(\d{4,7})\b/);
    const costoMatch = resto.match(/costo\s+([\d.]+)/i);
    const talla = tallaMatch ? tallaMatch[1].toUpperCase() : 'M';
    const precio = precioMatch ? parseInt(precioMatch[1]) : null;
    const costoUsd = costoMatch ? parseFloat(costoMatch[1]) : 10.44;
    const equipo = resto
      .replace(/\b(XS|S|M|L|XL|XXL)\b/i, '')
      .replace(/\b\d{4,7}\b/, '')
      .replace(/costo\s+[\d.]+/i, '')
      .trim();
    if (!precio) return { cmd: 'error', msg: 'No entendí el precio. Ej: `venta colombia L 90000`' };
    return { cmd: 'venta', equipo, talla, precio, costoUsd };
  }

  const gastoMatch = raw.match(/^\/?(gasto|gasté|gaste)\s+(.+)/i);
  if (gastoMatch) {
    const resto = text.replace(/^\/?(gasto|gasté|gaste)\s+/i, '').trim();
    const montoMatch = resto.match(/\b(\d{3,9})\b/);
    const monto = montoMatch ? parseInt(montoMatch[1]) : null;
    if (!monto) return { cmd: 'error', msg: 'No entendí el monto. Ej: `gasto envio cajas 22000`' };
    const descripcion = resto.replace(/\b\d{3,9}\b/, '').trim();
    const palabras = descripcion.toLowerCase().split(/\s+/);
    let categoria = 'Varios';
    for (const p of palabras) {
      if (CATEGORIAS_GASTO[p]) { categoria = CATEGORIAS_GASTO[p]; break; }
    }
    return { cmd: 'gasto', categoria, descripcion, monto };
  }

  return { cmd: 'desconocido', msg: text };
}
