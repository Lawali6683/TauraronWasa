export async function onRequest(context) {
  const { env } = context;

  try {
    const now = Date.now();
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    const dateFrom = start.toISOString().split("T")[0];
    const dateTo = end.toISOString().split("T")[0];

    // Fetch fixtures daga API
    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY6 },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: true, message: errorText }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    // Categorize fixtures
    const categorized = {};
    fixtures.forEach((f) => {
      const fixtureDate = new Date(f.utcDate).toISOString().split("T")[0];
      if (!categorized[fixtureDate]) categorized[fixtureDate] = [];
      categorized[fixtureDate].push(f);
    });

    // Save to Firebase REST
    await fetch(`https://tauraronwasa-default-rtdb.firebaseio.com/fixtures.json?auth=${env.FIREBASE_SECRET}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fixtures: categorized,
        lastUpdated: now,
      }),
    });

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Fixtures updated",
        total: fixtures.length,
        days: Object.keys(categorized).length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
