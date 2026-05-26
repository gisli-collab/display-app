const STORE_NAME = 'product-display';
const STORE_KEY = 'latest-products';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-display-app-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async function productsHandler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    const { getStore, connectLambda } = await import('@netlify/blobs');

    if (typeof connectLambda === 'function') {
      connectLambda(event);
    }

    const store = getStore(STORE_NAME);

    if (event.httpMethod === 'GET') {
      return await handleGet(store);
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      return await handleSave(event, store);
    }

    if (event.httpMethod === 'DELETE') {
      return await handleDelete(event, store);
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message || 'Unexpected server error' }, 500);
  }
};

async function handleGet(store) {
  const entry = await store.getWithMetadata(STORE_KEY);

  if (!entry || entry.data === null || entry.data === undefined) {
    return jsonResponse(
      {
        success: false,
        error: 'No uploaded product data yet. The frontend will fall back to data/products.csv.'
      },
      404
    );
  }

  const metadata = entry.metadata || {};
  const contentType = metadata.contentType || 'text/csv; charset=utf-8';

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Products-Updated-At': metadata.updatedAt || '',
      'X-Products-Item-Count': String(metadata.itemCount || '')
    },
    body: String(entry.data)
  };
}

async function handleSave(event, store) {
  const auth = authorizeWrite(event);
  if (!auth.allowed) {
    return jsonResponse({ success: false, error: auth.error }, auth.statusCode);
  }

  const incomingBody = decodeBody(event);
  if (!incomingBody.trim()) {
    return jsonResponse({ success: false, error: 'Request body is empty' }, 400);
  }

  const incomingContentType = getHeader(event.headers, 'content-type') || 'text/csv; charset=utf-8';
  const normalized = normalizeIncomingData(incomingBody, incomingContentType);
  const updatedAt = new Date().toISOString();

  await store.set(STORE_KEY, normalized.body, {
    metadata: {
      contentType: normalized.contentType,
      updatedAt,
      itemCount: normalized.itemCount,
      source: 'n8n'
    }
  });

  return jsonResponse({
    success: true,
    message: 'Product data saved',
    contentType: normalized.contentType,
    itemCount: normalized.itemCount,
    updatedAt
  });
}

async function handleDelete(event, store) {
  const auth = authorizeWrite(event);
  if (!auth.allowed) {
    return jsonResponse({ success: false, error: auth.error }, auth.statusCode);
  }

  await store.delete(STORE_KEY);
  return jsonResponse({ success: true, message: 'Product data deleted' });
}

function authorizeWrite(event) {
  const expectedToken = process.env.DISPLAY_APP_WRITE_TOKEN;
  if (!expectedToken) {
    return { allowed: true };
  }

  const suppliedToken = getHeader(event.headers, 'x-display-app-token');
  if (suppliedToken === expectedToken) {
    return { allowed: true };
  }

  return {
    allowed: false,
    statusCode: 401,
    error: 'Missing or incorrect x-display-app-token header'
  };
}

function normalizeIncomingData(body, contentType) {
  if (contentType.toLowerCase().includes('json')) {
    const parsed = JSON.parse(body);

    if (typeof parsed?.csv === 'string') {
      return {
        body: parsed.csv,
        contentType: 'text/csv; charset=utf-8',
        itemCount: countCsvRows(parsed.csv)
      };
    }

    if (typeof parsed?.body === 'string') {
      const bodyContentType = parsed.contentType || 'text/csv; charset=utf-8';
      return {
        body: parsed.body,
        contentType: bodyContentType,
        itemCount: bodyContentType.toLowerCase().includes('csv') ? countCsvRows(parsed.body) : 0
      };
    }

    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.products)
        ? parsed.products
        : Array.isArray(parsed.data)
          ? parsed.data
          : Array.isArray(parsed.rows)
            ? parsed.rows
            : Array.isArray(parsed.items)
              ? parsed.items
              : [parsed];
    return {
      body: JSON.stringify(rows),
      contentType: 'application/json; charset=utf-8',
      itemCount: Array.isArray(rows) ? rows.length : 0
    };
  }

  return {
    body,
    contentType: 'text/csv; charset=utf-8',
    itemCount: countCsvRows(body)
  };
}

function countCsvRows(csvText) {
  return String(csvText || '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '').length - 1;
}

function decodeBody(event) {
  if (event.isBase64Encoded) {
    return Buffer.from(event.body || '', 'base64').toString('utf8');
  }
  return event.body || '';
}

function getHeader(headers, name) {
  const target = name.toLowerCase();
  const key = Object.keys(headers || {}).find((candidate) => candidate.toLowerCase() === target);
  return key ? headers[key] : undefined;
}

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
