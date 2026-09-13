export const maxDuration = 300;

export default function handler(req: any, res: any) {
  const url = req.url || "";

  // 1. Fast response for favicons and bots
  if (url.includes("favicon") || url.includes("robots.txt")) {
    if (res && typeof res.end === "function") {
      res.statusCode = 204;
      res.end();
      return;
    }
    return new Response(null, { status: 204 });
  }

  const payload = {
    status: "online",
    name: "Vertofi Platform API",
    message: "API Gateway is active. For the frontend web application, access the main platform dashboard at https://vertofi-platform.vercel.app or set Vercel Root Directory to apps/web-landing or repository root.",
    timestamp: new Date().toISOString()
  };

  // 2. Node.js Serverless Function (req, res): MUST use res and return void
  if (res && typeof res.end === "function") {
    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
    }
    if (typeof res.status === "function" && typeof res.json === "function") {
      res.status(200).json(payload);
      return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
    return;
  }

  // 3. Web Standard Request/Response (Edge runtime without res parameter)
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

export function GET(req: any, res: any) {
  return handler(req, res);
}

export function POST(req: any, res: any) {
  return handler(req, res);
}

export function OPTIONS(req: any, res: any) {
  if (res && typeof res.end === "function") {
    if (typeof res.setHeader === "function") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
    }
    res.statusCode = 204;
    res.end();
    return;
  }
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
