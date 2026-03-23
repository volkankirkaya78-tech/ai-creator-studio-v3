/**
 * Serves the static site and POST /api/generate (OpenAI vision + text).
 * body.mode: pack | viral_ideas | hooks | trends | competitor | hashtags
 */
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { OAuth2Client } = require("google-auth-library");

const MAX_BYTES = 50 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 }
});

const app = express();
const root = __dirname;

const DATA_DIR = path.join(__dirname, "data");
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {}

const USAGE_FILE = path.join(DATA_DIR, "usage.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    var raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function saveJson(filePath, value) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
  } catch (e) {
    // best-effort persistence
  }
}

var USAGE = loadJson(USAGE_FILE, {});
var HISTORY = loadJson(HISTORY_FILE, {});

var GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
var paidSubs = String(process.env.PAID_SUBS || "")
  .split(",")
  .map(function (s) {
    return s.trim();
  })
  .filter(Boolean);

var oauthClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;

function monthKey(d) {
  var iso = (d || new Date()).toISOString();
  return iso.slice(0, 7); // YYYY-MM
}

async function verifyGoogleIdToken(idToken) {
  if (!oauthClient || !idToken) return null;
  try {
    var ticket = await oauthClient.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_OAUTH_CLIENT_ID
    });
    var payload = ticket && ticket.getPayload ? ticket.getPayload() : null;
    if (!payload || !payload.sub) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
var SUBSCRIPTIONS = loadJson(SUBSCRIPTIONS_FILE, {});

var LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";
var LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "";
var LEMONSQUEEZY_VARIANT_ID_MONTHLY = process.env.LEMONSQUEEZY_VARIANT_ID_MONTHLY || "";
var LEMONSQUEEZY_WEBHOOK_SIGNING_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SIGNING_SECRET || "";

function isPaidSub(sub) {
  if (!sub) return false;
  if (paidSubs.indexOf(sub) >= 0) return true;
  var entry = SUBSCRIPTIONS[sub];
  return Boolean(entry && entry.isPaid);
}

function setPaidSub(sub, paid) {
  if (!sub) return;
  if (!SUBSCRIPTIONS[sub]) SUBSCRIPTIONS[sub] = { createdAt: new Date().toISOString() };
  SUBSCRIPTIONS[sub].isPaid = Boolean(paid);
  SUBSCRIPTIONS[sub].updatedAt = new Date().toISOString();
  saveJson(SUBSCRIPTIONS_FILE, SUBSCRIPTIONS);
}

app.use(
  "/api/lemonsqueezy/webhook",
  express.raw({
    type: "application/json"
  })
);

app.use(express.json({ limit: "2mb" }));

const MODES = ["pack", "viral_ideas", "hooks", "trends", "competitor", "hashtags"];
const STYLES = ["viral", "emotional", "funny", "luxury", "minimal"];
const PLATFORMS = ["instagram", "tiktok", "youtube_shorts", "linkedin", "x"];
const COMPETITOR_PLATFORMS = ["instagram", "tiktok", "youtube", "x", "linkedin"];

function platformLabel(p) {
  const m = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube_shorts: "YouTube Shorts",
    linkedin: "LinkedIn",
    x: "X (Twitter)"
  };
  return m[p] || p;
}

