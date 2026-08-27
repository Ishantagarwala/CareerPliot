import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = 'demo@careerpilot.com';
const DEMO_PASSWORD = 'demo1234';
const BASE_URL = 'http://localhost:3000';

async function runDemoSimulation() {
  console.log('--- Step 1: Connecting to MongoDB & ensuring demo user ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/careerpilot');
  
  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: { type: String, select: false },
    provider: String,
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: 'Demo Student',
        email: DEMO_EMAIL,
        password: hashedPassword,
        provider: 'credentials',
      },
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Demo user ensured: ${user.email} (ID: ${user._id})`);
  await mongoose.disconnect();

  console.log('\n--- Step 2: Fetching CSRF token from /api/auth/csrf ---');
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const initialCookies = csrfRes.headers.get('set-cookie') || '';
  console.log(`✅ CSRF Token received: ${csrfToken.slice(0, 12)}...`);

  // Extract cookies
  const parseCookies = (setCookieHeader) => {
    if (!setCookieHeader) return {};
    const cookies = {};
    const parts = setCookieHeader.split(/,(?=[^;]+;)/);
    for (const part of parts) {
      const match = part.trim().match(/^([^=]+)=([^;]+)/);
      if (match) cookies[match[1]] = match[2];
    }
    return cookies;
  };

  let cookieJar = parseCookies(initialCookies);

  console.log('\n--- Step 3: Authenticating with credentials callback ---');
  const params = new URLSearchParams({
    csrfToken,
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    captchaToken: '',
    loginTicket: '',
    redirect: 'false',
    callbackUrl: `${BASE_URL}/dashboard`,
  });

  const cookieHeader = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');

  const authRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    body: params.toString(),
    redirect: 'manual',
  });

  const authSetCookie = authRes.headers.get('set-cookie');
  if (authSetCookie) {
    cookieJar = { ...cookieJar, ...parseCookies(authSetCookie) };
  }

  const sessionCookieHeader = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
  console.log(`✅ Auth response status: ${authRes.status}`);

  console.log('\n--- Step 4: Calling /api/seed with session cookies ---');
  const seedRes = await fetch(`${BASE_URL}/api/seed`, {
    method: 'POST',
    headers: {
      'Cookie': sessionCookieHeader,
    },
  });
  const seedJson = await seedRes.json().catch(() => ({}));
  console.log(`✅ Seed response status: ${seedRes.status}`, seedJson);

  console.log('\n--- Step 5: Checking database collections & documents ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/careerpilot');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`Collections created (${collections.length}):`);
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} document(s)`);
  }
  await mongoose.disconnect();

  console.log('\n--- Step 6: Verifying core routes with session ---');
  const routesToTest = [
    '/',
    '/login',
    '/dashboard',
    '/roadmap',
    '/courses',
    '/jobs',
    '/resume',
    '/news',
    '/projects',
  ];

  for (const route of routesToTest) {
    const res = await fetch(`${BASE_URL}${route}`, {
      headers: { 'Cookie': sessionCookieHeader },
    });
    console.log(`Route [${route}]: HTTP ${res.status}`);
  }

  console.log('\n🎉 Demo Run simulation completed successfully!');
}

runDemoSimulation().catch((err) => {
  console.error('Demo simulation error:', err);
  process.exit(1);
});
