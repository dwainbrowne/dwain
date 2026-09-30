// Cloudflare Pages Function: POST /api/contact
//
// Pages Functions can't hold the send_email binding, so this forwards the
// request to the dwain-me-contact Worker (worker/contact) over a service
// binding named CONTACT_WORKER (see wrangler.jsonc at the site root). If the
// binding isn't set up, it says so with a 503. It never fakes a success.

interface Env {
  CONTACT_WORKER?: { fetch(request: Request): Promise<Response> };
}

type PagesContext = { request: Request; env: Env };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, message: "Use POST." });
  if (!env.CONTACT_WORKER) {
    console.warn("contact_not_configured", "CONTACT_WORKER service binding");
    return json(503, {
      ok: false,
      message: "The contact form isn't switched on yet, so your message wasn't sent. You can also email dwain@snapsuite.io directly.",
    });
  }
  const url = new URL(request.url);
  const forward = new Request(`https://dwain-me-contact.internal${url.pathname}`, request);
  try {
    return await env.CONTACT_WORKER.fetch(forward);
  } catch (err) {
    console.warn("contact_worker_unreachable", String(err));
    return json(502, {
      ok: false,
      message: "Your message didn't go through on my end. You can also email dwain@snapsuite.io directly.",
    });
  }
}