function competitorPlatformLabel(p) {
  const m = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    x: "X"
  };
  return m[p] || p;
}

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return res.status(503).json({
        error: "Server misconfigured",
        detail: "Set OPENAI_API_KEY in a .env file in the project root, then restart the server."
      });
    }

    const mode = String(req.body.mode || "pack").toLowerCase();
    const safeMode = MODES.includes(mode) ? mode : "pack";
    const topic = (req.body.topic || "").trim();
    const style = (req.body.style || "viral").toLowerCase();
    const safeStyle = STYLES.includes(style) ? style : "viral";
    const competitor = (req.body.competitor || "").trim();
    const platform = String(req.body.platform || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const file = req.file;

    if (file && file.size > MAX_BYTES) {
      return res.status(400).json({ error: "Image too large (max 50 MB)." });
    }

    const visionModes = ["pack", "hooks", "hashtags"];
    const useImage = file && visionModes.includes(safeMode);

    if (safeMode === "competitor") {
      if (!competitor && !topic) {
        return res.status(400).json({ error: "Enter a competitor handle, name, or URL." });
      }
    } else if (safeMode === "viral_ideas") {
      if (!PLATFORMS.includes(platform)) {
        return res.status(400).json({
          error: "Pick a valid platform.",
          detail: "One of: " + PLATFORMS.join(", ")
        });
      }
    } else if (!useImage && !topic) {
      return res.status(400).json({ error: "Send a topic and/or an image." });
    }

    const idToken = String(req.headers["x-google-id-token"] || "").trim();
    const payload = await verifyGoogleIdToken(idToken);
    const userSub = payload && payload.sub ? String(payload.sub) : null;

    const isPaid = isPaidSub(userSub);
    const freeLimit = Number(process.env.PACK_LIMIT_FREE || 10);
    const paidLimit = Number(process.env.PACK_LIMIT_PAID || 200);
    const anonLimit = Number(process.env.PACK_LIMIT_ANON || 3);

    const usageKey = userSub || "anon:" + String(req.ip || "unknown");
    const mk = monthKey(new Date());
    const usageBucket = USAGE[usageKey] || {};
    const usedCount = Number(usageBucket[mk] || 0);
    const limit = isPaid ? paidLimit : userSub ? freeLimit : anonLimit;

    if (usedCount >= limit) {
      return res.status(402).json({
        error: "Upgrade to Pro ($19/mo) to continue.",
        detail: "Monthly generation limit reached. Your plan resets every month."
      });
    }

    var shouldIncrementUsage = true;
    var usageKeyForIncrement = usageKey;
    var mkForIncrement = mk;

    const openai = new OpenAI({ apiKey: key });
    const system = buildSystemPrompt(safeMode, safeStyle);
    const messages = [{ role: "system", content: system }];

    if (useImage) {
      const mime = file.mimetype || "image/jpeg";
      const b64 = file.buffer.toString("base64");
      const dataUrl = "data:" + mime + ";base64," + b64;
      const nameHint = file.originalname || "upload";
      const topicBit = topic
        ? `Optional topic hint: "${topic}". Prefer what you see in the image.`
        : "No separate topic — the image is the main brief.";
      const userText =
        topicBit +
        ` Filename hint: "${nameHint}". Style: ${safeStyle}. Mode: ${safeMode}. Return ONLY the JSON shape described in system.`;

      messages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: dataUrl, detail: "low" } }
        ]
      });
    } else if (safeMode === "competitor") {
      const cpPlat =
        platform && COMPETITOR_PLATFORMS.includes(platform) ? platform : "";
      const platFraming = cpPlat
        ? ` Frame the analysis for how this account would typically show up on ${competitorPlatformLabel(cpPlat)} (native formats, discovery, and feed behavior on that platform).`
        : "";
      messages.push({
        role: "user",
        content: `Competitor / account / brand to analyze: "${competitor || topic}". Optional niche or goal: "${topic || "none"}".${platFraming} You do not have live API access to their metrics — infer from typical public positioning and common patterns; label assumptions clearly if needed. Return ONLY the JSON.`
      });
    } else if (safeMode === "viral_ideas") {
      const niche = topic ? `Optional niche or audience focus: "${topic}".` : "Keep ideas broadly relevant for this platform.";
      messages.push({
        role: "user",
        content: `Target platform: ${platformLabel(platform)}. ${niche} Return ONLY the JSON from the system message.`
      });
    } else {
      const platformBit =
        ["hooks", "trends", "hashtags"].indexOf(safeMode) >= 0 && platform
          ? ` Target platform: ${platformLabel(platform)}.`
          : "";
      messages.push({
        role: "user",
        content:
          `Topic / niche: "${topic}".` +
          platformBit +
          ` Style tone (where relevant): ${safeMode === "trends" ? "neutral-analytical" : safeStyle}. Mode: ${safeMode}. Return ONLY the JSON shape from the system message.`
      });
    }

    const maxTok =
      safeMode === "pack" ? 2500 : safeMode === "competitor" ? 2000 : safeMode === "viral_ideas" ? 1800 : 1200;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      response_format: { type: "json_object" },
      max_tokens: maxTok,
      temperature: 0.85
    });

    const rawText = completion.choices[0].message.content;
    if (!rawText) {
      return res.status(502).json({ error: "Empty response from model." });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return res.status(502).json({ error: "Model returned invalid JSON." });
    }

    const out = normalizeByMode(safeMode, parsed);

    // Charge usage + store history only if generation succeeded.
    if (shouldIncrementUsage) {
      usageBucket[mkForIncrement] = (usageBucket[mkForIncrement] || 0) + 1;
      USAGE[usageKeyForIncrement] = usageBucket;
      saveJson(USAGE_FILE, USAGE);

      if (userSub) {
        if (!Array.isArray(HISTORY[userSub])) HISTORY[userSub] = [];
        var item = {
          id: Date.now() + "-" + Math.random().toString(16).slice(2),
          createdAt: new Date().toISOString(),
          mode: safeMode,
          input: {
            topic: topic,
            style: safeStyle,
            competitor: competitor,
            platform: platform,
            imageName: file && file.originalname ? file.originalname : ""
          },
          output: out
        };
        HISTORY[userSub].push(item);
        // Keep file size bounded.
        if (HISTORY[userSub].length > 80) HISTORY[userSub] = HISTORY[userSub].slice(-80);
        saveJson(HISTORY_FILE, HISTORY);
      }
    }

    res.json(out);
  } catch (err) {
    console.error(err);
    const msg = err && err.message ? err.message : "Unknown error";
    res.status(500).json({ error: "Generation failed", detail: msg });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    var token = String(req.headers["x-google-id-token"] || "").trim();
    var payload = await verifyGoogleIdToken(token);
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Sign in required" });
    }
    var sub = String(payload.sub);
    var limit = Number(req.query.limit || 20);
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    var items = Array.isArray(HISTORY[sub]) ? HISTORY[sub] : [];
    var out = items.slice(-limit);
    return res.json({ items: out });
  } catch (e) {
    return res.status(500).json({ error: "History failed" });
  }
});

