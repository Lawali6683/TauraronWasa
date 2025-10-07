
async function updateFixtures(env) {
    const now = Date.now();
    const start = new Date(now);
    start.setDate(start.getDate() - 2); 
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    
    const dateFrom = start.toISOString().split("T")[0];
    const dateTo = end.toISOString().split("T")[0];
    
    
    const apiUrl = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`; 

    // ===== FETCH FIXTURES =====
    const response = await fetch(apiUrl, {
      headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY6 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Football API Error HTTP ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    const fixtures = data.matches || [];

    
    const categorized = {};
    fixtures.forEach((f) => {
      const fixtureDate = new Date(f.utcDate).toISOString().split("T")[0];
      if (!categorized[fixtureDate]) categorized[fixtureDate] = [];
      categorized[fixtureDate].push(f);
    });

    
    const fbUrl = `https://tauraronwasa-default-rtdb.firebaseio.com/fixtures.json?auth=${env.FIREBASE_SECRET}`;
    const fbRes = await fetch(fbUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categorized), 
    });

    if (!fbRes.ok) {
      const fbErr = await fbRes.text();
      throw new Error(`Firebase Error HTTP ${fbRes.status}: ${fbErr.substring(0, 100)}`);
    }
    
    return {
        status: "success",
        total: fixtures.length
    };
}

export default {
 
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
        (async () => {
            try {
                await updateFixtures(env);
            } catch (error) {
                
                console.error(`Cron Job Failed: ${error.message}`);
            }
        })()
    );
  },

  
  async fetch(request, env, ctx) {
    return undefined; 
  }
};
