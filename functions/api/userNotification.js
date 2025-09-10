
export async function onRequest(context) {
  const { request } = context;

  
  const origin = request.headers.get("Origin");
  const ALLOWED_ORIGINS = [
    "https://tauraronwasa.pages.dev",
    "https://leadwaypeace.pages.dev",
    "http://localhost:8080",
  ];

 
  if (request.method === "OPTIONS") {
    if (ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    return new Response(null, { status: 403 }); 
  }

 
  const WORKER_API_KEY = request.headers.get("x-api-key");
  const contentType = request.headers.get("content-type") || "";

  
  if (WORKER_API_KEY !== "@haruna66") {
    const response = new Response(
      JSON.stringify({ error: true, message: "Invalid API Key" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(response, origin);
  }

  
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    const response = new Response(
      JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(response, origin);
  }

  try {
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
      const response = new Response(
        JSON.stringify({ error: true, message: "Missing required fields: recipientSubscription, title" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

   
    console.log(`Notification request received for ${recipientFullName || "user"}:`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`URL: ${notificationUrl}`);
    console.log("Subscription details:", recipientSubscription);

    const notificationPayload = {
      message: `Notification request accepted for ${recipientFullName || "user"}. (Note: This is a simulation, no notification was sent)`,
      notification: {
        title,
        body,
        icon,
        badge,
        url: notificationUrl
      }
    };

    const finalResponse = new Response(JSON.stringify(notificationPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    return withCORSHeaders(finalResponse, origin);
  } catch (e) {
   
    console.error("Server error in userNotification.js:", e.message, e.stack);

    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Failed to handle notification request.",
        details: e.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
    return withCORSHeaders(errorResponse, origin);
  }
}


function withCORSHeaders(response, origin) {
  const ALLOWED_ORIGINS = [
    "https://tauraronwasa.pages.dev",
    "https://leadwaypeace.pages.dev",
    "http://localhost:8080",
  ];

  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", "https://tauraronwasa.pages.dev");
  }
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}