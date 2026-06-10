const Pusher = require("pusher");
const PusherSetting = require('../models/dependence/PusherSetting');

const triggerRealtimeEvent = async (channel, event, data) => {
    try {
        // 1. Database se Active Pusher config uthao
        const config = await PusherSetting.findOne({ status: true });

        if (!config) {
            console.log("⚠️ Pusher is not configured or disabled.");
            return;
        }

        // 2. Pusher Initialize karo
        const pusher = new Pusher({
            appId: config.appId,
            key: config.key,
            secret: config.secret,
            cluster: config.cluster,
            useTLS: true
        });

        // 3. Event Trigger karo
        await pusher.trigger(channel, event, data);
        console.log(`🚀 Realtime Event '${event}' sent to channel '${channel}'`);

    } catch (error) {
        console.error("❌ Pusher Trigger Error:", error.message);
    }
};

module.exports = triggerRealtimeEvent;