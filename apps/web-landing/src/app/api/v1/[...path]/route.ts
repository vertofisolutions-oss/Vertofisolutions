import { NextRequest, NextResponse } from "next/server";

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = req.nextUrl.search;
  const targetUrl = `https://api.vertofi.com/api/v1/${targetPath}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key !== "host" && key !== "connection") {
      headers.set(key, value);
    }
  });
  headers.set("host", "api.vertofi.com");

  try {
    let body: string | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.text();
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });

    const responseText = await res.text();
    const responseHeaders = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new NextResponse(responseText, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { code: "proxy_error", message: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
