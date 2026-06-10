const initFirebaseAdmin = require('../utils/Firebaseutil');
const Notification      = require('../models/Notification');
const { FcmToken }      = require('../models/dependence/Firebasemodel');
const User              = require('../models/User/User');

/* ── Dead-token pruning ──────────────────────────────────────────────────── */
const INVALID_CODES = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
]);

const pruneDeadTokens = async (tokens, responses) => {
    const dead = responses
        .map((r, i) => (!r.success && INVALID_CODES.has(r.error?.code) ? tokens[i] : null))
        .filter(Boolean);

    if (dead.length > 0) {
        await FcmToken.deactivateTokens(dead);   // was: updateMany({ token: { $in: dead } })
    }
    return dead.length;
};

const multicast = async (messaging, tokens, notification, imageUrl) => {
    const CHUNK = 500;
    let successCount = 0, failureCount = 0, pruned = 0;

    const base = {
        notification: {
            title: notification.title,
            body:  notification.body,
            ...(imageUrl ? { imageUrl } : {}),
        },
        android: { priority: 'high', notification: { imageUrl: imageUrl ?? undefined } },
        apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
        webpush: { notification: { icon: '/favicon.ico' } },
    };

    for (let i = 0; i < tokens.length; i += CHUNK) {
        const chunk    = tokens.slice(i, i + CHUNK);
        const response = await messaging.sendEachForMulticast({ ...base, tokens: chunk });

        successCount += response.successCount;
        failureCount += response.failureCount;
        pruned       += await pruneDeadTokens(chunk, response.responses);
    }

    return { successCount, failureCount, pruned };
};

/* ── 1. Broadcast to all ─────────────────────────────────────────────────── */
exports.sendToAll = async (req, res) => {
    try {
        const { title, body } = req.body;
        if (!title || !body) {
            return res.status(400).json({ success: false, error: 'title and body are required.' });
        }

        const imageUrl  = req.file?.path ?? null;
        const messaging = await initFirebaseAdmin();

        await messaging.send({
            topic: 'all_users',
            notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
            android: { priority: 'high', notification: { imageUrl: imageUrl ?? undefined } },
            apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
            webpush: { notification: { icon: '/favicon.ico' } },
        });

        await Notification.create({
            title, body,
            image:     imageUrl,
            sentTo:    'All',
            status:    'Sent',
            createdBy: req.user.id,   // MySQL: id not _id
        });

        res.status(200).json({
            success: true,
            message: 'Notification broadcast to all users via topic.',
            imageUrl,
        });
    } catch (error) {
        console.error('[sendToAll]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* ── 2. Send to specific users ───────────────────────────────────────────── */
exports.sendToUsers = async (req, res) => {
    try {
        const { title, body, userIds } = req.body;

        if (!title || !body) {
            return res.status(400).json({ success: false, error: 'title and body are required.' });
        }
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'userIds array is required.' });
        }

        const imageUrl = req.file?.path ?? null;

        // Resolve active FCM tokens for selected users
        const tokenDocs    = await FcmToken.find({ userId: { $in: userIds }, isActive: true });
        const targetTokens = tokenDocs.map(d => d.token);

        if (targetTokens.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'None of the selected users have active FCM tokens registered.',
            });
        }

        const messaging = await initFirebaseAdmin();
        const result    = await multicast(messaging, targetTokens, { title, body }, imageUrl);

        await Notification.create({
            title, body,
            image:     imageUrl,
            sentTo:    'Specific',
            userIds,
            status:    'Sent',
            createdBy: req.user.id,
            ...result,
        });

        res.status(200).json({
            success: true,
            message: `Notification sent to ${userIds.length} user(s).`,
            totalDevices: targetTokens.length,
            ...result,
        });
    } catch (error) {
        console.error('[sendToUsers]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* ── 3. Get notification history (paginated) ─────────────────────────────── */
exports.getAllNotifications = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);

        const [notifications, total] = await Promise.all([
            Notification.find({ page, limit }),
            Notification.countDocuments(),
        ]);

        res.status(200).json({
            success:     true,
            count:       notifications.length,
            total,
            totalPages:  Math.ceil(total / limit),
            currentPage: page,
            notifications,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/* ── 4. Get users with token status ──────────────────────────────────────── */
exports.getUsersWithTokenStatus = async (req, res) => {
    try {
        const { platform = 'all' } = req.query;
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 50);

        // Build token filter
        const tokenFilter = { isActive: true };
        if (platform && platform !== 'all') tokenFilter.platform = platform;

        const activeTokenDocs = await FcmToken.find(tokenFilter);

        // Build userId → platform[] map
        const tokenMap = {};
        for (const doc of activeTokenDocs) {
            const id = String(doc.userId);
            if (!tokenMap[id]) tokenMap[id] = [];
            tokenMap[id].push(doc.platform);
        }

        // If platform filter is set, restrict users to those with that token
        let users, total;
        if (platform && platform !== 'all') {
            const eligibleIds = Object.keys(tokenMap).map(Number);
            if (eligibleIds.length === 0) {
                return res.status(200).json({
                    success: true, users: [], total: 0, totalPages: 0, currentPage: page
                });
            }
            ({ users, total } = await User.findWithPagination(
                { idIn: eligibleIds },
                { page, limit }
            ));
        } else {
            ({ users, total } = await User.findWithPagination({}, { page, limit }));
        }

        const enriched = users.map(u => ({
            ...u,
            hasToken:  !!tokenMap[String(u.id)],
            platforms: tokenMap[String(u.id)] ?? [],
        }));

        res.status(200).json({
            success:     true,
            users:       enriched,
            total,
            totalPages:  Math.ceil(total / limit),
            currentPage: page,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};