// Frontend: /create-checkout (no API prefix).
// Creates a Lemon Squeezy checkout URL (Pro). API key is only used server-side.
app.post("/create-checkout", async (req, res) => {
  try {
    var token = String(req.headers["x-google-id-token"] || "").trim();
    var payload = await verifyGoogleIdToken(token);
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Sign in required" });
    }

    if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_VARIANT_ID_MONTHLY) {
      return res.status(503).json({
        error: "Lemon Squeezy is not configured.",
        detail: "Set LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and LEMONSQUEEZY_VARIANT_ID_MONTHLY in .env."
      });
    }

    var userSub = String(payload.sub);
    var baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    var redirectUrl = process.env.LEMONSQUEEZY_REDIRECT_URL || baseUrl + "/?upgrade=success";

    var checkoutBody = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: {
            embed: false,
            locale: "en"
          },
          product_options: {
            redirect_url: redirectUrl
          },
          checkout_data: {
            custom: {
              user_sub: userSub
            }
          }
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: String(LEMONSQUEEZY_STORE_ID)
            }
          },
          variant: {
            data: {
              type: "variants",
              id: String(LEMONSQUEEZY_VARIANT_ID_MONTHLY)
            }
          }
        }
      }
    };

    var r = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: "Bearer " + String(LEMONSQUEEZY_API_KEY)
      },
      body: JSON.stringify(checkoutBody)
    });

    var j = {};
    try {
      j = await r.json();
    } catch (e) {}

    if (!r.ok) {
      return res.status(500).json({
        error: "Checkout creation failed",
        detail: (j && j.errors && j.errors[0] && j.errors[0].detail) || "Unknown Lemon error"
      });
    }

    var url =
      j &&
      j.data &&
      j.data.attributes &&
      (j.data.attributes.url || (j.data.attributes.preview && j.data.attributes.preview.url));

    return res.json({ url: url || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Checkout session creation failed" });
  }
});

app.post("/api/lemonsqueezy/create-checkout-session", async (req, res) => {
  try {
    var token = String(req.headers["x-google-id-token"] || "").trim();
    var payload = await verifyGoogleIdToken(token);
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Sign in required" });
    }

    if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_VARIANT_ID_MONTHLY) {
      return res.status(503).json({
        error: "Lemon Squeezy is not configured.",
        detail:
          "Set LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and LEMONSQUEEZY_VARIANT_ID_MONTHLY in .env."
      });
    }

    var userSub = String(payload.sub);

    var baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    var redirectUrl = process.env.LEMONSQUEEZY_REDIRECT_URL || baseUrl + "/?upgrade=success";

    var checkoutBody = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: {
            embed: false,
            locale: "en"
          },
          product_options: {
            redirect_url: redirectUrl
          },
          checkout_data: {
            custom: {
              user_sub: userSub
            }
          }
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: String(LEMONSQUEEZY_STORE_ID)
            }
          },
          variant: {
            data: {
              type: "variants",
              id: String(LEMONSQUEEZY_VARIANT_ID_MONTHLY)
            }
          }
        }
      }
    };

    var r = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: "Bearer " + String(LEMONSQUEEZY_API_KEY)
      },
      body: JSON.stringify(checkoutBody)
    });

    var j = {};
    try {
      j = await r.json();
    } catch (e) {}

    if (!r.ok) {
      return res.status(500).json({
        error: "Checkout creation failed",
        detail: (j && j.errors && j.errors[0] && j.errors[0].detail) || "Unknown Lemon error"
      });
    }

    var url =
      j &&
      j.data &&
      j.data.attributes &&
      (j.data.attributes.url || (j.data.attributes.preview && j.data.attributes.preview.url));

    return res.json({ url: url || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Checkout session creation failed" });
  }
});

