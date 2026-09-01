import re

with open("/root/mmpay-shop/server.js", "r") as f:
    text = f.read()

new_func = """async function notifyOwner(botId, order, tx, status) {
  try {
    const { rows } = await pool.query(
      'SELECT bot_full_name, bot_token, owner_telegram_id, currency FROM managed_bots WHERE id = $1',
      [botId]
    );
    const b = rows[0];
    if (!b || !b.bot_token || !b.owner_telegram_id) return;
    const currency = b.currency || 'MMK';
    let items = [];
    try {
      items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    } catch (e) { items = []; }
    let shipping = {};
    try {
      shipping = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {});
    } catch (e) { shipping = {}; }
    let buyer = {};
    try {
      buyer = typeof order.buyer_snapshot === 'string' ? JSON.parse(order.buyer_snapshot) : (order.buyer_snapshot || {});
    } catch (e) { buyer = {}; }

    const itemLines = (items || []).map((i, index) => {
      const name = i.name || i.product_name || `Item #${index + 1}`;
      const qty = i.quantity || 1;
      const price = Number(i.price || 0);
      return `• ${name} (x${qty}) - ${price.toLocaleString()} ${currency}`;
    });
    const itemsText = itemLines.length ? itemLines.join('\\n') : '• (empty)';

    const titles = {
      pending_payment: 'Payment Pending',
      confirmed: 'Payment Verified',
      payment_failed: 'Payment Failed',
      expired: 'Order Expired',
      cancelled: 'Order Cancelled'
    };
    const statusText = titles[status] || status;
    
    const telegramId = order.telegram_id || order.user_id || buyer.telegram_id || buyer.user_id;

    const lines = [
      `<b>New Order Received</b>`,
      `<b>${statusText}</b>`,
      ``,
      `<b>Order ID:</b> ${order.order_number || order.id || 'N/A'}`,
      ``
    ];

    const customerName = shipping.name || buyer.name || 'N/A';
    lines.push(`<b>Name:</b> ${customerName}`);

    const phoneVal = shipping.phone || buyer.phone || 'N/A';
    lines.push(`<b>Phone:</b> ${phoneVal}`);

    const emailVal = shipping.email || buyer.email || 'None';
    lines.push(`<b>Email:</b> ${emailVal}`);

    if (telegramId) {
      lines.push(`<b>User ID:</b> <code>${telegramId}</code>`);
    }

    lines.push(``);
    lines.push(`<b>Products:</b>`);
    lines.push(itemsText);
    lines.push(``);

    let dateStr = "";
    if (order.created_at) {
      const d = new Date(order.created_at);
      if (!isNaN(d.getTime())) {
        const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        const hStr = h.toString().padStart(2, '0');
        dateStr = `${months[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}, ${d.getFullYear()} at ${hStr}:${m} ${ampm}`;
      }
    }
    if (dateStr) {
      lines.push(`<b>Date:</b> ${dateStr}`);
    }

    lines.push(`<b>Amount:</b> ${Number(order.final_amount || order.total_amount || 0).toLocaleString()} ${currency}`);
    lines.push(`<b>Payment Method:</b> Myan Myan Pay MMQR`);

    const notesVal = shipping.notes;
    if (notesVal && notesVal !== 'N/A') {
      lines.push(``);
      lines.push(`<b>Notes:</b> ${notesVal}`);
    }

    if (telegramId) {
      lines.push(``);
      lines.push(`⟵ <b>Swipe left to send message</b>`);
    }

    const text = lines.join('\\n');

    await axios.post(`https://api.telegram.org/bot${b.bot_token}/sendMessage`, {
      chat_id: b.owner_telegram_id,
      text,
      parse_mode: 'HTML',
    }, { family: 4, timeout: 15000 });
  } catch (e) {
    console.error('[mmpay-shop] notify owner failed', e.message);
  }
}"""

pattern = r"async function notifyOwner\(botId, order, tx, status\) \{.*?\n\}"
new_text = re.sub(pattern, new_func, text, flags=re.DOTALL)

with open("/root/mmpay-shop/server.js", "w") as f:
    f.write(new_text)

