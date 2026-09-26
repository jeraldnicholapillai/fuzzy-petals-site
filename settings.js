const { app } = require("@azure/functions");
const s = require("../lib/store");

// Public: business details (brand, WhatsApp, Instagram…)
app.http("publicSettings", {
  methods: ["GET"], authLevel: "anonymous", route: "settings",
  handler: s.safe(async () => ({ jsonBody: await s.getSettings(), headers: { "Cache-Control": "no-cache" } }))
});

// Admin: update business details
app.http("adminSettings", {
  methods: ["GET", "PUT"], authLevel: "anonymous", route: "admin/settings",
  handler: s.safe(async (req) => {
    if (!s.isAdmin(req)) return s.forbidden();
    if (req.method === "GET") return { jsonBody: await s.getSettings() };
    const body = await req.json().catch(() => ({}));
    return { jsonBody: await s.saveSettings(s.cleanSettings(body)) };
  })
});
