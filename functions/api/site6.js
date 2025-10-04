export async function onRequest(context) {
  const { env } = context;

  try {
    const now = Date.now();
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    const dateFrom = start.toISOString().split("T")[0];
    const dateTo = end.toISOString().split("T")[0];

    // ========== FETCH FIXTURES ==========
    const apiUrl = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const response = await fetch(apiUrl, {
      headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY6 },
    });

    // Idan response bai yi ba
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: true,
          stage: "Football API",
          message: `HTTP ${response.status}: ${errorText}`,
          apiUrl,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    // ========== CATEGORIZE ==========
    const categorized = {};
    fixtures.forEach((f) => {
      const fixtureDate = new Date(f.utcDate).toISOString().split("T")[0];
      if (!categorized[fixtureDate]) categorized[fixtureDate] = [];
      categorized[fixtureDate].push(f);
    });

    // ========== SAVE TO FIREBASE ==========
    const fbUrl = `https://tauraronwasa-default-rtdb.firebaseio.com/fixtures.json?auth=${env.FIREBASE_SECRET}`;
    const fbRes = await fetch(fbUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixtures: categorized, lastUpdated: now }),
    });

    if (!fbRes.ok) {
      const fbErr = await fbRes.text();
      return new Response(
        JSON.stringify({
          error: true,
          stage: "Firebase",
          message: fbErr,
          fbUrl,
        }),
        {
          status: fbRes.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

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
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        stage: "Catch Block",
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