app.post("/api/lemonsqueezy/webhook", async (req, res) => {
  try {
    if (!LEMONSQUEEZY_WEBHOOK_SIGNING_SECRET) {
      return res.status(501).json({ error: "Lemon webhook signing secret not configured" });
    }

    var sig = req.headers["x-signature"];
    if (!sig) return res.status(400).json({ error: "Missing X-Signature" });
    sig = Array.isArray(sig) ? sig[0] : sig;

    var rawBody = req.body;
    if (!(rawBody instanceof Buffer)) {
      rawBody = Buffer.from(String(rawBody || ""), "utf8");
    }

    var digest = crypto.createHmac("sha256", String(LEMONSQUEEZY_WEBHOOK_SIGNING_SECRET)).update(rawBody).digest("hex");
    var digestBuf = Buffer.from(digest, "utf8");
    var sigBuf = Buffer.from(String(sig), "utf8");

    if (digestBuf.length !== sigBuf.length || !crypto.timingSafeEqual(digestBuf, sigBuf)) {
      return res.status(400).json({ error: "Webhook signature mismatch" });
    }

    var payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch (e) {
      return res.status(400).json({ error: "Invalid webhook JSON" });
    }

    var custom = (payload && payload.meta && payload.meta.custom_data) || {};
    var userSub =
      custom.user_sub ||
      custom.userSub ||
      custom.user_id ||
      custom.userId ||
      custom.user_sub_id ||
      "";
    userSub = userSub ? String(userSub) : "";
    if (!userSub) return res.json({ received: true });

    var dataType = payload && payload.data ? payload.data.type : "";
    var attrs = payload && payload.data && payload.data.attributes ? payload.data.attributes : {};

    if (dataType === "subscriptions") {
      var status = attrs.status ? String(attrs.status) : "";
      var paid = status && status !== "expired" && status !== "unpaid";
      setPaidSub(userSub, Boolean(paid));
    }

    return res.json({ received: true });
  } catch (e) {
    console.error("Lemon webhook error:", e && e.message ? e.message : e);
    return res.status(400).json({ error: "Webhook processing failed" });
  }
});

function styleBlurb(safeStyle) {
  return `Tone style "${safeStyle}": viral=punchy/curiosity; emotional=warm/honest; funny=witty/kind; luxury=refined/calm; minimal=ultra-short.`;
}

