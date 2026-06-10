// utils/paymentReceiptTemplate.js
const path = require("path");
const fs   = require("fs");

function localImageToBase64(filePath) {
  try {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) return null;
    const ext  = path.extname(abs).toLowerCase().replace(".", "");
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
    return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
  } catch { return null; }
}

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function paymentStatusStyle(status) {
  const map = {
    Paid:     { bg: "#ecfdf5", color: "#166534", border: "#86efac" },
    Pending:  { bg: "#fefce8", color: "#854d0e", border: "#fde047" },
    Failed:   { bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
    Refunded: { bg: "#f5f3ff", color: "#4c1d95", border: "#c4b5fd" },
  };
  return map[status] || { bg: "#f9fafb", color: "#374151", border: "#d1d5db" };
}

function orderStatusStyle(status) {
  const map = {
    Delivered:    { bg: "#ecfdf5", color: "#166534" },
    Cancelled:    { bg: "#fef2f2", color: "#991b1b" },
    Pending:      { bg: "#fefce8", color: "#854d0e" },
    Processing:   { bg: "#eff6ff", color: "#1e40af" },
    Shipped:      { bg: "#f0f9ff", color: "#075985" },
    "On The Way": { bg: "#fdf4ff", color: "#701a75" },
    "In Transit": { bg: "#f0fdf4", color: "#14532d" },
    "Picked Up":  { bg: "#fffbeb", color: "#78350f" },
    Returned:     { bg: "#f9fafb", color: "#374151" },
  };
  return map[status] || { bg: "#f9fafb", color: "#374151" };
}

function generatePaymentReceiptHTML(order, logoPath, taxes = []) {
  const logoBase64 = localImageToBase64(logoPath);
  const logoTag    = logoBase64
    ? `<img src="${logoBase64}" alt="Gramin Kart" class="logo-img" />`
    : `<span class="logo-text">Gramin Kart</span>`;

  const addr      = order.shippingAddress || {};
  const addrParts = [addr.house, addr.road, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean);
  const addrLine  = addrParts.join(", ");

  const user   = order.user || {};
  const pStyle = paymentStatusStyle(order.paymentStatus);
  const oStyle = orderStatusStyle(order.status);

  const transactionId =
    order.razorpayPaymentId ||
    order.stripePaymentId   ||
    (order.paymentMethod === "COD" ? "Cash on Delivery" : "N/A");

  const paidAmount = order.paymentStatus === "Paid" ? order.total : 0;
  const dueAmount  = order.paymentStatus === "Paid" ? 0 : order.total;

  const subtotal = Number(order.subtotal || 0);

  const itemRows = (order.items || []).map((item, i) => `
    <tr>
      <td class="td-num">${i + 1}</td>
      <td class="td-name">${item.name || "—"}</td>
      <td class="td-center">${item.quantity}</td>
      <td class="td-right">${fmt(item.price)}</td>
      <td class="td-right td-bold">${fmt(item.total)}</td>
    </tr>
  `).join("");

  const couponRow = Number(order.couponDiscount) > 0 ? `
    <tr>
      <td class="sum-label">
        Coupon Discount
        ${order.couponCode ? `<span class="coupon-tag">${order.couponCode}</span>` : ""}
      </td>
      <td class="sum-val red">−${fmt(order.couponDiscount)}</td>
    </tr>` : "";

  const discountRow = Number(order.discount) > 0 ? `
    <tr>
      <td class="sum-label">Discount</td>
      <td class="sum-val red">−${fmt(order.discount)}</td>
    </tr>` : "";

  // ── Tax rows: per-tax breakdown or fallback to order.tax ──
  const taxRows = taxes.length > 0
    ? taxes.map(t => {
        const pct    = Number(t.percentage || 0);
        const amount = (subtotal * pct / 100);
        return `
    <tr>
      <td class="sum-label">${t.taxName} (${pct.toFixed(1)}%)</td>
      <td class="sum-val">${fmt(amount)}</td>
    </tr>`;
      }).join("")
    : Number(order.tax) > 0
      ? `<tr>
           <td class="sum-label">Tax / GST</td>
           <td class="sum-val">${fmt(order.tax)}</td>
         </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Receipt — ${order.orderNumber || order._id}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #f1f5f9;
    color: #1e293b;
    padding: 32px 16px;
    font-size: 13px;
    line-height: 1.5;
  }

  .page {
    max-width: 680px;
    margin: 0 auto;
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  /* ── Header ── */
  .header {
    background: #1a5f2a;
    padding: 24px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .logo-img  { height: 44px; width: auto; object-fit: contain; }
  .logo-text { font-size: 18px; font-weight: 700; color: #fff; }
  .header-right { text-align: right; }
  .receipt-title { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: 0.3px; }
  .receipt-sub   { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
  .receipt-num   { font-size: 12px; font-weight: 600; color: #86efac; margin-top: 4px; }

  /* ── Status bar ── */
  .status-bar {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 10px 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .status-key  { font-size: 11px; color: #94a3b8; font-weight: 500; }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    border: 1px solid transparent;
  }
  .sep { color: #cbd5e1; font-size: 10px; }
  .status-date { font-size: 11px; color: #64748b; font-weight: 500; }

  /* ── Body ── */
  .body { padding: 24px 32px 28px; }

  /* ── Amount row ── */
  .amount-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
  .amt-box {
    border-radius: 8px;
    padding: 14px 16px;
    text-align: center;
    border: 1px solid;
  }
  .amt-box-paid { background: #f0fdf4; border-color: #86efac; }
  .amt-box-due  { background: #fffbeb; border-color: #fcd34d; }
  .amt-label    { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; margin-bottom: 4px; }
  .amt-value      { font-size: 20px; font-weight: 700; color: #166534; }
  .amt-value-due  { font-size: 20px; font-weight: 700; color: #92400e; }

  /* ── Section title ── */
  .sec-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    margin-bottom: 10px;
    margin-top: 20px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f1f5f9;
  }

  /* ── Info grid ── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 4px;
  }
  .info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }
  .info-row:last-child { margin-bottom: 0; }
  .info-key { font-size: 11px; color: #94a3b8; flex-shrink: 0; }
  .info-val { font-size: 12px; color: #1e293b; font-weight: 600; text-align: right; word-break: break-all; }
  .info-val-sm { font-size: 11px; color: #475569; text-align: right; word-break: break-all; }
  .tx-id {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 5px 8px;
    border-radius: 6px;
    word-break: break-all;
    margin-top: 4px;
    line-height: 1.5;
  }

  /* ── Address ── */
  .addr-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #1a5f2a;
    border-radius: 0 8px 8px 0;
    padding: 12px 14px;
  }
  .addr-name  { font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 3px; }
  .addr-phone { font-size: 11px; color: #64748b; margin-bottom: 3px; }
  .addr-line  { font-size: 11px; color: #475569; line-height: 1.6; }

  /* ── Table ── */
  .items-wrap { margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1a5f2a; }
  thead th {
    padding: 9px 12px;
    font-size: 10px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .th-l { text-align: left; }
  .th-c { text-align: center; }
  .th-r { text-align: right; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  td { padding: 9px 12px; font-size: 12px; color: #374151; vertical-align: middle; }
  .td-num    { text-align: center; color: #94a3b8; font-size: 11px; width: 34px; }
  .td-name   { font-weight: 500; }
  .td-center { text-align: center; }
  .td-right  { text-align: right; }
  .td-bold   { text-align: right; font-weight: 600; color: #1a5f2a; }

  /* ── Summary ── */
  .summary-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
  .summary-table { width: 240px; }
  .summary-table table { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .sum-label { padding: 7px 12px; font-size: 12px; color: #64748b; text-align: left; border-bottom: 1px solid #f1f5f9; }
  .sum-val   { padding: 7px 12px; font-size: 12px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #f1f5f9; }
  .sum-label.red, .sum-val.red { color: #dc2626; }
  .coupon-tag {
    display: inline-block;
    font-size: 9px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fca5a5;
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: 4px;
    font-weight: 700;
  }
  .sum-total-label {
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: #1a5f2a;
    text-align: left;
  }
  .sum-total-val {
    padding: 10px 12px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    background: #1a5f2a;
    text-align: right;
  }

  /* ── Footer ── */
  .footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 14px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .footer-left  { font-size: 11px; color: #64748b; }
  .footer-brand { font-size: 12px; font-weight: 700; color: #1a5f2a; margin-bottom: 2px; }
  .footer-right { font-size: 10px; color: #94a3b8; text-align: right; }
  .footer-link  { color: #1a5f2a; font-weight: 600; }

  @media print {
    body { background: #fff; padding: 0; }
    .page { border: none; border-radius: 0; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>${logoTag}</div>
    <div class="header-right">
      <div class="receipt-title">Payment Receipt</div>
      <div class="receipt-sub">Official Transaction Record</div>
      <div class="receipt-num">${order.orderNumber || `#${String(order._id).slice(-8).toUpperCase()}`}</div>
    </div>
  </div>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <span class="status-key">Payment</span>
    <span class="badge" style="background:${pStyle.bg};color:${pStyle.color};border-color:${pStyle.border}">
      ${order.paymentStatus || "Pending"}
    </span>
    <span class="sep">|</span>
    <span class="status-key">Order</span>
    <span class="badge" style="background:${oStyle.bg};color:${oStyle.color}">
      ${order.status || "Pending"}
    </span>
    <span class="sep">|</span>
    <span class="status-date">${fmtDate(order.createdAt)}</span>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- AMOUNTS -->
    <div class="amount-row">
      <div class="amt-box amt-box-paid">
        <div class="amt-label">Paid Amount</div>
        <div class="amt-value">${fmt(paidAmount)}</div>
      </div>
      <div class="amt-box amt-box-due">
        <div class="amt-label">Due Amount</div>
        <div class="amt-value-due">${fmt(dueAmount)}</div>
      </div>
    </div>

    <!-- PAYMENT DETAILS -->
    <div class="sec-title">Payment Details</div>
    <div class="info-grid">
      <div class="info-card">
        <div class="info-row">
          <span class="info-key">Method</span>
          <span class="info-val">${order.paymentMethod || "COD"}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Status</span>
          <span class="badge" style="background:${pStyle.bg};color:${pStyle.color};border-color:${pStyle.border};font-size:10px">
            ${order.paymentStatus || "Pending"}
          </span>
        </div>
        <div class="info-row">
          <span class="info-key">Date</span>
          <span class="info-val-sm">${fmtDateTime(order.createdAt)}</span>
        </div>
      </div>

      <div class="info-card">
        <div class="info-key">Transaction ID</div>
        <div class="tx-id">${transactionId}</div>
        ${order.razorpayOrderId ? `
        <div class="info-key" style="margin-top:8px">Razorpay Order ID</div>
        <div class="tx-id">${order.razorpayOrderId}</div>
        ` : ""}
      </div>
    </div>

    <!-- CUSTOMER DETAILS -->
    <div class="sec-title">Customer Details</div>
    <div class="info-grid">
      <div class="info-card">
        <div class="info-row">
          <span class="info-key">Name</span>
          <span class="info-val">${user.fullName || addr.name || "—"}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Email</span>
          <span class="info-val-sm">${user.email || "—"}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Phone</span>
          <span class="info-val">${user.phone || addr.phone || "—"}</span>
        </div>
      </div>

      <div class="addr-card">
        <div class="addr-name">${addr.name || user.fullName || "—"}</div>
        <div class="addr-phone">${addr.phone || ""}${addr.altPhone ? ` / ${addr.altPhone}` : ""}</div>
        <div class="addr-line">${addrLine || "—"}</div>
      </div>
    </div>

    <!-- ORDER ITEMS -->
    <div class="sec-title">Order Summary</div>
    <div class="items-wrap">
      <table>
        <thead>
          <tr>
            <th class="th-c" style="width:34px">#</th>
            <th class="th-l">Item</th>
            <th class="th-c" style="width:60px">Qty</th>
            <th class="th-r" style="width:90px">Price</th>
            <th class="th-r" style="width:90px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:18px">No items found</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- TOTALS -->
    <div class="summary-wrap">
      <div class="summary-table">
        <table>
          <tr>
            <td class="sum-label">Subtotal</td>
            <td class="sum-val">${fmt(order.subtotal)}</td>
          </tr>
          ${discountRow}
          ${couponRow}
          <tr>
            <td class="sum-label">Shipping</td>
            <td class="sum-val">${fmt(order.shippingCharge)}</td>
          </tr>
          ${taxRows}
          <tr>
            <td class="sum-total-label">Grand Total</td>
            <td class="sum-total-val">${fmt(order.total)}</td>
          </tr>
        </table>
      </div>
    </div>

  </div><!-- /body -->

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">Gramin Kart</div>
      <div>Thank you for shopping with us!</div>
    </div>
    <div class="footer-right">
      <div><a class="footer-link">support@graminkart.com</a></div>
      <div style="margin-top:3px">Generated: ${fmtDateTime(new Date())}</div>
      <div style="margin-top:2px">Computer-generated receipt · No signature required</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

module.exports = { generatePaymentReceiptHTML };