export async function onRequest(context) {
    const { request, env } = context;
    const origin = request.headers.get("Origin");
    const ALLOWED_ORIGINS = [
        "https://tauraronwasa.pages.dev",
        "https://leadwaypeace.pages.dev",
        "http://localhost:8080",
    ];

    function withCORSHeaders(response, origin) {
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

    if (request.method === "OPTIONS") {
        return withCORSHeaders(new Response(null, { status: 204 }), origin);
    }

    const WORKER_API_KEY = request.headers.get("x-api-key");
    const contentType = request.headers.get("content-type") || "";

    if (WORKER_API_KEY !== env.API_AUTH_KEY) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid API Key" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

    if (request.method !== "POST" || !contentType.includes("application/json")) {
        const response = new Response(
            JSON.stringify({ error: true, message: "Invalid Request Method or Content-Type" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
        return withCORSHeaders(response, origin);
    }

    // ⭐ Gyaran da zai warware matsalar 1970
    function normalizeTsdbMatch(match) {
        let utcDate;
        
        // Muna amfani da strDate da strTime don ƙirƙirar kwanan wata mai inganci.
        // Haka kuma, an saka "UTC" don tabbatar da ba a canza timezone ba.
        if (match.strDate && match.strTime) {
            // strTime yana iya zama a tsarin 'HH:MM:SS' ko 'HH:MM'. Muna gyara shi.
            const timePart = match.strTime.length === 5 ? `${match.strTime}:00` : match.strTime;
            // Haɗa kwanan wata da lokaci, sannan a saka 'Z' (watau Zulu/UTC) don cire matsalar timezone.
            // Lura: Wannan yana aiki ne idan TheSportsDB ya bada data a UTC.
            utcDate = `${match.strDate}T${timePart}Z`;
        } else if (match.strTimestamp) {
            // Wannan shine tsohon gyaran da ya kasa aiki: idan 'strDate' da 'strTime' basu yi aiki ba.
            const timestampInMs = parseInt(match.strTimestamp.padEnd(13, '0'));
            utcDate = new Date(timestampInMs).toISOString();
        } else if (match.dateEvent) {
             utcDate = match.dateEvent; 
        } else {
            utcDate = new Date().toISOString(); // Fallback
        }
        
        // Tabbatar da an saka muhimman bayanai
        return {
            ...match,
            utcDate: utcDate, // Wannan zai nuna daidai a client-side
            homeTeam: { name: match.strHomeTeam || match.strEvent, crest: match.strHomeTeamBadge },
            awayTeam: { name: match.strAwayTeam, crest: match.strAwayTeamBadge },
            score: { fullTime: { home: parseInt(match.intHomeScore), away: parseInt(match.intAwayScore) } },
            status: match.strStatus || 'Scheduled',
        };
    }
    
    try {
        const requestBody = await request.json();
        const { competition } = requestBody;

        if (!competition) {
            const response = new Response(
                JSON.stringify({ error: true, message: "Competition parameter is missing." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
            return withCORSHeaders(response, origin);
        }

        const compCode = competition.toUpperCase();
        let matchesData = null;
        let standingsData = null;
        let scorersData = null;
        
        // 🔑 An dawo da amfani da '123' kamar yadda kuka ce yana aiki
        const TSDB_API_KEY = '123'; 
        const TSDB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${TSDB_API_KEY}`;
        
        const TSDB_COMPETITIONS = {
            'NPL': { id: '4827', isLeague: true }, 
            'SPL': { id: '4359', isLeague: true }, 
            'AFCON': { id: '4319', isLeague: false }, 
            'CWC': { id: '4487', isLeague: false }, 
            'UECL': { id: '4521', isLeague: true }, 
            'FAC': { id: '4336', isLeague: false }, 
            'DFBP': { id: '4401', isLeague: false }, 
            'CDR': { id: '4371', isLeague: false }, 
            'COPI': { id: '4486', isLeague: false }, 
            'KNVB': { id: '4383', isLeague: false }, 
            'EFLC': { id: '4396', isLeague: false },
        };

        const tsdbComp = TSDB_COMPETITIONS[compCode];

        if (tsdbComp) {
            const leagueId = tsdbComp.id;
            const fetchTasks = [];

            // Aikin tattara matches gaba daya don leagues da cups
            const fetchAllMatches = async () => {
                let allEvents = [];
                let leagueTasks = [];
                let cupTasks = [];

                if (tsdbComp.isLeague) {
                    leagueTasks.push(fetch(`${TSDB_BASE_URL}/eventspastleague.php?id=${leagueId}`));
                    leagueTasks.push(fetch(`${TSDB_BASE_URL}/eventsnextleague.php?id=${leagueId}`));
                    
                    const leagueResults = await Promise.all(leagueTasks);
                    for (const res of leagueResults) {
                        const data = res.ok ? await res.json() : null;
                        allEvents.push(...(data?.events || []));
                    }
                } else {
                    // Don Cups: Muna ƙara /eventslast da /eventsnext
                    cupTasks.push(fetch(`${TSDB_BASE_URL}/eventslast.php?id=${leagueId}`));
                    cupTasks.push(fetch(`${TSDB_BASE_URL}/eventsnext.php?id=${leagueId}`));
                    
                    const cupResults = await Promise.all(cupTasks);
                    for (const res of cupResults) {
                        const data = res.ok ? await res.json() : null;
                        // eventslast yana amfani da 'results' ne ba 'events' ba
                        allEvents.push(...(data?.results || data?.events || []));
                    }
                }

                // Cire matches masu maimaitawa kuma a gyara kwanan wata
                const uniqueEvents = new Map();
                for (const event of allEvents) {
                    if (event.idEvent) {
                        uniqueEvents.set(event.idEvent, normalizeTsdbMatch(event));
                    }
                }
                // An tace events, an gyara kwanan wata, yanzu mun shirya don dawowa da su
                return Array.from(uniqueEvents.values());
            };
            
            fetchTasks.push(fetchAllMatches().then(matches => {
                matchesData = { matches: matches };
            }).catch(e => {
                 console.error(`TSDB Matches Failed for ${compCode}:`, e.message);
                 matchesData = { matches: [] };
            }));

            // Standings da Scorers basu canza ba
            if (tsdbComp.isLeague) {
                const fetchStandings = async () => {
                    try {
                        const res = await fetch(`${TSDB_BASE_URL}/lookuptable.php?l=${leagueId}`);
                        const data = res.ok ? await res.json() : null;
                        return data?.tables ? data.tables : null;
                    } catch (e) {
                        console.error(`TSDB Standings Failed for ${compCode}:`, e.message);
                        return null;
                    }
                };
                fetchTasks.push(fetchStandings().then(data => {
                    standingsData = { standings: data };
                }));
            }

            const fetchScorers = async () => {
                try {
                    const res = await fetch(`${TSDB_BASE_URL}/lookuptopscorers.php?id=${leagueId}`);
                    const data = res.ok ? await res.json() : null;
                    return data?.countrys ? data.countrys : null; 
                } catch (e) {
                    console.error(`TSDB Scorers Failed for ${compCode}:`, e.message);
                    return null;
                }
            };
            fetchTasks.push(fetchScorers().then(data => {
                scorersData = { scorers: data };
            }));

            await Promise.all(fetchTasks);
        } else {
            // Bangaren Football-Data.org API ba a canza shi ba
            const FOOTBALL_API_TOKEN = env.FOOTBALL_API_TOKEN4;
            // ... (Aikin Football-Data.org a nan)
             const fetchMatches = async () => {
                try {
                    const matchesRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/matches`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                    return matchesRes.ok ? await matchesRes.json() : null;
                } catch (e) {
                    console.error("Failed to fetch matches:", e);
                    return null;
                }
            };
            const fetchStandings = async () => {
                try {
                    const standingsRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/standings`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                    return standingsRes.ok ? await standingsRes.json() : null;
                } catch (e) {
                    console.error("Failed to fetch standings:", e);
                    return null;
                }
            };
            const fetchScorers = async () => {
                try {
                    const scorersRes = await fetch(`https://api.football-data.org/v4/competitions/${compCode}/scorers?limit=10`, { headers: { "X-Auth-Token": FOOTBALL_API_TOKEN } });
                    return scorersRes.ok ? await scorersRes.json() : null;
                } catch (e) {
                    console.error("Failed to fetch scorers:", e);
                    return null;
                }
            };
            
            [matchesData, standingsData, scorersData] = await Promise.all([
                fetchMatches(),
                fetchStandings(),
                fetchScorers()
            ]);
        }
       
        const result = {
            matches: matchesData?.matches || [], 
            standings: standingsData?.standings || [],
            scorers: scorersData?.scorers || [],
        };

        const response = new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        return withCORSHeaders(response, origin);

    } catch (e) {
        console.error("Server error in search.js:", e.message);
        const errorResponse = new Response(
            JSON.stringify({
                error: true,
                message: "An samu matsala yayin aikin bincike. Da fatan za a gwada daga baya.",
                details: e.message,
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
        return withCORSHeaders(errorResponse, origin);
    }
}
