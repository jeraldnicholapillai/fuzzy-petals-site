// Shared helpers: storage access, admin check, data cleaning.
const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");
const crypto = require("crypto");

const CATEGORIES = ["everyday", "love", "celebrations", "gifts"];
const PARTITION = "p";

function connectionString() {
  const c = process.env.STORAGE_CONNECTION_STRING;
  if (!c) throw new Error("STORAGE_CONNECTION_STRING is not set. Add it under Environment variables on the Static Web App.");
  return c;
}

const readyTables = {};
async function table(name) {
  const t = TableClient.fromConnectionString(connectionString(), name, { allowInsecureConnection: true });
  if (!readyTables[name]) {
    try { await t.createTable(); } catch (e) { if (e.statusCode !== 409) throw e; }
    readyTables[name] = true;
  }
  return t;
}

let containerReady = false;
async function images() {
  const c = BlobServiceClient.fromConnectionString(connectionString()).getContainerClient("images");
  if (!containerReady) { await c.createIfNotExists(); containerReady = true; }
  return c;
}

// Azure Static Web Apps passes the signed-in user in this header.
function principal(req) {
  const h = req.headers.get("x-ms-client-principal");
  if (!h) return null;
  try { return JSON.parse(Buffer.from(h, "base64").toString("utf8")); } catch { return null; }
}
function isAdmin(req) {
  const p = principal(req);
  return !!p && Array.isArray(p.userRoles) && p.userRoles.includes("admin");
}

function cleanProduct(b = {}) {
  return {
    name: String(b.name || "").trim().slice(0, 80),
    occ: CATEGORIES.includes(b.occ) ? b.occ : "everyday",
    price: Math.max(0, Math.round((Number(b.price) || 0) * 100) / 100),
    description: String(b.description || "").trim().slice(0, 300),
    img: String(b.img || "").trim().slice(0, 300),
    visible: b.visible !== false,
    order: Number.isFinite(Number(b.order)) ? Number(b.order) : 0
  };
}

function toProduct(e) {
  return {
    id: e.rowKey, name: e.name, occ: e.occ, price: e.price,
    description: e.description || "", img: e.img || "",
    visible: e.visible !== false, order: e.order || 0
  };
}

async function listProducts() {
  const t = await table("products");
  const out = [];
  for await (const e of t.listEntities({ queryOptions: { filter: `PartitionKey eq '${PARTITION}'` } })) out.push(toProduct(e));
  return out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

async function saveProduct(id, data) {
  const t = await table("products");
  const rowKey = id || crypto.randomUUID();
  await t.upsertEntity({ partitionKey: PARTITION, rowKey, ...data }, "Replace");
  return { id: rowKey, ...data };
}

async function getProduct(id) {
  const t = await table("products");
  try { return toProduct(await t.getEntity(PARTITION, id)); } catch (e) { if (e.statusCode === 404) return null; throw e; }
}

async function deleteProduct(id) {
  const t = await table("products");
  try { await t.deleteEntity(PARTITION, id); } catch (e) { if (e.statusCode !== 404) throw e; }
}

const SETTINGS_FIELDS = ["brand", "city", "whatsapp", "instagram", "email"];
function cleanSettings(b = {}) {
  const s = {};
  for (const f of SETTINGS_FIELDS) s[f] = String(b[f] || "").trim().slice(0, 120);
  s.whatsapp = s.whatsapp.replace(/[^0-9]/g, "");
  s.instagram = s.instagram.replace(/^@/, "");
  return s;
}
async function getSettings() {
  const t = await table("settings");
  try {
    const e = await t.getEntity("s", "main");
    const s = {};
    for (const f of SETTINGS_FIELDS) if (e[f]) s[f] = e[f];
    return s;
  } catch (e) { if (e.statusCode === 404) return {}; throw e; }
}
async function saveSettings(s) {
  const t = await table("settings");
  await t.upsertEntity({ partitionKey: "s", rowKey: "main", ...s }, "Replace");
  return s;
}

// Wraps a handler so failures return a readable JSON error.
function safe(handler) {
  return async (req, ctx) => {
    try { return await handler(req, ctx); }
    catch (e) { ctx.error(e); return { status: 500, jsonBody: { error: e.message || "Something went wrong" } }; }
  };
}
const forbidden = () => ({ status: 403, jsonBody: { error: "You need admin access to do this." } });

module.exports = {
  CATEGORIES, images, isAdmin, cleanProduct, listProducts, saveProduct, getProduct, deleteProduct,
  cleanSettings, getSettings, saveSettings, safe, forbidden
};