function buildSystemPrompt(mode, safeStyle) {
  const eng = "All user-facing text in English. JSON only, no markdown.";

  if (mode === "viral_ideas") {
    return `You invent viral-ready content concepts for the platform the user names (Instagram, TikTok, YouTube Shorts, LinkedIn, or X).
Each idea must fit native behavior on that platform (e.g. Reels vs feed post vs professional article tone for LinkedIn).
${eng}
Return ONLY valid JSON:
{
  "ideas": [
    {
      "title": "short hook-style headline (the scroll-stop line)",
      "description": "1–2 sentences: what the viewer sees/hears and the core value or twist",
      "format": "e.g. talking head, POV, before/after, montage, carousel, text-on-screen, interview clip",
      "viral_score": 87
    }
  ]
}
Exactly 5 objects in "ideas". viral_score is an integer 0–100 (relative potential on that platform).`;
  }

  if (mode === "hooks") {
    return `You write scroll-stopping short-form hooks. ${styleBlurb(safeStyle)} ${eng}
If user sends an image, hooks must reflect what is visible.
Return ONLY valid JSON:
{
  "hooks": [
    {
      "text": "exactly the hook text",
      "viral_score": 87
    }
  ]
}
Return exactly 10 objects in "hooks". viral_score is an integer 0–100.`;
  }

  if (mode === "trends") {
    return `You analyze short-form (TikTok/Reels/Shorts) trends for a niche. ${eng}
Return ONLY valid JSON:
{
  "trends": [
    {
      "title": "short trend name",
      "why": "one sentence why it matters",
      "suggestion": "how the user can create content around it (1–2 sentences)",
      "format": "e.g. talking head, story, carousel, text-on-screen, montage",
      "score": 90
    }
  ]
}
Use exactly 6 items in the array. score is an integer 0–100.`;
  }

  if (mode === "competitor") {
    return `You analyze a competitor's likely social content strategy (no live data). ${eng}
Return JSON:
{
  "summary": "2-4 sentences",
  "strengths": ["3 strings"],
  "gaps": ["3 strings — opportunities they leave open"],
  "content_angles": ["4 strings — how the user could differentiate"]
}`;
  }

  if (mode === "hashtags") {
    return `You write discovery hashtags for social video and feed posts. ${eng}
If an image is provided, hashtags must match visible content. Mix niche + broader tags.
Return ONLY valid JSON:
{
  "viral": ["#tag", "#tag", "#tag", "#tag", "#tag", "#tag"],
  "niche": ["#tag", "#tag", "#tag", "#tag", "#tag", "#tag"],
  "trend": ["#tag", "#tag", "#tag", "#tag", "#tag", "#tag"]
}
Each array must contain exactly 6 strings. Every string must start with "#".`;
  }

  return `You are an expert social copywriter for TikTok, Instagram, YouTube Shorts, X, and LinkedIn.
${styleBlurb(safeStyle)}
Return ONLY valid JSON:
{
  "hooks": ["5 strings"],
  "captions": ["5 strings"],
  "optimized_caption": "string",
  "hashtags": ["10 strings with #"],
  "reel_script": "multi-line short video beats",
  "viral_score": 0,
  "viral_explanation": "string"
}
${eng}
If an image is provided, tie copy to what you see; do not invent invisible objects.
viral_score is integer 0-100.`;
}

function normalizeViralIdeaCards(raw) {
  const src = Array.isArray(raw.ideas) ? raw.ideas : [];
  const out = [];
  for (let i = 0; i < src.length && out.length < 5; i++) {
    const x = src[i];
    if (typeof x === "string" && x.trim()) {
      out.push({
        title: x.trim().slice(0, 220),
        description: "",
        format: "Short-form video",
        viral_score: Math.min(100, Math.max(0, 68 + i * 4))
      });
      continue;
    }
    if (x && typeof x === "object") {
      let score = Number(x.viral_score);
      if (!Number.isFinite(score)) score = 75;
      out.push({
        title: String(x.title || x.hook || x.headline || "Idea").trim().slice(0, 220),
        description: String(x.description || x.summary || "").trim().slice(0, 420),
        format: String(x.format || x.content_format || "Mixed").trim().slice(0, 90) || "Mixed",
        viral_score: Math.min(100, Math.max(0, Math.round(score)))
      });
    }
  }
  while (out.length < 5) {
    out.push({
      title: "Idea placeholder",
      description: "Regenerate for platform-specific concepts.",
      format: "—",
      viral_score: 50
    });
  }
  return out.slice(0, 5);
}

function padHookObjects(arr, n) {
  const a = Array.isArray(arr) ? arr : [];
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (typeof x === "string" && x.trim()) {
      out.push({
        text: x.trim().slice(0, 220),
        score: 75
      });
      continue;
    }
    if (x && typeof x === "object") {
      const text = String(x.text || x.hook || x.value || "").trim();
      if (!text) continue;
      let score = Number(x.viral_score != null ? x.viral_score : x.score);
      if (!Number.isFinite(score)) score = 75;
      score = Math.min(100, Math.max(0, Math.round(score)));
      out.push({ text: text.slice(0, 220), score: score });
    }
  }
  while (out.length < n) {
    out.push({ text: "Hook placeholder — regenerate.", score: 50 });
  }
  return out.slice(0, n);
}

