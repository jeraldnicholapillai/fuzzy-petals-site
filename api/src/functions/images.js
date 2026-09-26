const { app } = require("@azure/functions");
const crypto = require("crypto");
const s = require("../lib/store");

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

// Admin: upload a product photo (raw image bytes in the request body)
app.http("adminUpload", {
  methods: ["POST"], authLevel: "anonymous", route: "manage/upload",
  handler: s.safe(async (req) => {
    if (!s.isAdmin(req)) return s.forbidden();
    const type = (req.headers.get("content-type") || "").split(";")[0].trim();
    if (!TYPES[type]) return { status: 400, jsonBody: { error: "Please upload a JPG, PNG or WebP photo." } };
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) return { status: 400, jsonBody: { error: "The photo was empty." } };
    if (buf.length > MAX_BYTES) return { status: 413, jsonBody: { error: "That photo is too large (max 5 MB)." } };

    const name = `${crypto.randomUUID()}.${TYPES[type]}`;
    const container = await s.images();
    await container.getBlockBlobClient(name).uploadData(buf, { blobHTTPHeaders: { blobContentType: type } });
    return { status: 201, jsonBody: { url: `/api/images/${name}` } };
  })
});

// Public: serve a product photo (storage stays private)
app.http("publicImage", {
  methods: ["GET"], authLevel: "anonymous", route: "images/{name}",
  handler: s.safe(async (req) => {
    const name = req.params.name || "";
    if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return { status: 404 };
    const blob = (await s.images()).getBlobClient(name);
    try {
      const [body, props] = await Promise.all([blob.downloadToBuffer(), blob.getProperties()]);
      return {
        body,
        headers: { "Content-Type": props.contentType || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" }
      };
    } catch (e) {
      if (e.statusCode === 404) return { status: 404 };
      throw e;
    }
  })
});
