const sendEmail = require('./sendEmail');
const sendSms   = require('./sendSms');

const sendNotification = async ({ phone, email, subject, message, html }) => {
    const tasks = [];

    if (email) tasks.push(sendEmail({ email, subject, message, html }));
    if (phone) tasks.push(sendSms(phone, message)); // ✅ was missing entirely

    const results = await Promise.allSettled(tasks);
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            console.error(`❌ Notification task [${i}] failed:`, r.reason);
        }
    });
};

module.exports = sendNotification;