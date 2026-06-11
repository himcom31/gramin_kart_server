// GenerateInvoicePdf.js
// Uses pdfmake 0.3.x — pure JS, no Chrome/Puppeteer. Works on Hostinger + localhost.

const pdfmake = require("pdfmake");
const path    = require("path");
const fs      = require("fs");
const Tax     = require("../models/Tax");

/* ── Register Roboto fonts (bundled with pdfmake) ──────────────────────────── */
pdfmake.addFonts({
    Roboto: {
        normal:      path.join(__dirname, "../node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf"),
        bold:        path.join(__dirname, "../node_modules/pdfmake/build/fonts/Roboto/Roboto-Medium.ttf"),
        italics:     path.join(__dirname, "../node_modules/pdfmake/build/fonts/Roboto/Roboto-Italic.ttf"),
        bolditalics: path.join(__dirname, "../node_modules/pdfmake/build/fonts/Roboto/Roboto-MediumItalic.ttf"),
    }
});

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function localImageToBase64(filePath) {
    try {
        const abs = path.resolve(filePath);
        if (!fs.existsSync(abs)) return null;
        const ext  = path.extname(abs).toLowerCase().replace(".", "");
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
    } catch { return null; }
}

function fmtDate(val) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

function fmt(n) {
    return "Rs." + Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
}

function payStatusColor(status) {
    const map = { Paid: "#166534", Pending: "#854d0e", Failed: "#991b1b", Refunded: "#5b21b6" };
    return map[status] || "#374151";
}

/* ── Main generator ────────────────────────────────────────────────────────── */

