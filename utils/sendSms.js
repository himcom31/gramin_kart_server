// const SmsSetting = require('../models/dependence/SMSSetting');
// const twilio = require('twilio');
// const axios = require('axios'); // Fast2SMS ke liye

// const sendSMS = async (to, message) => {
//     try {
//         // 1. Database se check karo kaunsa gateway 'Active' hai
//         const activeSms = await SmsSetting.findOne({ status: true });

//         if (!activeSms) {
//             console.log("⚠️ No active SMS gateway found in settings.");
//             return false;
//         }

//         // 2. Agar Twilio Active hai
//         if (activeSms.providerName.toLowerCase() === 'twilio') {
//             const client = twilio(activeSms.apiKey, activeSms.apiSecret);
//             await client.messages.create({
//                 body: message,
//                 from: activeSms.phoneNumber, // Twilio ka provided number
//                 to: to
//             });
//         } 

//         // 3. Agar Fast2SMS (India) Active hai
//         else if (activeSms.providerName.toLowerCase() === 'fast2sms') {
//             await axios.get(`https://www.fast2sms.com/dev/bulkV2`, {
//                 params: {
//                     authorization: activeSms.apiKey,
//                     message: message,
//                     language: "english",
//                     route: "q",
//                     numbers: to,
//                 }
//             });
//         }

//         console.log(`✅ SMS sent successfully via ${activeSms.providerName}`);
//         return true;

//     } catch (error) {
//         console.error("❌ SMS Gateway Error:", error.message);
//         return false;
//     }
// };

// module.exports = sendSMS;


const SmsSetting = require('../models/dependence/SMSSetting');

async function sendSms(phone, message) {
    try {
        // Fetch the active provider from DB
        const provider = await SmsSetting.findOne({ status: true });

        if (!provider) {
            console.warn('⚠️ No active SMS provider found.');
            return;
        }

        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

        switch (provider.providerName) {

            case 'Twilio': {
                const twilio = require('twilio');
                const client = twilio(provider.twilioSid, provider.twilioToken);
                await client.messages.create({
                    body: message,
                    from: provider.twilioFrom,
                    to:   formattedPhone,
                });
                console.log('✅ Twilio SMS sent to', formattedPhone);
                break;
            }

            case 'Nexmo': {
                const Vonage = require('@vonage/server-sdk');
                const vonage = new Vonage({
                    apiKey:    provider.nexmoKey,
                    apiSecret: provider.nexmoSecret,
                });
                await vonage.sms.send({
                    to:   formattedPhone,
                    from: provider.nexmoFrom,
                    text: message,
                });
                console.log('✅ Nexmo SMS sent to', formattedPhone);
                break;
            }

            case 'Telesign': {
                const { MessagingClient } = require('telesign');
                const client = new MessagingClient(
                    provider.telesignCustomerId,
                    provider.telesignApiKey
                );
                await client.message(formattedPhone, message, 'ARN');
                console.log('✅ Telesign SMS sent to', formattedPhone);
                break;
            }

            case 'MessageBird': {
                const messagebird = require('messagebird')(provider.messageBirdApiKey);
                await new Promise((resolve, reject) => {
                    messagebird.messages.create({
                        originator:  provider.messageBirdFrom,
                        recipients:  [formattedPhone],
                        body:        message,
                    }, (err, res) => err ? reject(err) : resolve(res));
                });
                console.log('✅ MessageBird SMS sent to', formattedPhone);
                break;
            }

case 'Fast2SMS': {
    const axios = require('axios');
    
    const cleanPhone = phone.replace('+91', '').replace(/\s/g, '').trim();
    
    try {
        const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: provider.fast2smsApiKey,
                route:         'v3',
                sender_id:     'FSTSMS',
                message:       message,
                language:      'english',
                flash:         0,
                numbers:       cleanPhone,
            }
        });
        console.log('✅ Fast2SMS success:', response.data);
    } catch (err) {
        // ← This will show EXACT error from Fast2SMS
        console.log('❌ Fast2SMS error status:', err.response?.status);
        console.log('❌ Fast2SMS error data:',   err.response?.data);
        console.log('❌ Fast2SMS error message:', err.message);
    }
    break;
}

            default:
                console.warn('⚠️ Unknown provider:', provider.providerName);
        }

    } catch (error) {
        console.error('❌ SMS send failed:', error.message);
    }
}

module.exports = sendSms;