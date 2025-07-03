export async function handleGetLink(request) {
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
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function uploadToCatbox(file) {
  const body = new FormData();
  body.append('reqtype', 'fileupload');
  body.append('fileToUpload', file, file.name);

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body,
  });
  const text = await res.text();
  if (text.startsWith('http')) return text;
  throw new Error('Catbox failed');
}

async function uploadToAnonfiles(file) {
  const body = new FormData();
  body.append('file', file, file.name);

  const res = await fetch('https://api.anonfiles.com/upload', {
    method: 'POST',
    body,
  });
  const data = await res.json();
  if (data.status && data.data?.file?.url?.full) return data.data.file.url.full;
  throw new Error('Anonfiles failed');
}

async function uploadToPixeldrain(file) {
  const body = new FormData();
  body.append('file', file, file.name);

  const res = await fetch('https://pixeldrain.com/api/file', {
    method: 'PUT',
    body,
  });
  const data = await res.json();
  if (data.success && data.id) return `https://pixeldrain.com/u/${data.id}`;
  throw new Error('Pixeldrain failed');
}
