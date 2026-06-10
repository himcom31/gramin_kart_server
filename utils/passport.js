const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const SocialAuth = require('../models/dependence/SocialAuth');

const configureSocialLogin = async (passport) => {
    // 1. Database se Google ki settings uthao
    const googleConfig = await SocialAuth.findOne({ provider: 'Google', status: true });

    if (googleConfig) {
        passport.use(new GoogleStrategy({
            clientID: googleConfig.clientId,
            clientSecret: googleConfig.clientSecret,
            callbackURL: googleConfig.redirectUrl
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check karein kya user pehle se hai?
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user) {
                    // Naya user banayein agar nahi hai
                    user = await User.create({
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        socialId: profile.id,
                        provider: 'Google'
                    });
                }
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }));
    }
};

module.exports = configureSocialLogin;