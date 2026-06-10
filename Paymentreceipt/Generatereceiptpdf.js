const puppeteer                      = require("puppeteer");
const { generatePaymentReceiptHTML } = require("./Paymentreceipttemplate");
const Tax                            = require("../models/Tax");

/**
 * Generates a Payment Receipt PDF buffer for a given order.
 * @param {Object} order    - Populated order document
 * @param {string} logoPath - Relative path to logo file
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateReceiptPDF(order, logoPath) {

    // Fetch active taxes to show per-tax breakdown
    const taxes = await Tax.find({ isActive: true });

    const html = generatePaymentReceiptHTML(order, logoPath, taxes);

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
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

module.exports = { generateReceiptPDF };