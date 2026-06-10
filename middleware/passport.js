const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const SocialAuth = require('../models/dependence/SocialAuth');

// Asli Authentication Logic
const initPassport = async () => {
    const config = await SocialAuth.findOne({ provider: 'Google', status: true });

    if (config) {
        passport.use(new GoogleStrategy({
            clientID: config.clientId,
            clientSecret: config.clientSecret,
            callbackURL: config.redirectUrl
        },
        async (accessToken, refreshToken, profile, done) => {
            // Yahan aap user ka data process karte hain
            // Abhi ke liye hum sirf profile return kar rahe hain
            return done(null, profile);
        }));
    }
};

module.exports = initPassport;