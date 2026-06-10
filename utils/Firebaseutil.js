const admin = require('firebase-admin');
const { FirebaseConfig } = require('../models/dependence/Firebasemodel');

const APP_NAME = 'fcm-app';

/**
 * Initialise Firebase Admin SDK.
 * @param {Object} [serviceAccountOverride] - Pass credentials directly (used
 *   during first-time upload before isConfigured is set in DB).
 *   If omitted, loads from the DB record where isConfigured = true.
 */
const initFirebaseAdmin = async (serviceAccountOverride = null) => {
  let serviceAccount;

  if (serviceAccountOverride) {
    // Called during upload verification — use the freshly-parsed JSON directly
    serviceAccount = serviceAccountOverride;
  } else {
    // Normal runtime path — load from DB
    const config = await FirebaseConfig.findOne({ isConfigured: true });

    if (!config) {
      throw new Error(
        'Firebase is not configured. Please upload your service-account JSON from the admin panel.'
      );
    }

    serviceAccount = {
      type:                        config.type,
      project_id:                  config.project_id,
      private_key_id:              config.private_key_id,
      private_key:                 config.private_key.replace(/\\n/g, '\n'),
      client_email:                config.client_email,
      client_id:                   config.client_id,
      auth_uri:                    config.auth_uri,
      token_uri:                   config.token_uri,
      auth_provider_x509_cert_url: config.auth_provider_x509_cert_url,
      client_x509_cert_url:        config.client_x509_cert_url,
      universe_domain:             config.universe_domain,
    };
  }

  // Always restore escaped newlines in the PEM key
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  // Remove stale app instance (allows hot-reload after config change)
  try {
    await admin.app(APP_NAME).delete();
  } catch (_) {
    // App did not exist — safe to ignore
  }

  const app = admin.initializeApp(
    { credential: admin.credential.cert(serviceAccount) },
    APP_NAME
  );

  return admin.messaging(app);
};

module.exports = initFirebaseAdmin;