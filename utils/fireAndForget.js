// utils/fireAndForget.js
const fireAndForget = (promiseOrFn, label = 'background task') => {
    try {
        const promise = typeof promiseOrFn === 'function'
            ? promiseOrFn()          // ← if someone passes async () => {}, call it
            : promiseOrFn;           // ← if already a Promise, use as-is

        if (!promise || typeof promise.catch !== 'function') {
            console.error(`❌ [${label}] did not return a Promise.`);
            return;
        }

        promise.catch(err => console.error(`❌ [${label}] failed:`, err.message));

    } catch (err) {
        console.error(`❌ [${label}] threw synchronously:`, err.message);
    }
};

module.exports = fireAndForget;