async function generateInvoicePDF(order, opts = {}) {
    const {
        logoPath = "src/assets/logo.png",
        shopName = "Gramin Kart",
    } = opts;

    const taxes      = await Tax.find({ isActive: true });
    const addr       = order.shippingAddress || {};
    const user       = order.user            || {};
    const payStatus  = order.paymentStatus   || "Pending";
    const payMethod  = order.paymentMethod   || "—";
    const logoBase64 = localImageToBase64(logoPath);

    const fullAddress = [
        addr.house,
        addr.road && "Road: " + addr.road,
        addr.city, addr.state, addr.pincode, addr.landmark,
    ].filter(Boolean).join(", ") || "—";

    /* Item rows */
    const itemRows = (order.items || []).map((item, i) => {
        const price     = Number(item.price    || 0);
        const quantity  = Number(item.quantity || 0);
        const lineTotal = Number(item.total    || 0) || (price * quantity);
        return [
            { text: String(i + 1),   alignment: "center", fontSize: 10 },
            { text: item.name || "—", bold: true,          fontSize: 10 },
            { text: fmt(price),       alignment: "center", fontSize: 10 },
            { text: String(quantity), alignment: "center", fontSize: 10 },
            { text: item.unit || "PCS", alignment: "center", fontSize: 10 },
            { text: fmt(lineTotal),   alignment: "right",  bold: true, fontSize: 10 },
        ];
    });

    /* Totals */
    const subtotal       = Number(order.subtotal       || 0);
    const deliveryCharge = Number(order.shippingCharge || 0);
    const tax            = Number(order.tax            || 0);
    const couponDiscount = Number(order.couponDiscount || 0);
    const total          = Number(order.total          || 0);

    const summaryRows = [
        [{ text: "Sub Total", fontSize: 11 }, { text: fmt(subtotal), alignment: "right", fontSize: 11 }],
    ];
    if (couponDiscount > 0) {
        summaryRows.push([
            { text: "Coupon Discount", fontSize: 10, color: "#666" },
            { text: "- " + fmt(couponDiscount), alignment: "right", fontSize: 10, color: "#dc2626" },
        ]);
    }
    summaryRows.push([
        { text: "Delivery Charge", fontSize: 10, color: "#666" },
        { text: fmt(deliveryCharge), alignment: "right", fontSize: 10 },
    ]);
    if (taxes.length > 0) {
        taxes.forEach(t => {
            const pct = Number(t.percentage || 0);
            summaryRows.push([
                { text: `${t.taxName} (${pct.toFixed(1)}%)`, fontSize: 10, color: "#666" },
                { text: fmt(subtotal * pct / 100), alignment: "right", fontSize: 10 },
            ]);
        });
    } else if (tax > 0) {
        summaryRows.push([
            { text: "Tax & VAT", fontSize: 10, color: "#666" },
            { text: fmt(tax), alignment: "right", fontSize: 10 },
        ]);
    }
    summaryRows.push([
        { text: "Total Amount", fontSize: 13, bold: true },
        { text: fmt(total), alignment: "right", fontSize: 13, bold: true },
    ]);

    /* Document definition */
    const docDefinition = {
        pageSize:    "A4",
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: "Roboto", fontSize: 11, color: "#222" },

        content: [
            /* Header */
            {
                columns: [
                    logoBase64
                        ? { image: logoBase64, width: 44, height: 44, margin: [0, 0, 10, 0] }
                        : { text: "" },
                    { text: shopName, fontSize: 28, color: "#111", margin: [0, 6, 0, 0] },
                ],
                margin: [0, 0, 0, 20],
            },

            /* Bill To */
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        stack: [
                            { text: [{ text: "Bill To:  ", bold: true }, addr.name || user.fullName || "—"] },
                            { text: [{ text: "Email:    ", bold: true }, user.email || "—"] },
                            { text: [{ text: "Phone:    ", bold: true }, addr.phone || user.phone || "—"] },
                            { text: [{ text: "Address:  ", bold: true }, fullAddress] },
                        ],
                        lineHeight: 1.8,
                        margin: [12, 10, 12, 10],
                        fontSize: 11,
                    }]],
                },
                layout: { hLineColor: () => "#d0d0d0", vLineColor: () => "#d0d0d0" },
                margin: [0, 0, 0, 16],
            },

            /* Meta grid */
            {
                table: {
                    widths: ["*", "*", "*"],
                    body: [
                        [
                            { stack: [{ text: "PAYMENT METHOD", fontSize: 9, bold: true, color: "#6b7280" }, { text: payMethod, fontSize: 11, bold: true, margin: [0, 2, 0, 0] }], margin: [8, 8, 8, 8] },
                            { stack: [{ text: "INVOICE NUMBER", fontSize: 9, bold: true, color: "#6b7280", alignment: "center" }, { text: "#" + (order.orderNumber || "—"), fontSize: 11, bold: true, alignment: "center", margin: [0, 2, 0, 0] }], margin: [8, 8, 8, 8] },
                            { stack: [{ text: "ORDER DATE", fontSize: 9, bold: true, color: "#6b7280", alignment: "right" }, { text: fmtDate(order.createdAt), fontSize: 11, bold: true, alignment: "right", margin: [0, 2, 0, 0] }], margin: [8, 8, 8, 8] },
                        ],
                        [
                            { stack: [{ text: "PAYMENT STATUS", fontSize: 9, bold: true, color: "#6b7280" }, { text: payStatus, fontSize: 11, bold: true, color: payStatusColor(payStatus), margin: [0, 2, 0, 0] }], margin: [8, 8, 8, 8] },
                            { stack: [{ text: "INVOICE DATE", fontSize: 9, bold: true, color: "#6b7280", alignment: "center" }, { text: fmtDate(new Date()), fontSize: 11, bold: true, alignment: "center", margin: [0, 2, 0, 0] }], margin: [8, 8, 8, 8] },
                            { stack: [{ text: "ORDER STATUS", fontSize: 9, bold: true, color: "#6b7280", alignment: "right" }, { text: order.status || "—", fontSize: 11, bold: true, alignment: "right", margin: [0, 2, 0, 0] }], margin: [8, 8, 8, 8] },
                        ],
                    ],
                },
                layout: { hLineColor: () => "#e5e7eb", vLineColor: () => "#e5e7eb", fillColor: () => "#f9fafb" },
                margin: [0, 0, 0, 18],
            },

            /* Items table */
            {
                table: {
                    headerRows: 1,
                    widths: [28, "*", 60, 55, 40, 65],
                    body: [
                        [
                            { text: "#",        alignment: "center", color: "#fff", fontSize: 10, bold: true, margin: [0, 5, 0, 5] },
                            { text: "Item Name",alignment: "left",   color: "#fff", fontSize: 10, bold: true, margin: [4, 5, 0, 5] },
                            { text: "Rate",     alignment: "center", color: "#fff", fontSize: 10, bold: true, margin: [0, 5, 0, 5] },
                            { text: "Quantity", alignment: "center", color: "#fff", fontSize: 10, bold: true, margin: [0, 5, 0, 5] },
                            { text: "Unit",     alignment: "center", color: "#fff", fontSize: 10, bold: true, margin: [0, 5, 0, 5] },
                            { text: "Price",    alignment: "right",  color: "#fff", fontSize: 10, bold: true, margin: [0, 5, 4, 5] },
                        ],
                        ...(itemRows.length > 0
                            ? itemRows.map((row, idx) => row.map(cell => ({
                                ...cell,
                                fillColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                                margin: [4, 7, 4, 7],
                            })))
                            : [[
                                { text: "No items", colSpan: 6, alignment: "center", color: "#999", margin: [0, 12, 0, 12] },
                                {}, {}, {}, {}, {},
                            ]]
                        ),
                    ],
                },
                layout: {
                    hLineColor: (i) => i === 0 || i === 1 ? "#3333aa" : "#e5e5e5",
                    vLineColor: () => "#e5e5e5",
                    fillColor:  (row) => row === 0 ? "#3333aa" : null,
                },
                margin: [0, 0, 0, 0],
            },

            /* Totals */
            {
                columns: [
                    { text: "", width: "*" },
                    {
                        width: 240,
                        table: {
                            widths: ["*", "auto"],
                            body: summaryRows.map((row, i) => row.map(cell => ({
                                ...cell,
                                margin: [8, 6, 8, 6],
                                fillColor: i === summaryRows.length - 1 ? "#f0f0f0" : null,
                            }))),
                        },
                        layout: {
                            hLineColor: (i, node) => i === node.table.body.length - 1 ? "#333" : "#e5e5e5",
                            vLineColor: () => "transparent",
                        },
                    },
                ],
                margin: [0, 0, 0, 40],
            },

            /* Footer */
            { text: "Thanks for the business.", fontSize: 11, italics: true, color: "#555" },
        ],
    };

    /* ── Return Buffer (pdfmake 0.3.x async API) ───────────────────────────── */
    return await pdfmake.createPdf(docDefinition).getBuffer();
}

module.exports = { generateInvoicePDF };