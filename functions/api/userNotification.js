// ✅ User Notification handler
export async function handleUserNotification(request) {
  try {
    // ✅ Handle OPTIONS (CORS preflight)
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // ✅ Method check
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    // ✅ API key check
    const API_KEY = "@haruna66";
    const apiKeyHeader = request.headers.get("x-api-key");
    if (apiKeyHeader !== API_KEY) {
      return jsonResponse({ error: "Invalid API Key" }, 403);
    }

    // ✅ Karɓar request body
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
      return jsonResponse(
        { error: "Missing required fields: recipientSubscription, title" },
        400
      );
    }

    // ✅ Hardcoded VAPID keys (ka saka naka idan ba waɗannan ba)
    const VAPID_PUBLIC_KEY =
      "BHKKgIF0DdjV9XXxXGI7MXQA_scnU0OxDP80OtZSlZyD02gSJY6aRYPxOS32bBP-wgjWAJr5VP4pDMYat38LGYc";
    const VAPID_PRIVATE_KEY = "oixOsctNeUMNwmGfMTAb4Y96fXDChzbzNWls1maPb54";

    // ⚠️ Cloudflare Workers baya goyon bayan npm modules kamar `web-push` kai tsaye.
    // Don haka dole sai ka yi integrate da external push service ko ka rubuta
    // custom Web Push request da `fetch`. Wannan misalin yana nuna yadda za a yi:

    const notificationPayload = {
      title,
      body,
      icon,
      badge,
      url: notificationUrl
    };

    // ⚡ Idan kana son kai tsaye web-push, sai ka yi shi daga Node.js server,
    // amma idan daga Worker ne, sai ka yi `fetch` zuwa push service ɗinka.

    // A yanzu sai mu mayar da response don tabbatar da request ya shigo daidai:
    return jsonResponse({
      message: `Notification request accepted for ${recipientFullName || "user"}`,
      notification: notificationPayload
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Failed to handle notification request",
        details: error.message
      },
      500
    );
  }
}

// ✅ Helper don bada JSON response tare da CORS headers
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    }
  });
}

// ✅ Handle OPTIONS (CORS preflight)
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key"
    }
  });
}
