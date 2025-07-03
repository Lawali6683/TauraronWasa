export default {
  async fetch(request, env, ctx) {
    // Preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (request.method !== 'POST') {
      return new Response('Only POST allowed', {
        status: 405,
        headers: corsHeaders()
      });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response('Expected multipart/form-data', {
        status: 400,
        headers: corsHeaders()
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return new Response('File missing or invalid', {
        status: 400,
        headers: corsHeaders()
      });
    }

    try {
      const link = await uploadToCatbox(file)
        .catch(() => uploadToAnonfiles(file))
        .catch(() => uploadToPixeldrain(file));

      if (link) {
        return new Response(JSON.stringify({ success: true, link }), {
          status: 200,
          headers: {
            ...corsHeaders(),
            'Content-Type': 'application/json'
          }
        });
      } else {
        return new Response('All upload services failed', {
          status: 500,
          headers: corsHeaders()
        });
      }
    } catch (err) {
      return new Response('Error: ' + err.message, {
        status: 500,
        headers: corsHeaders()
      });
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
 
