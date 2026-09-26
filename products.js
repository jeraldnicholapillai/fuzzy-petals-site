const { app } = require("@azure/functions");
const s = require("../lib/store");

// Public: products shown on the website
app.http("publicProducts", {
  methods: ["GET"], authLevel: "anonymous", route: "products",
  handler: s.safe(async () => {
    const list = (await s.listProducts()).filter(p => p.visible);
    return { jsonBody: list, headers: { "Cache-Control": "no-cache" } };
  })
});

// Admin: list / create / update / delete products
app.http("adminProducts", {
  methods: ["GET", "POST", "PUT", "DELETE"], authLevel: "anonymous", route: "admin/products/{id?}",
  handler: s.safe(async (req) => {
    if (!s.isAdmin(req)) return s.forbidden();
    const id = req.params.id;

    if (req.method === "GET") return { jsonBody: await s.listProducts() };

    if (req.method === "DELETE") {
      if (!id) return { status: 400, jsonBody: { error: "Missing product id" } };
      const existing = await s.getProduct(id);
      await s.deleteProduct(id);
      // Remove the uploaded photo too, if it was one of ours
      const m = existing && existing.img && existing.img.match(/^\/api\/images\/([\w.-]+)$/);
      if (m) { try { await (await s.images()).deleteBlob(m[1]); } catch { /* already gone */ } }
      return { status: 204 };
    }

    const body = await req.json().catch(() => ({}));
    const data = s.cleanProduct(body);
    if (!data.name) return { status: 400, jsonBody: { error: "Please give the product a name." } };

    if (req.method === "POST") {
      if (body.order === undefined) {
        const all = await s.listProducts();
        data.order = all.length ? Math.max(...all.map(p => p.order)) + 1 : 0;
      }
      return { status: 201, jsonBody: await s.saveProduct(null, data) };
    }

    // PUT
    if (!id) return { status: 400, jsonBody: { error: "Missing product id" } };
    const existing = await s.getProduct(id);
    if (!existing) return { status: 404, jsonBody: { error: "Product not found" } };
    return { jsonBody: await s.saveProduct(id, data) };
  })
});
