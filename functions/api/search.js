export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  // ✅ Idan request ɗin "OPTIONS" ne, amsa CORS kawai
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const { headers } = request;
  const WORKER_API_KEY = headers.get("x-api-key");
  const contentType = headers.get("content-type") || "";

  // ✅ API Key validation
  if (WORKER_API_KEY !== "@haruna66") {
    return new Response(
      JSON.stringify({ error: true, message: "Invalid API Key" }),
      { status: 401, headers: corsHeaders() }
    );
  }

  // ✅ Tabbatar da POST JSON
  if (request.method !== "POST" || !contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }),
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const requestBody = await request.json();
    const { query } = requestBody;

    // === CONFIG KEYS ===
    const FOOTBALL_API_TOKEN = "b75541b8a8cc43719195871aa2bd419e";
    const TRANSLATE_API_KEY =
      "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";
    const TRANSLATE_API_URL = "https://openrouter.ai/api/v1/chat/completions";

    // 🔄 Function domin translation
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
            model: "openai/gpt-4o",
            messages: [
              {
                role: "user",
                content: `Ka fassara wannan zuwa hausa, wadda kowa zai gane ba tare da wani karin bayani ba. Kada ka rubuta wani jawabi ko misali, ka dawo da fassara kawai. ${text}`,
              },
            ],
          }),
        });
        const translateData = await translateRes.json();
        return translateData?.choices?.[0]?.message?.content || text;
      } catch (e) {
        console.error("Translation failed:", e);
        return text;
      }
    };

    // 🔎 Football search logic
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

      // ✅ Competitions
      for (const name in knownComps) {
        if (query.includes(name)) {
          if (knownComps[name]) {
            const url = `https://api.football-data.org/v4/competitions/${knownComps[name]}/matches`;
            const res = await fetch(url, {
              headers: { "X-Auth-Token": FOOTBALL_API_TOKEN },
            });
            if (res.ok) {
              const data = await res.json();
              return { type: "competition_matches", data, code: knownComps[name], name };
            }
          }
        }
      }

      // ✅ Matches of today
      if (
        ["today", "yau", "yau aka buga", "today's matches", "wasannin yau"].some((t) =>
          query.includes(t)
        )
      ) {
        const res = await fetch("https://api.football-data.org/v4/matches", {
          headers: { "X-Auth-Token": FOOTBALL_API_TOKEN },
        });
        if (res.ok) {
          const data = await res.json();
          return { type: "today_matches", data };
        }
      }

      // ✅ Specific teams
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
          }
        }
      }

      // ✅ Example: Buffon
      if (query.includes("buffon")) {
        const url =
          "https://api.football-data.org/v4/persons/2019/matches?status=FINISHED";
        const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "player_matches", data, player: "Gigi Buffon" };
        }
      }

      // ✅ Standings
      if (["table", "tebur", "standings"].some((t) => query.includes(t))) {
        const url = "https://api.football-data.org/v4/competitions/DED/standings";
        const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "standings", data, league: "Eredivisie" };
        }
      }

      // ✅ Scorers
      if (["top 10", "masu kwallo", "scorers"].some((t) => query.includes(t))) {
        const url = "https://api.football-data.org/v4/competitions/SA/scorers?limit=10";
        const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
        if (res.ok) {
          const data = await res.json();
          return { type: "scorers", data, league: "Serie A" };
        }
      }

      return null;
    };

    // 🔎 SportsDB fallback search
    const fallbackSearch = async (query) => {
      const TEAM_API = "https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?t=";
      const PLAYER_API = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";

      const teamRes = await fetch(TEAM_API + encodeURIComponent(query));
      const teamData = await teamRes.json();
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

      const playerRes = await fetch(PLAYER_API + encodeURIComponent(query));
      const playerData = await playerRes.json();
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

    // 🔎 Main Search
    let result = await searchFootballData(query.toLowerCase());
    if (!result) {
      result = await fallbackSearch(query);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "Server error while processing search.",
        details: e.message,
      }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ✅ CORS headers domin duk domain su iya yin request
function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}
