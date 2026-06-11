const puppeteer               = require("puppeteer-core");
const chromium                = require("@sparticuz/chromium");
const { generateInvoiceHTML } = require("./Invoicetemplate");
const Tax                     = require("../models/Tax");

async function generateInvoicePDF(order, opts = {}) {
    const taxes = await Tax.find({ isActive: true });

    const html = generateInvoiceHTML(order, { ...opts, taxes });

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
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