// utils/invoiceTemplate.js
// Generates the HTML string for the invoice PDF

const path = require("path");
const fs   = require("fs");

function localImageToBase64(filePath) {
    try {
        const abs  = path.resolve(filePath);
        const data = fs.readFileSync(abs);
        const ext  = path.extname(filePath).replace(".", "").toLowerCase();
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${data.toString("base64")}`;
    } catch {
        return "";
    }
}

function fmtDate(val) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

/* ── Payment status badge colors ─────────────────────────────────────────── */
function payStatusStyle(status) {
    const map = {
        "Paid":     { bg: "#dcfce7", color: "#166534", border: "#86efac" },
        "Pending":  { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
        "Failed":   { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
        "Refunded": { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
    };
    return map[status] || { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
}

function generateInvoiceHTML(order, opts = {}) {

    const {
        logoPath = "src/assets/logo.png",
        shopName = "Gramin Kart",
        taxes    = [],   // ← active taxes array [ { taxName, percentage }, ... ]
    } = opts;

    const logoSrc      = localImageToBase64(logoPath);
    const addr         = order.shippingAddress || {};
    const user         = order.user            || {};
    const payStatus    = order.paymentStatus   || "Pending";
    const payMethod    = order.paymentMethod   || "—";
    const ps           = payStatusStyle(payStatus);

    /* ── Address ─────────────────────────────────────────────────────── */
    const addressParts = [
        addr.house    && addr.house,
        addr.road     && "Road: " + addr.road,
        addr.city     && addr.city,
        addr.state    && addr.state,
        addr.pincode  && addr.pincode,
        addr.landmark && addr.landmark,
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ") || "—";

    /* ── Line items ──────────────────────────────────────────────────── */
    const itemRows = (order.items || []).map((item, i) => {
        let imgTag = "";
        if (item.image) {
            const isLocal = !item.image.startsWith("http");
            const src     = isLocal ? localImageToBase64(item.image) : item.image;
            imgTag = `<img src="${src}" alt="" class="item-img" />`;
        } else {
            imgTag = `<div class="item-img-placeholder">&#128230;</div>`;
        }

        const price     = Number(item.price    || 0);
        const quantity  = Number(item.quantity || 0);
        const lineTotal = Number(item.total    || 0) || (price * quantity);

        return `
  <tr>
    <td class="center">${i + 1}.</td>
    <td>
      <div class="item-cell">
        ${imgTag}
        <div>
          <div class="item-name">${item.name || ""}</div>
          <div class="item-desc">${item.description || ""}</div>
        </div>
      </div>
    </td>
    <td class="center">&#8377;${price.toFixed(0)}</td>
    <td class="center">${quantity}</td>
    <td class="center">${item.unit || "PCS"}</td>
    <td class="right">&#8377;${lineTotal.toFixed(0)}</td>
  </tr>`;
    }).join("");

    /* ── Totals ──────────────────────────────────────────────────────── */
    const subtotal       = Number(order.subtotal       || 0);
    const deliveryCharge = Number(order.shippingCharge || 0);
    const tax            = Number(order.tax            || 0);
    const couponDiscount = Number(order.couponDiscount || 0);
    const total          = Number(order.total          || 0);

    /* ── Tax rows: per-tax breakdown or fallback to order.tax ────────── */
    const taxRows = taxes.length > 0
        ? taxes.map(t => {
            const pct    = Number(t.percentage || 0);
            const amount = (subtotal * pct / 100).toFixed(0);
            return `
        <tr class="sub-row">
            <td>${t.taxName} (${pct.toFixed(1)}%)</td>
            <td>&#8377;${amount}</td>
        </tr>`;
          }).join("")
        : `
        <tr class="sub-row">
            <td>Tax &amp; VAT</td>
            <td>&#8377;${tax.toFixed(0)}</td>
        </tr>`;

    const extraRows = `
        ${couponDiscount > 0 ? `
        <tr class="sub-row">
            <td>Coupon Discount</td>
            <td>- &#8377;${couponDiscount.toFixed(0)}</td>
        </tr>` : ""}
        <tr class="sub-row">
            <td>Delivery Charge</td>
            <td>&#8377;${deliveryCharge.toFixed(0)}</td>
        </tr>
        ${taxRows}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${order.orderNumber || ""}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "Georgia", "Times New Roman", serif;
    font-size: 13px;
    color: #111;
    background: #fff;
    padding: 40px 48px 60px;
    max-width: 780px;
    margin: 0 auto;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    margin-bottom: 28px;
  }
  .logo-row { display: flex; align-items: center; gap: 12px; }
  .logo { width: 44px; height: 44px; object-fit: contain; }
  .shop-name {
    font-size: 34px; font-weight: normal;
    letter-spacing: 0.02em; color: #111;
    font-family: "Georgia", serif;
  }

  /* ── Bill To ── */
  .bill-to {
    margin-bottom: 24px;
    border: 1px solid #d0d0d0;
    border-radius: 2px;
    padding: 14px 18px;
  }
  .bill-to p { line-height: 1.9; color: #222; }
  .bill-to span { color: #555; margin-left: 6px; }

  /* ── Meta grid: 2 rows × 3 cols ── */
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px 0;
    margin-bottom: 22px;
    padding: 14px 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
  }
  .meta-cell { padding: 2px 6px; }
  .meta-cell.right { text-align: right; }
  .meta-cell.center { text-align: center; }
  .meta-label {
    font-size: 11px;
    font-weight: bold;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 3px;
    font-family: "Arial", sans-serif;
  }
  .meta-value {
    font-size: 12.5px;
    color: #111;
    font-family: "Arial", sans-serif;
    font-weight: 600;
  }

  /* ── Payment status badge ── */
  .pay-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 700;
    font-family: "Arial", sans-serif;
    border: 1px solid ${ps.border};
    background: ${ps.bg};
    color: ${ps.color};
  }

  /* ── Items table ── */
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #3333aa; color: #fff; }
  thead th {
    padding: 9px 10px; font-size: 12px; font-weight: normal;
    font-family: "Arial", sans-serif; letter-spacing: 0.02em;
  }
  thead th.center { text-align: center; }
  thead th.right  { text-align: right; }
  thead th.left   { text-align: left; }

  tbody tr { border-bottom: 1px solid #e5e5e5; }
  tbody td {
    padding: 12px 10px; vertical-align: middle;
    font-family: "Arial", sans-serif; font-size: 12px; color: #222;
  }
  tbody td.center { text-align: center; }
  tbody td.right  { text-align: right; font-weight: bold; }

  .item-cell { display: flex; align-items: flex-start; gap: 10px; }
  .item-img {
    width: 42px; height: 42px; object-fit: cover;
    border-radius: 4px; border: 1px solid #eee; flex-shrink: 0;
  }
  .item-img-placeholder {
    width: 42px; height: 42px; background: #f3f4f6;
    border-radius: 4px; display: flex; align-items: center;
    justify-content: center; font-size: 20px; flex-shrink: 0;
  }
  .item-name { font-weight: bold; color: #111; margin-bottom: 3px; }
  .item-desc { font-size: 11px; color: #777; line-height: 1.45; }

  /* ── Totals ── */
  .totals-wrapper {
    display: flex; justify-content: flex-end;
    margin-top: 0; border-top: 1px solid #e0e0e0;
  }
  .totals-table { width: 280px; border-collapse: collapse; }
  .totals-table td {
    padding: 7px 10px; font-size: 12.5px;
    font-family: "Arial", sans-serif; color: #333;
  }
  .totals-table td:last-child { text-align: right; }
  .totals-table tr.sub-row td { color: #666; font-size: 12px; }
  .totals-table tr.total-row td {
    font-size: 14px; font-weight: 800; color: #111;
    border-top: 1.5px solid #333;
    padding-top: 10px; padding-bottom: 10px;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 60px; font-size: 12px; color: #555;
    font-family: "Arial", sans-serif; font-style: italic;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="logo-row">
      ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="logo"/>` : ""}
      <h1 class="shop-name">${shopName}</h1>
    </div>
  </div>

  <!-- BILL TO -->
  <div class="bill-to">
    <p><strong>Bill To:</strong><span>${addr.name || user.fullName || "—"}</span></p>
    <p><strong>Email:</strong><span>${user.email || "—"}</span></p>
    <p><strong>Phone:</strong><span>${addr.phone || user.phone || "—"}</span></p>
    <p><strong>Address:</strong><span>${fullAddress}</span></p>
  </div>

  <!-- META GRID — 2 rows × 3 cols -->
  <div class="meta-grid">

    <!-- Row 1 -->
    <div class="meta-cell">
      <div class="meta-label">Payment Method</div>
      <div class="meta-value">${payMethod}</div>
    </div>
    <div class="meta-cell center">
      <div class="meta-label">Invoice Number</div>
      <div class="meta-value">#${order.orderNumber || "—"}</div>
    </div>
    <div class="meta-cell right">
      <div class="meta-label">Order Date</div>
      <div class="meta-value">${fmtDate(order.createdAt)}</div>
    </div>

    <!-- Row 2 -->
    <div class="meta-cell">
      <div class="meta-label">Payment Status</div>
      <div class="meta-value">
        <span class="pay-badge">${payStatus}</span>
      </div>
    </div>
    <div class="meta-cell center">
      <div class="meta-label">Invoice Date</div>
      <div class="meta-value">${fmtDate(new Date())}</div>
    </div>
    <div class="meta-cell right">
      <div class="meta-label">Order Status</div>
      <div class="meta-value">${order.status || "—"}</div>
    </div>

  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th class="center" style="width:40px">Item</th>
        <th class="left">Item Name</th>
        <th class="center" style="width:60px">Rate</th>
        <th class="center" style="width:70px">Quantity</th>
        <th class="center" style="width:50px">Unit</th>
        <th class="right"  style="width:70px">Price</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">No items</td></tr>`}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-wrapper">
    <table class="totals-table">
      <tr>
        <td>Sub Total</td>
        <td>&#8377;${subtotal.toFixed(0)}</td>
      </tr>
      ${extraRows}
      <tr class="total-row">
        <td>Total Amount</td>
        <td>&#8377;${total.toFixed(0)}</td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">Thanks for the business.</div>

</body>
</html>`;
}

module.exports = { generateInvoiceHTML };