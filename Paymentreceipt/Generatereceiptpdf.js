// Generatereceiptpdf.js
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
        const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
        return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
    } catch { return null; }
}

function fmt(n) {
    return "Rs." + Number(n || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
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

function payStatusColor(status) {
    const map = { Paid: "#166534", Pending: "#854d0e", Failed: "#991b1b", Refunded: "#4c1d95" };
    return map[status] || "#374151";
}

function orderStatusColor(status) {
    const map = { Delivered: "#166534", Cancelled: "#991b1b", Pending: "#854d0e", Processing: "#1e40af", Shipped: "#075985" };
    return map[status] || "#374151";
}

/* ── Main generator ────────────────────────────────────────────────────────── */

async function generateReceiptPDF(order, logoPath) {
    const taxes = await Tax.find({ isActive: true });

    const logoBase64  = localImageToBase64(logoPath);
    const addr        = order.shippingAddress || {};
    const user        = order.user            || {};
    const payStatus   = order.paymentStatus   || "Pending";
    const orderStatus = order.status          || "Pending";
    const payMethod   = order.paymentMethod   || "COD";
    const subtotal    = Number(order.subtotal || 0);
    const paidAmount  = payStatus === "Paid" ? order.total : 0;
    const dueAmount   = payStatus === "Paid" ? 0 : order.total;
    const GREEN       = "#1a5f2a";
    const BORDER      = "#e2e8f0";
    const LGREY       = "#f8fafc";

    const transactionId =
        order.razorpayPaymentId ||
        order.stripePaymentId   ||
        (payMethod === "COD" ? "Cash on Delivery" : "N/A");

    const addrLine = [addr.house, addr.road, addr.landmark, addr.city, addr.state, addr.pincode]
        .filter(Boolean).join(", ") || "—";

    /* Item rows */
    const itemRows = (order.items || []).map((item, i) => [
        { text: String(i + 1),  alignment: "center", fontSize: 10, color: "#94a3b8" },
        { text: item.name || "—", fontSize: 10, bold: true },
        { text: String(item.quantity), alignment: "center", fontSize: 10 },
        { text: fmt(item.price), alignment: "right", fontSize: 10 },
        { text: fmt(item.total), alignment: "right", fontSize: 10, bold: true, color: GREEN },
    ]);

    /* Summary rows */
    const summaryRows = [
        [{ text: "Subtotal", fontSize: 11 }, { text: fmt(order.subtotal), alignment: "right", fontSize: 11 }],
    ];
    if (Number(order.discount) > 0) {
        summaryRows.push([
            { text: "Discount", fontSize: 10, color: "#666" },
            { text: "− " + fmt(order.discount), alignment: "right", fontSize: 10, color: "#dc2626" },
        ]);
    }
    if (Number(order.couponDiscount) > 0) {
        summaryRows.push([
            { text: order.couponCode ? `Coupon (${order.couponCode})` : "Coupon Discount", fontSize: 10, color: "#dc2626" },
            { text: "− " + fmt(order.couponDiscount), alignment: "right", fontSize: 10, color: "#dc2626" },
        ]);
    }
    summaryRows.push([
        { text: "Shipping", fontSize: 10, color: "#666" },
        { text: fmt(order.shippingCharge), alignment: "right", fontSize: 10 },
    ]);
    if (taxes.length > 0) {
        taxes.forEach(t => {
            const pct = Number(t.percentage || 0);
            summaryRows.push([
                { text: `${t.taxName} (${pct.toFixed(1)}%)`, fontSize: 10, color: "#666" },
                { text: fmt(subtotal * pct / 100), alignment: "right", fontSize: 10 },
            ]);
        });
    } else if (Number(order.tax) > 0) {
        summaryRows.push([
            { text: "Tax / GST", fontSize: 10, color: "#666" },
            { text: fmt(order.tax), alignment: "right", fontSize: 10 },
        ]);
    }

    /* Document definition */
    const docDefinition = {
        pageSize:    "A4",
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: "Roboto", fontSize: 11, color: "#1e293b" },

        content: [

            /* Header */
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        columns: [
                            logoBase64
                                ? { image: logoBase64, width: 44, height: 44 }
                                : { text: "Gramin Kart", fontSize: 18, bold: true, color: "#fff", margin: [0, 10, 0, 0] },
                            { text: "", width: "*" },
                            {
                                stack: [
                                    { text: "Payment Receipt", fontSize: 15, bold: true, color: "#fff" },
                                    { text: "Official Transaction Record", fontSize: 10, color: "#86efac", margin: [0, 2, 0, 0] },
                                    { text: order.orderNumber || "#" + String(order._id).slice(-8).toUpperCase(), fontSize: 11, bold: true, color: "#86efac", margin: [0, 3, 0, 0] },
                                ],
                                alignment: "right",
                            },
                        ],
                        fillColor: GREEN,
                        margin: [20, 18, 20, 18],
                    }]],
                },
                layout: "noBorders",
                margin: [0, 0, 0, 0],
            },

            /* Status bar */
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        columns: [
                            { text: "Payment: ", fontSize: 10, color: "#94a3b8", width: "auto" },
                            { text: payStatus, fontSize: 10, bold: true, color: payStatusColor(payStatus), width: "auto" },
                            { text: "   |   Order: ", fontSize: 10, color: "#94a3b8", width: "auto" },
                            { text: orderStatus, fontSize: 10, bold: true, color: orderStatusColor(orderStatus), width: "auto" },
                            { text: "   |   " + fmtDate(order.createdAt), fontSize: 10, color: "#64748b", width: "auto" },
                        ],
                        fillColor: LGREY,
                        margin: [16, 8, 16, 8],
                    }]],
                },
                layout: { hLineColor: () => BORDER, vLineColor: () => "transparent" },
                margin: [0, 0, 0, 16],
            },

            /* Paid / Due */
            {
                columns: [
                    {
                        table: { widths: ["*"], body: [[{ stack: [{ text: "PAID AMOUNT", fontSize: 9, bold: true, color: "#64748b", alignment: "center" }, { text: fmt(paidAmount), fontSize: 20, bold: true, color: GREEN, alignment: "center", margin: [0, 4, 0, 0] }], fillColor: "#f0fdf4", margin: [12, 12, 12, 12] }]] },
                        layout: { hLineColor: () => "#86efac", vLineColor: () => "#86efac" },
                        margin: [0, 0, 6, 0],
                    },
                    {
                        table: { widths: ["*"], body: [[{ stack: [{ text: "DUE AMOUNT", fontSize: 9, bold: true, color: "#64748b", alignment: "center" }, { text: fmt(dueAmount), fontSize: 20, bold: true, color: "#92400e", alignment: "center", margin: [0, 4, 0, 0] }], fillColor: "#fffbeb", margin: [12, 12, 12, 12] }]] },
                        layout: { hLineColor: () => "#fcd34d", vLineColor: () => "#fcd34d" },
                        margin: [6, 0, 0, 0],
                    },
                ],
                margin: [0, 0, 0, 20],
            },

            /* Payment Details */
            { text: "PAYMENT DETAILS", fontSize: 9, bold: true, color: "#94a3b8", margin: [0, 0, 0, 8] },
            {
                columns: [
                    {
                        width: "50%",
                        table: {
                            widths: ["auto", "*"],
                            body: [
                                [{ text: "Method", fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 6] }, { text: payMethod, fontSize: 10, bold: true, alignment: "right", margin: [8, 6, 8, 6] }],
                                [{ text: "Status", fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 6] }, { text: payStatus, fontSize: 10, bold: true, color: payStatusColor(payStatus), alignment: "right", margin: [8, 6, 8, 6] }],
                                [{ text: "Date",   fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 6] }, { text: fmtDateTime(order.createdAt), fontSize: 9, alignment: "right", margin: [8, 6, 8, 6] }],
                            ],
                        },
                        layout: { hLineColor: () => BORDER, vLineColor: () => "transparent", fillColor: () => LGREY },
                        margin: [0, 0, 8, 0],
                    },
                    {
                        width: "50%",
                        table: {
                            widths: ["*"],
                            body: [
                                [{ text: "Transaction ID", fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 2] }],
                                [{ text: transactionId, fontSize: 9, color: "#475569", margin: [8, 0, 8, 6] }],
                                ...(order.razorpayOrderId ? [
                                    [{ text: "Razorpay Order ID", fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 2] }],
                                    [{ text: order.razorpayOrderId, fontSize: 9, color: "#475569", margin: [8, 0, 8, 6] }],
                                ] : []),
                            ],
                        },
                        layout: { hLineColor: () => BORDER, vLineColor: () => "transparent", fillColor: () => LGREY },
                    },
                ],
                margin: [0, 0, 0, 20],
            },

            /* Customer Details */
            { text: "CUSTOMER DETAILS", fontSize: 9, bold: true, color: "#94a3b8", margin: [0, 0, 0, 8] },
            {
                columns: [
                    {
                        width: "50%",
                        table: {
                            widths: ["auto", "*"],
                            body: [
                                [{ text: "Name",  fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 6] }, { text: user.fullName || addr.name || "—", fontSize: 10, bold: true, alignment: "right", margin: [8, 6, 8, 6] }],
                                [{ text: "Email", fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 6] }, { text: user.email || "—", fontSize: 9, alignment: "right", margin: [8, 6, 8, 6] }],
                                [{ text: "Phone", fontSize: 10, color: "#94a3b8", margin: [8, 6, 8, 6] }, { text: user.phone || addr.phone || "—", fontSize: 10, bold: true, alignment: "right", margin: [8, 6, 8, 6] }],
                            ],
                        },
                        layout: { hLineColor: () => BORDER, vLineColor: () => "transparent", fillColor: () => LGREY },
                        margin: [0, 0, 8, 0],
                    },
                    {
                        width: "50%",
                        table: {
                            widths: ["*"],
                            body: [[{
                                stack: [
                                    { text: addr.name || user.fullName || "—", bold: true, fontSize: 12 },
                                    { text: (addr.phone || "") + (addr.altPhone ? ` / ${addr.altPhone}` : ""), fontSize: 10, color: "#64748b", margin: [0, 3, 0, 3] },
                                    { text: addrLine, fontSize: 10, color: "#475569", lineHeight: 1.5 },
                                ],
                                fillColor: LGREY,
                                margin: [10, 10, 10, 10],
                            }]],
                        },
                        layout: { hLineColor: () => BORDER, vLineColor: (i) => i === 0 ? GREEN : BORDER },
                    },
                ],
                margin: [0, 0, 0, 20],
            },

            /* Order Items */
            { text: "ORDER SUMMARY", fontSize: 9, bold: true, color: "#94a3b8", margin: [0, 0, 0, 8] },
            {
                table: {
                    headerRows: 1,
                    widths: [28, "*", 50, 80, 80],
                    body: [
                        [
                            { text: "#",     alignment: "center", color: "#fff", fontSize: 9, bold: true, margin: [0, 6, 0, 6] },
                            { text: "Item",  alignment: "left",   color: "#fff", fontSize: 9, bold: true, margin: [4, 6, 0, 6] },
                            { text: "Qty",   alignment: "center", color: "#fff", fontSize: 9, bold: true, margin: [0, 6, 0, 6] },
                            { text: "Price", alignment: "right",  color: "#fff", fontSize: 9, bold: true, margin: [0, 6, 4, 6] },
                            { text: "Total", alignment: "right",  color: "#fff", fontSize: 9, bold: true, margin: [0, 6, 4, 6] },
                        ],
                        ...(itemRows.length > 0
                            ? itemRows.map((row, idx) => row.map(cell => ({
                                ...cell,
                                fillColor: idx % 2 === 0 ? "#ffffff" : LGREY,
                                margin: [4, 7, 4, 7],
                            })))
                            : [[
                                { text: "No items found", colSpan: 5, alignment: "center", color: "#94a3b8", margin: [0, 14, 0, 14] },
                                {}, {}, {}, {},
                            ]]
                        ),
                    ],
                },
                layout: {
                    hLineColor: (i) => i === 0 || i === 1 ? GREEN : "#f1f5f9",
                    vLineColor: () => BORDER,
                    fillColor:  (row) => row === 0 ? GREEN : null,
                },
                margin: [0, 0, 0, 16],
            },

            /* Totals */
            {
                columns: [
                    { text: "", width: "*" },
                    {
                        width: 220,
                        table: {
                            widths: ["*", "auto"],
                            body: [
                                ...summaryRows.map(row => row.map(cell => ({ ...cell, margin: [8, 6, 8, 6] }))),
                                [
                                    { text: "Grand Total", fontSize: 13, bold: true, color: "#fff", fillColor: GREEN, margin: [8, 8, 8, 8] },
                                    { text: fmt(order.total), fontSize: 13, bold: true, color: "#fff", fillColor: GREEN, alignment: "right", margin: [8, 8, 8, 8] },
                                ],
                            ],
                        },
                        layout: { hLineColor: () => BORDER, vLineColor: () => "transparent" },
                    },
                ],
                margin: [0, 0, 0, 30],
            },

            /* Footer */
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        columns: [
                            { stack: [{ text: "Gramin Kart", bold: true, fontSize: 11, color: GREEN }, { text: "Thank you for shopping with us!", fontSize: 10, color: "#64748b", margin: [0, 2, 0, 0] }] },
                            { stack: [{ text: "support@graminkart.com", fontSize: 10, color: GREEN, alignment: "right" }, { text: "Generated: " + fmtDateTime(new Date()), fontSize: 9, color: "#94a3b8", alignment: "right", margin: [0, 2, 0, 0] }, { text: "Computer-generated receipt · No signature required", fontSize: 9, color: "#94a3b8", alignment: "right" }] },
                        ],
                        fillColor: LGREY,
                        margin: [16, 12, 16, 12],
                    }]],
                },
                layout: { hLineColor: () => BORDER, vLineColor: () => "transparent" },
            },
        ],
    };

    /* ── Return Buffer (pdfmake 0.3.x async API) ───────────────────────────── */
    return await pdfmake.createPdf(docDefinition).getBuffer();
}

module.exports = { generateReceiptPDF };