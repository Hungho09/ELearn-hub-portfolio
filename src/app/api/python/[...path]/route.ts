import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = 'http://127.0.0.1:8001';

/**
 * Proxy API route that forwards requests to the Python FastAPI backend.
 * This avoids the need for the Caddy gateway to directly access port 8001.
 * Frontend calls: /api/python/api/auth/login
 * This proxies to: http://127.0.0.1:8001/api/auth/login
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const targetPath = '/' + pathSegments.join('/');
  const url = new URL(request.url);
  const queryString = url.searchParams.toString();
  const targetUrl = `${PYTHON_API_URL}${targetPath}${queryString ? '?' + queryString : ''}`;

  try {
    // Forward the request headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Skip host and connection headers
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
        headers[key] = value;
      }
    });

    // Get the request body if present
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        // For multipart/form-data, forward as-is
        const formData = await request.formData();
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: {
            ...headers,
          },
          body: formData as unknown as BodyInit,
        });
        return createProxyResponse(response);
      } else {
        body = await request.text();
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    return createProxyResponse(response);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend service' },
      { status: 502 }
    );
  }
}

function createProxyResponse(response: Response): NextResponse {
  // Forward response headers
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