function normalizeByMode(mode, raw) {
  if (mode === "viral_ideas") {
    return { mode, ideas: normalizeViralIdeaCards(raw) };
  }
  if (mode === "hooks") {
    return { mode, hooks: padHookObjects(raw.hooks, 10) };
  }
  if (mode === "trends") {
    return { mode, trends: padTrends(raw.trends) };
  }
  if (mode === "competitor") {
    return {
      mode,
      summary: String(raw.summary || raw.profile_read || "").trim() || "—",
      strengths: padStrings(raw.strengths, 3, "—"),
      gaps: padStrings(raw.gaps || raw.weaknesses, 3, "—"),
      content_angles: padStrings(raw.content_angles || raw.posting_ideas, 4, "—")
    };
  }
  if (mode === "hashtags") {
    const viral = padHashtags(raw.viral || [], 6);
    const niche = padHashtags(raw.niche || [], 6);
    const trend = padHashtags(raw.trend || [], 6);
    return { mode, viral: viral, niche: niche, trend: trend, all: viral.concat(niche, trend) };
  }
  return { mode: "pack", ...normalizePack(raw) };
}

function normalizePack(raw) {
  const hooks = padStrings(raw.hooks, 5, "Hook placeholder — regenerate if needed.");
  const captions = padStrings(raw.captions, 5, "Caption placeholder — regenerate if needed.");
  const optimized =
    typeof raw.optimized_caption === "string" && raw.optimized_caption.trim()
      ? raw.optimized_caption.trim()
      : pickBestCaption(captions);
  const hashtags = padHashtags(raw.hashtags, 10);
  const reel_script =
    typeof raw.reel_script === "string" && raw.reel_script.trim()
      ? raw.reel_script.trim()
      : "[0-3s] Hook on screen\n[3-10s] Value beat\n[10-15s] CTA";
  let viral_score = Number(raw.viral_score);
  if (!Number.isFinite(viral_score)) viral_score = 72;
  viral_score = Math.min(100, Math.max(0, Math.round(viral_score)));
  const viral_explanation =
    typeof raw.viral_explanation === "string" && raw.viral_explanation.trim()
      ? raw.viral_explanation.trim()
      : "Score reflects hook strength, clarity, and fit to the chosen style.";

  return {
    hooks,
    captions,
    optimized_caption: optimized,
    hashtags,
    reel_script,
    viral_score,
    viral_explanation
  };
}

function padTrends(arr) {
  const a = Array.isArray(arr) ? arr : [];
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (typeof t === "string" && t.trim()) {
      out.push({
        title: t.trim().slice(0, 140),
        why: "",
        suggestion: "Create a short video around the hook + one clear CTA.",
        format: "Short-form video",
        score: 80
      });
      continue;
    }
    if (t && typeof t === "object") {
      const title = String(t.title || t.name || t.trend || "").trim();
      const why = String(t.why || t.note || t.description || "").trim();
      const suggestion = String(
        t.suggestion || t.suggested_action || t.how_to_create || t.howToCreate || t.content_suggestion || ""
      ).trim();
      const format = String(t.format || t.content_format || t.video_format || "").trim() || "Short-form video";
      let score = Number(t.score != null ? t.score : t.viral_score);
      if (!Number.isFinite(score)) score = 80;
      score = Math.min(100, Math.max(0, Math.round(score)));
      if (title) out.push({ title: title.slice(0, 140), why: why || "—", suggestion: suggestion || "—", format: format, score: score });
    }
  }
  while (out.length < 6) {
    out.push({
      title: "Trend placeholder",
      why: "Regenerate for niche-specific trends.",
      suggestion: "Create a short video and test 2–3 variations of the hook.",
      format: "Short-form video",
      score: 60
    });
  }
  return out.slice(0, 6);
}

function padStrings(arr, n, filler) {
  const a = Array.isArray(arr) ? arr.map(String).map((s) => s.trim()).filter(Boolean) : [];
  while (a.length < n) a.push(filler);
  return a.slice(0, n);
}

function pickBestCaption(captions) {
  return captions[0] || "Your optimized caption will appear here.";
}

function padHashtags(arr, n) {
  const a = Array.isArray(arr) ? arr.map(String).map((s) => s.trim()).filter(Boolean) : [];
  const out = [];
  for (let i = 0; i < a.length; i++) {
    let t = a[i];
    if (!t.startsWith("#")) t = "#" + t.replace(/^#+/, "");
    out.push(t);
  }
  let k = 0;
  while (out.length < n) {
    out.push("#content" + k);
    k++;
  }
  return out.slice(0, n);
}

app.use(express.static(root));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log("AI Creator Studio at http://localhost:" + PORT);
  console.log("OpenAI: set OPENAI_API_KEY in .env for /api/generate");
});
