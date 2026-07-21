const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

// Load env.local manually
const envPath = path.join(__dirname, '../.env.local');
let env = {};
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[key] = value.trim();
    }
  });
} catch (e) {
  console.error('Could not read .env.local file:', e.message);
  process.exit(1);
}

const vapidPublicKey = env['VAPID_PUBLIC_KEY'] || env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
const vapidPrivateKey = env['VAPID_PRIVATE_KEY'];
const adminEmail = env['ADMIN_EMAIL'] || 'qassemvbey@gmail.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('VAPID keys not found in .env.local');
  process.exit(1);
}

console.log('Using VAPID Public Key:', vapidPublicKey.substring(0, 15) + '...');

// Set VAPID details
webpush.setVapidDetails(
  `mailto:${adminEmail}`,
  vapidPublicKey,
  vapidPrivateKey
);

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/dlT3l_PGNak:APA91bHTtPPIrg9putYgi1PyzzV7QC4CwN5O5xMw91HFkOBBQmOo6JAX7sFBAb6GKQzJs_ITBDeEBIbvbYmIS8jvWzLbxMUFp5B6eXKcXb_5wvfe13vZNEbNRH4N1HYLDT73u87eZgy4",
  keys: {
    auth: "72FtSsCDDhLqxkiLc_aijg",
    p256dh: "BHlYNpIipcVU49vLwK2MYhGyQXVaQmleRZIXnt8mRHLLvG9cdInGlnDjZIFFY1zKsujxTIMdkQfpIRlu00iQJHY"
  }
};

const payload = JSON.stringify({
  title: "Growth Hub 🚀",
  body: "النوتيفيكيشن شغالة!",
  url: "/"
});

console.log('Sending push notification to subscription...');

webpush.sendNotification(subscription, payload)
  .then(response => {
    console.log('SUCCESS: Push notification sent successfully!');
    console.log('Status code:', response.statusCode);
  })
  .catch(error => {
    console.error('ERROR: Failed to send push notification:', error.message);
    if (error.statusCode) {
      console.error('HTTP Status:', error.statusCode);
    }
    if (error.body) {
      console.error('Response Body:', error.body);
    }
  });
