const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async function productsProxy(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed. Use GET.' }, 405);
  }

  const webhookUrl = process.env.N8N_PRODUCTS_WEBHOOK_URL;

  if (!webhookUrl) {
    return jsonResponse(
      {
        success: false,
        error: 'Missing N8N_PRODUCTS_WEBHOOK_URL environment variable in Netlify.'
      },
      500
    );
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/csv, text/plain;q=0.9, */*;q=0.8'
      }
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
        error: error.message || 'Could not fetch n8n products webhook.'
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
