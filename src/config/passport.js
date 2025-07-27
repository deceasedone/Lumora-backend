// backend/src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database'); // You'll create this file to connect to PG

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback" // Matches the route below
  },
  async (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails, photos } = profile;
    const email = emails[0].value;
    const avatar_url = photos[0].value;

    try {
      // Check if user exists
      let user = await db.query('SELECT * FROM users WHERE google_id = $1', [id]);

      if (user.rows.length === 0) {
        // If not, create a new user
        const newUser = await db.query(
          'INSERT INTO users (google_id, email, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [id, email, displayName, avatar_url]
        );
        user = newUser;
      }
      
      return done(null, user.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }
));