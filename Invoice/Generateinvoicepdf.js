const puppeteer               = require("puppeteer");
const { generateInvoiceHTML } = require("./Invoicetemplate");
const Tax                     = require("../models/Tax");

/**
 * @param {Object} order
 * @param {Object} opts
 * @param {string} opts.logoPath
 * @param {string} opts.shopName
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
async function generateInvoicePDF(order, opts = {}) {

    // Fetch active taxes and pass them into the template
    const taxes = await Tax.find({ isActive: true });

    const html = generateInvoiceHTML(order, {
        ...opts,
        taxes,   // ← injects per-tax breakdown rows
    });

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

module.exports = { generateInvoicePDF };