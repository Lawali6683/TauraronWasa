import { json } from 'https://unpkg.com/@cloudflare/workers-json-response@1.0.0';
import webpush from 'https://cdn.jsdelivr.net/npm/web-push@4.1.1/src/web-push.js';

// 🔑 Hardcoded VAPID keys (ka saka naka!)
const VAPID_PUBLIC_KEY = "BHKKgIF0DdjV9XXxXGI7MXQA_scnU0OxDP80OtZSlZyD02gSJY6aRYPxOS32bBP-wgjWAJr5VP4pDMYat38LGYc";
const VAPID_PRIVATE_KEY = "oixOsctNeUMNwmGfMTAb4Y96fXDChzbzNWls1maPb54";

export default {
    async fetch(request) {
        if (request.method !== 'POST') {
            return json({ error: 'Method Not Allowed' }, { status: 405 });
        }

        try {
            const url = new URL(request.url);
            const path = url.pathname;

            // 🔔 Notification endpoint
            if (path === '/userNotification') {
                const payload = await request.json();
                const {
                    recipientSubscription,
                    recipientFullName,
                    title,
                    body,
                    icon,
                    badge,
                    url: notificationUrl
                } = payload;

                if (!recipientSubscription || !title) {
                    return json({
                        error: 'Missing required fields: recipientSubscription, title'
                    }, { status: 400 });
                }

                // 🟢 Babu iyaka ga domains (email kawai)
                webpush.setVapidDetails(
                    'mailto:tauraronwasa@gmail.com',
                    VAPID_PUBLIC_KEY,
                    VAPID_PRIVATE_KEY
                );

                const notificationPayload = {
                    title,
                    body,
                    icon,
                    badge,
                    url: notificationUrl
                };

                await webpush.sendNotification(
                    recipientSubscription,
                    JSON.stringify(notificationPayload),
                    {
                        headers: { 'Urgency': 'high' }
                    }
                );

                return json({ message: `Notification sent to ${recipientFullName || 'user'}` });
            }

            return json({ error: 'Not Found' }, { status: 404 });
        } catch (error) {
            console.error("Error sending notification:", error);
            return json({
                error: 'Failed to send notification',
                details: error.message
            }, { status: 500 });
        }
    }
};
