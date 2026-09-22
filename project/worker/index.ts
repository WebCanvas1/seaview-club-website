interface Env {
  DB?: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
}

const json = (data: unknown, status = 200, headers: Record<string,string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

const cookieValue = (request: Request, name: string) => {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="))?.slice(name.length + 1) || "";
};

async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function isAdmin(request: Request, env: Env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return false;
  return cookieValue(request, "seaview_admin") === await digest(env.ADMIN_PASSWORD + ":" + env.SESSION_SECRET);
}

async function readBody(request: Request) {
  try { return await request.json() as Record<string, any>; } catch { return {}; }
}

async function publicData(env: Env) {
  if (!env.DB) return { configured: false };
  const [availability, events, settings] = await Promise.all([
    env.DB.prepare("SELECT date,status,label FROM availability ORDER BY date").all(),
    env.DB.prepare("SELECT id,date,title,time,description,image_url FROM events ORDER BY date").all(),
    env.DB.prepare("SELECT key,value FROM settings").all(),
  ]);
  return {
    configured: true,
    availability: availability.results,
    events: events.results,
    settings: Object.fromEntries((settings.results as any[]).map(r => [r.key, r.value])),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (url.pathname === "/api/public" && request.method === "GET") return json(await publicData(env));

    if (url.pathname === "/api/admin/status" && request.method === "GET")
      return json({ configured: !!(env.DB && env.ADMIN_PASSWORD && env.SESSION_SECRET), authenticated: await isAdmin(request, env) });

    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: "Admin is not configured yet." }, 503);
      const body = await readBody(request);
      if (body.password !== env.ADMIN_PASSWORD) return json({ error: "Incorrect password." }, 401);
      const token = await digest(env.ADMIN_PASSWORD + ":" + env.SESSION_SECRET);
      return json({ ok: true }, 200, { "set-cookie": `seaview_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` });
    }

    if (url.pathname === "/api/admin/logout" && request.method === "POST")
      return json({ ok: true }, 200, { "set-cookie": "seaview_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });

    if (!(await isAdmin(request, env))) return json({ error: "Unauthorized" }, 401);
    if (!env.DB) return json({ error: "Database binding is not configured." }, 503);

    if (url.pathname === "/api/admin/data" && request.method === "GET") {
      const data = await publicData(env);
      const enquiries = await env.DB.prepare("SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 200").all();
      return json({ ...data, enquiries: enquiries.results });
    }

    if (url.pathname === "/api/admin/availability" && request.method === "POST") {
      const b = await readBody(request);
      if (!b.date || !["available","booked","club_event"].includes(b.status)) return json({ error: "Invalid date or status." }, 400);
      if (b.status === "available") await env.DB.prepare("DELETE FROM availability WHERE date=?").bind(b.date).run();
      else await env.DB.prepare("INSERT INTO availability(date,status,label) VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET status=excluded.status,label=excluded.label").bind(b.date,b.status,b.label || null).run();
      return json({ ok: true });
    }

    if (url.pathname === "/api/admin/events" && request.method === "POST") {
      const b = await readBody(request);
      if (!b.date || !b.title) return json({ error: "Date and title are required." }, 400);
      const id = b.id || crypto.randomUUID();
      await env.DB.prepare("INSERT INTO events(id,date,title,time,description,image_url) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET date=excluded.date,title=excluded.title,time=excluded.time,description=excluded.description,image_url=excluded.image_url").bind(id,b.date,b.title,b.time||null,b.description||null,b.image_url||null).run();
      return json({ ok: true, id });
    }

    if (url.pathname.startsWith("/api/admin/events/") && request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM events WHERE id=?").bind(decodeURIComponent(url.pathname.split("/").pop()!)).run();
      return json({ ok: true });
    }

    if (url.pathname === "/api/admin/settings" && request.method === "POST") {
      const b = await readBody(request);
      const entries = Object.entries(b.settings || {});
      const stmt = env.DB.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
      if (entries.length) await env.DB.batch(entries.map(([k,v]) => stmt.bind(k, String(v ?? ""))));
      return json({ ok: true });
    }

    if (url.pathname === "/api/enquiries" && request.method === "POST") {
      const b = await readBody(request);
      await env.DB.prepare("INSERT INTO enquiries(id,full_name,email,phone,preferred_date,alternative_date,function_type,guests,message,created_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now'))")
        .bind(crypto.randomUUID(),b.full_name||"",b.email||"",b.phone||"",b.preferred_date||null,b.alternative_date||null,b.function_type||null,b.guests||null,b.message||null).run();
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  }
} satisfies ExportedHandler<Env>;
