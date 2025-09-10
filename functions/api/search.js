
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
    const requestBody = await request.json();
    const { query } = requestBody;
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const TRANSLATE_API_KEY = "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";
    const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

    if (!query) {
      const response = new Response(
        JSON.stringify({ error: true, message: "Query parameter is missing." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
      return withCORSHeaders(response, origin);
    }

    
    const translateText = async (text) => {
      if (!text) return "";
      try {
        const translateRes = await fetch(TRANSLATE_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TRANSLATE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: `Ka fassara wannan zuwa Hausa kawai: ${text}` }],
          }),
        });
        if (!translateRes.ok) {
          const errorText = await translateRes.text();
          console.error(`Translation API Error: ${translateRes.status} - ${errorText}`);
          return text;
        }
        const translateData = await translateRes.json();
        return translateData?.choices?.[0]?.message?.content || text;
      } catch (e) {
        console.error("Translation error:", e.message, e.stack);
        return text;
      }
    };

   
    const searchFootballData = async (query) => {
      const knownComps = {
        "champions league": "CL",
        "premier league": "PL",
        laliga: "PD",
        "serie a": "SA",
        bundesliga: "BL1",
        eredivisie: "DED",
        "europa league": "EL",
        "fa cup": "FAC",
        npfl: "",
      };

      for (const name in knownComps) {
        if (query.includes(name) && knownComps[name]) {
          const url = `https://api.football-data.org/v4/competitions/${knownComps[name]}/matches`;
          const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
          if (res.ok) {
            const data = await res.json();
            return { type: "competition_matches", data, code: knownComps[name], name };
          } else {
            console.error(`Football API Error (competition matches): ${res.status} - ${await res.text()}`);
          }
        }
      }

      if (["today", "yau", "yau aka buga", "today's matches", "wasannin yau"].some((t) => query.includes(t))) {
        const res = await fetch("https://api.football-data.org/v4/matches", { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "today_matches", data };
        } else {
          console.error(`Football API Error (today's matches): ${res.status} - ${await res.text()}`);
        }
      }

      const teamMap = {
        "real madrid": 86,
        barcelona: 81,
        arsenal: 57,
        chelsea: 61,
        "manchester united": 66,
        juventus: 109,
        inter: 108,
        "ac milan": 98,
        liverpool: 64,
      };

      for (const k in teamMap) {
        if (query === k) {
          const url = `https://api.football-data.org/v4/teams/${teamMap[k]}/matches?status=SCHEDULED`;
          const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
          if (res.ok) {
            const data = await res.json();
            return { type: "team_matches", data, team: k };
          } else {
            console.error(`Football API Error (team matches): ${res.status} - ${await res.text()}`);
          }
        }
      }

      if (query.includes("buffon")) {
        const url = "https://api.football-data.org/v4/persons/2019/matches?status=FINISHED";
        const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "player_matches", data, player: "Gigi Buffon" };
        } else {
          console.error(`Football API Error (player matches): ${res.status} - ${await res.text()}`);
        }
      }

      if (["table", "tebur", "standings"].some((t) => query.includes(t))) {
        const url = "https://api.football-data.org/v4/competitions/DED/standings";
        const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "standings", data, league: "Eredivisie" };
        } else {
          console.error(`Football API Error (standings): ${res.status} - ${await res.text()}`);
        }
      }

      if (["top 10", "masu kwallo", "scorers"].some((t) => query.includes(t))) {
        const url = "https://api.football-data.org/v4/competitions/SA/scorers?limit=10";
        const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "scorers", data, league: "Serie A" };
        } else {
          console.error(`Football API Error (scorers): ${res.status} - ${await res.text()}`);
        }
      }
      return null;
    };

  
    const fallbackSearch = async (query) => {
      const TEAM_API = "https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?t=";
      const PLAYER_API = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";

      const [teamRes, playerRes] = await Promise.all([
        fetch(TEAM_API + encodeURIComponent(query)),
        fetch(PLAYER_API + encodeURIComponent(query)),
      ]);

      const teamData = teamRes.ok ? await teamRes.json() : { teams: [] };
      const playerData = playerRes.ok ? await playerRes.json() : { player: [] };

      if (teamData.teams?.length) {
        const teamsWithTranslations = await Promise.all(
          teamData.teams.map(async (team) => {
            if (team.strDescriptionEN) {
              team.strDescriptionHA = await translateText(team.strDescriptionEN);
            }
            return team;
          })
        );
        return { type: "team", teams: teamsWithTranslations };
      }

      if (playerData.player?.length) {
        const playersWithTranslations = await Promise.all(
          playerData.player.map(async (player) => {
            if (player.strDescriptionEN) {
              player.strDescriptionHA = await translateText(player.strDescriptionEN);
            }
            return player;
          })
        );
        return { type: "player", players: playersWithTranslations };
      }

      return { type: "none" };
    };

    
    let result = await searchFootballData(query.toLowerCase());
    if (!result) {
      result = await fallbackSearch(query);
    }

    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    return withCORSHeaders(response, origin);

  } catch (e) {
   
    console.error("Server error in search.js:", e.message, e.stack);
    const errorResponse = new Response(
      JSON.stringify({
        error: true,
        message: "Server error while processing search.",
        details: e.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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