export async function onRequest(context) {
  const { request, env } = context;

  // Damar CORS domin localhost da tauraronwasa
  const ALLOWED_ORIGINS = [
    "https://tauraronwasa.pages.dev",
    "https://www.tauraronwasa.com",
    "http://localhost:8080",
  ];
  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

  try {
    const now = Date.now();
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    const dateFrom = start.toISOString().split("T")[0];
    const dateTo = end.toISOString().split("T")[0];

    console.log("🔍 Fetching fixtures from API...");
    console.log(`Range: ${dateFrom} - ${dateTo}`);

    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY6 },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API error:", errorText);
      return new Response(
        JSON.stringify({ error: true, message: errorText }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowOrigin,
          },
        }
      );
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    console.log(`✅ Fixtures fetched: ${fixtures.length}`);

    // Categorize fixtures
    const categorized = {};
    fixtures.forEach((f) => {
      const fixtureDate = new Date(f.utcDate).toISOString().split("T")[0];
      if (!categorized[fixtureDate]) categorized[fixtureDate] = [];
      categorized[fixtureDate].push(f);
    });

    // Save to Firebase
    console.log("💾 Saving data to Firebase...");
    const saveRes = await fetch(
      `https://tauraronwasa-default-rtdb.firebaseio.com/fixtures.json?auth=${env.FIREBASE_SECRET}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtures: categorized,
          lastUpdated: now,
        }),
      }
    );

    if (!saveRes.ok) {
      const text = await saveRes.text();
      console.error("❌ Firebase error:", text);
      return new Response(
        JSON.stringify({
          error: true,
          message: "Firebase save error",
          details: text,
        }),
        {
          status: saveRes.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowOrigin,
          },
        }
      );
    }

    console.log("✅ Firebase update completed.");

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Fixtures updated successfully",
        total: fixtures.length,
        days: Object.keys(categorized).length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin,
        },
      }
    );
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowOrigin,
        },
      }
    );
  }
}
