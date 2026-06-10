const nodemailer  = require('nodemailer');
const MailSetting = require('../models/dependence/MailSetting');

const sendEmail = async (options) => {
    try {
        const config = await MailSetting.findOne({ status: true });
        if (!config) throw new Error('Mail configuration not found or is disabled.');

        const transporter = nodemailer.createTransport({
            host:   config.mailHost,
            port:   Number(config.mailPort),
            secure: config.mailEncryption === 'ssl',
            family: 4,
            auth: {
                user: config.mailUserName,
                pass: config.mailPassword,
            },
            tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
            from:    `"Gramin Kart" <${config.mailFromAddress}>`,
            to:      options.email,
            subject: options.subject,
            text:    options.message,
            ...(options.html ? { html: options.html } : {}),
        });

        console.log('✅ Email sent to:', options.email);
        return true;
    } catch (error) {
        console.error('❌ Email Error:', error.message);
        return false;
    }
};

module.exports = sendEmail;