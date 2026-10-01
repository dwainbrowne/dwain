// Cloudflare Pages Function: POST /api/contact
//
// Pages Functions can't hold the send_email binding, so this forwards the
// request to the dwain-me-contact Worker (worker/contact) over a service
// binding named CONTACT_WORKER (set on the Pages project). If the binding
// isn't set up, it says so with a 503. It never fakes a success.
//
// A service-bound Worker doesn't see the visitor's request.cf, so this passes
// the visitor's location along as x-dm-* headers, after removing any x-dm-*
// headers the visitor tried to send.

interface Env {
  CONTACT_WORKER?: { fetch(request: Request): Promise<Response> };
}

type PagesContext = { request: Request; env: Env };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const FALLBACK = "You can also book a call at dwain.me/meet."; // no email addresses on the site (Dwain 30-Sep)

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, message: "Use POST." });
  if (!env.CONTACT_WORKER) {
    console.warn("contact_not_configured", "CONTACT_WORKER service binding");
    return json(503, { ok: false, message: `The contact form isn't switched on yet, so your message wasn't sent. ${FALLBACK}` });
  }
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  for (const k of [...headers.keys()]) if (k.toLowerCase().startsWith("x-dm-")) headers.delete(k);
  const cf = ((request as unknown as { cf?: Record<string, unknown> }).cf ?? {}) as Record<string, unknown>;
  const put = (k: string, v: unknown) => {
    if (typeof v === "string" && v) headers.set(k, encodeURIComponent(v.slice(0, 80))); // keeps accents (Montréal)
  };
  put("x-dm-country", cf.country);
  put("x-dm-region", cf.region);
  put("x-dm-city", cf.city);
  put("x-dm-timezone", cf.timezone);
  put("x-dm-network", cf.asOrganization);
  const forward = new Request(`https://dwain-me-contact.internal${url.pathname}`, {
    method: "POST",
    headers,
    body: await request.text(),
  });
  try {
    return await env.CONTACT_WORKER.fetch(forward);
  } catch (err) {
    console.warn("contact_worker_unreachable", String(err));
    return json(502, { ok: false, message: `Your message didn't go through on my end. ${FALLBACK}` });
  }
}
