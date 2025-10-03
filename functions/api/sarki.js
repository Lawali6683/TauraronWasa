export async function onRequest(context) {
  const { request, env } = context;

  // ALLOWED ORIGINS
  const ALLOWED_ORIGINS = [
    "https://tauraronwasa.pages.dev",
    "https://www.tauraronwasa.com",
    "http://localhost:8080",
  ];

  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin || "null",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const WORKER_API_KEY = request.headers.get("x-api-key");
  if (WORKER_API_KEY !== env.API_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: true, message: "Unauthorized request" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin || "null",
        },
      }
    );
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: true, message: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin || "null",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const newSarkiData = {
      userUid: body.userUid,
      fullName: body.fullName,
      profileLogo: body.profileLogo,
      teamLogo: body.teamLogo,
      commentText: body.commentText,
      commentTime: body.commentTime,
      team1Logo: body.team1Logo,
      team1Name: body.team1Name,
      team2Logo: body.team2Logo,
      team2Name: body.team2Name,
      sarkiLove: 0,
      isActive: true,
      timestamp: Date.now(),
    };

    await fetch(
      `https://tauraronwasa-default-rtdb.firebaseio.com/Sarki.json?auth=${env.FIREBASE_SECRET}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSarkiData),
      }
    );

    return new Response(
      JSON.stringify({
        message: "An adana bayanan sarki cikin nasara",
        data: newSarkiData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin || "null",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Kuskure wajen ajiye bayanai",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin || "null",
        },
      }
    );
  }
}
