
async function updateFixtures(env) {
    const now = Date.now();
    const start = new Date(now);
    start.setDate(start.getDate() - 2); 
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    
    const dateFrom = start.toISOString().split("T")[0];
    const dateTo = end.toISOString().split("T")[0];
    
    
    const apiUrl = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=FINISHED,SCHEDULED,IN_PLAY,PAUSED,SUSPENDED,POSTPONED`;

    // ===== FETCH FIXTURES =====
    const response = await fetch(apiUrl, {
      headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY6 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Football API Error: HTTP ${response.status}: ${errorText} at ${apiUrl}`);
      throw new Error(`Football API Error: ${response.status}`);
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    // ===== CATEGORIZE BY DATE =====
    const categorized = {};
    fixtures.forEach((f) => {
      const fixtureDate = new Date(f.utcDate).toISOString().split("T")[0];
      if (!categorized[fixtureDate]) categorized[fixtureDate] = [];
      categorized[fixtureDate].push(f);
    });

    // ===== SAVE TO FIREBASE =====
    const fbUrl = `https://tauraronwasa-default-rtdb.firebaseio.com/fixtures.json?auth=${env.FIREBASE_SECRET}`;
    const fbRes = await fetch(fbUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixtures: categorized, lastUpdated: now }),
    });

    if (!fbRes.ok) {
      const fbErr = await fbRes.text();
      console.error(`Firebase Error: ${fbRes.status}: ${fbErr} at ${fbUrl}`);
      throw new Error(`Firebase Error: ${fbRes.status}`);
    }
    
    return {
        status: "success",
        total: fixtures.length,
        dateRange: `${dateFrom} → ${dateTo}`
    };
}

export default {
  
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
        (async () => {
            try {
                const result = await updateFixtures(env);
                console.log(`Cron Job Success: ${JSON.stringify(result)}`);
            } catch (error) {
                console.error(`Cron Job Failed: ${error.message}`);
                
            }
        })()
    );
  },


  async fetch(request, env, ctx) {
    try {
        const result = await updateFixtures(env);
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: true, message: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
  }
};
