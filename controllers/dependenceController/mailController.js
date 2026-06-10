const MailSetting = require('../../models/dependence/MailSetting');
const sendEmail   = require('../../utils/sendEmail');

exports.getMailSetting = async (req, res) => {
    try {
        const setting = await MailSetting.findOne();
        if (!setting) {
            return res.status(200).json({ success: true, data: null });
        }
        res.status(200).json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.saveMailSetting = async (req, res) => {
    try {
        const {
            mailMailer,
            mailHost,
            mailPort,
            mailUserName,
            mailPassword,
            mailEncryption,
            mailFromAddress
        } = req.body;

        if (!mailHost || !mailPort || !mailUserName || !mailPassword || !mailFromAddress) {
            return res.status(400).json({
                success: false,
                error: 'mailHost, mailPort, mailUserName, mailPassword, and mailFromAddress are required.'
            });
        }

        const setting = await MailSetting.findOneAndUpdate({
            mailMailer:      mailMailer || 'smtp',
            mailHost,
            mailPort:        Number(mailPort),   // ensure integer for MySQL INT column
            mailUserName,
            mailPassword,
            mailEncryption:  mailEncryption || 'tls',
            mailFromAddress,
            status:          true
        });

        res.status(200).json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.sendTestMail = async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to) {
            return res.status(400).json({ success: false, error: 'Recipient email (to) is required.' });
        }

        const isSent = await sendEmail({
            email:   to,
            subject: 'Test Mail — Mail Configuration Check',
            message: message || 'This is a test email to verify your mail configuration is working correctly.'
        });

        if (isSent) {
            res.status(200).json({ success: true, message: 'Test mail sent successfully!' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send mail. Please check your mail settings.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};