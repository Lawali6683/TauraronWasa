export default {
    async fetch(request, env) {
        const { pathname } = new URL(request.url);

        // API keys da aka sanya kai tsaye a cikin code
        const allowedKey = '@haruna66';
        const footballToken = 'b75541b8a8cc43719195871aa2bd419e';

        const apiKey = request.headers.get('x-api-key');

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Content-Type': 'application/json'
        };

        // Handle OPTIONS request (CORS preflight)
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // Bincika idan API key ɗin ya dace
        if (apiKey !== allowedKey) {
            return new Response(JSON.stringify({ error: "Unauthorized access" }), {
                status: 401,
                headers: corsHeaders
            });
        }

        if (request.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
                status: 405,
                headers: corsHeaders
            });
        }

        // --- Football API Handler ---
        if (pathname === '/football') {
            try {
                const { date, game1Name, game2Name } = await request.json();

                if (!date || !game1Name || !game2Name) {
                    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                const footballApiUrl = `https://api.football-data.org/v4/matches?dateFrom=${date}&dateTo=${date}`;

                const response = await fetch(footballApiUrl, {
                    headers: { 'X-Auth-Token': footballToken }
                });

                if (!response.ok) {
                    console.error("Error from Football API:", response.status, await response.text());
                    return new Response(JSON.stringify({ error: "Failed to fetch football data from external API" }), {
                        status: 502,
                        headers: corsHeaders
                    });
                }

                const data = await response.json();
                const match = data.matches.find(match =>
                    (match.homeTeam.name === game1Name && match.awayTeam.name === game2Name) ||
                    (match.homeTeam.name === game2Name && match.awayTeam.name === game1Name)
                );

                if (match && match.status === 'FINISHED') {
                    const homeScore = match.score.fullTime.home;
                    const awayScore = match.score.fullTime.away;
                    return new Response(JSON.stringify({ homeScore, awayScore }), {
                        status: 200,
                        headers: corsHeaders
                    });
                }

                return new Response(JSON.stringify({ error: "Match not found or not finished" }), {
                    status: 404,
                    headers: corsHeaders
                });

            } catch (error) {
                console.error("Error in football-results worker:", error);
                return new Response(JSON.stringify({ error: "Internal server error" }), {
                    status: 500,
                    headers: corsHeaders
                });
            }
        }

        return new Response(JSON.stringify({ error: "Invalid route" }), {
            status: 404,
            headers: corsHeaders
        });
    }
};
