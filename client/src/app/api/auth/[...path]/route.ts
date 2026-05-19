import { NextRequest, NextResponse } from "next/server";

const GATEWAY_API_URL =
  process.env.API_GATEWAY_URL ?? "http://localhost:8081/api";

type GatewayErrorBody = {
  message?: string;
  error?: string;
  details?: unknown;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const gatewayPath = path.join("/");
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${GATEWAY_API_URL}/auth/${gatewayPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": request.headers.get("user-agent") ?? "",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auth gateway request failed.";
    const body: GatewayErrorBody = {
      message: "Auth gateway request failed.",
      details: { message },
    };

    return NextResponse.json(body, { status: 502 });
  }
}
