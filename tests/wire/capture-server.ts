import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  /** Exactly the bytes that arrived on the socket — never a re-serialization. */
  rawBody: Buffer;
  get text(): string;
}

export interface CaptureServer {
  /** Base URL including /api/v1, shaped like BACKEND_API_URL. */
  backendApiUrl: string;
  requests: CapturedRequest[];
  /** Queue one response per upstream call, in order. */
  reply(status: number, body: unknown, headers?: Record<string, string>): void;
  close(): Promise<void>;
}

/**
 * A real HTTP origin server.
 *
 * Mocking `fetch` proves what a route *meant* to send. Only a socket proves
 * what it actually sent: whether a body was serialized at all, whether the
 * transport silently dropped it, and what Content-Type/Content-Length landed
 * on the wire. Every body-preservation claim in this repo is asserted here.
 */
export async function startCaptureServer(): Promise<CaptureServer> {
  const requests: CapturedRequest[] = [];
  const queued: Array<{ status: number; body: unknown; headers: Record<string, string> }> = [];

  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks);
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        headers: req.headers,
        rawBody,
        get text() {
          return rawBody.toString("utf8");
        },
      });

      const next = queued.shift() ?? { status: 200, body: { success: true }, headers: {} };
      const payload = Buffer.from(JSON.stringify(next.body), "utf8");
      res.writeHead(next.status, {
        "Content-Type": "application/json",
        "Content-Length": String(payload.byteLength),
        ...next.headers,
      });
      res.end(payload);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    backendApiUrl: `http://127.0.0.1:${port}/api/v1`,
    requests,
    reply(status, body, headers = {}) {
      queued.push({ status, body, headers });
    },
    close() {
      return new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
