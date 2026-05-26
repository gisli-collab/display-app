const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async function updatePriceProxy(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
  }

  const webhookUrl = process.env.N8N_PRICE_UPDATE_WEBHOOK_URL;

  if (!webhookUrl) {
    return jsonResponse(
      {
        success: false,
        error: 'Missing N8N_PRICE_UPDATE_WEBHOOK_URL environment variable in Netlify.'
      },
      500
    );
  }

  if (!event.body) {
    return jsonResponse({ success: false, error: 'Missing request body.' }, 400);
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return jsonResponse({ success: false, error: 'Body must be JSON.' }, 400);
  }

  if (payload.new_price === undefined || payload.new_price === null || Number.isNaN(Number(payload.new_price))) {
    return jsonResponse({ success: false, error: 'Missing valid new_price.' }, 400);
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8'
    };

    if (process.env.N8N_PRICE_UPDATE_TOKEN) {
      headers['x-display-app-token'] = process.env.N8N_PRICE_UPDATE_TOKEN;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';

    return {
      statusCode: response.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      },
      body
    };
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error.message || 'Could not send price update to n8n.'
      },
      502
    );
  }
};

function jsonResponse(payload, statusCode = 200) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}
