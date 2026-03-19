const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const FLARESOLVERR_URL = "https://mabelle-supervenient-talitha.ngrok-free.dev/v1";

const SITEMAP_URLS = [
  'https://missav.ws/sitemap_items_101.xml',
  'https://missav.ws/sitemap_items_102.xml',
  'https://missav.ws/sitemap_items_103.xml',
  'https://missav.ws/sitemap_items_104.xml',
  'https://missav.ws/sitemap_items_105.xml',
  'https://missav.ws/sitemap_items_106.xml',
  'https://missav.ws/sitemap_items_107.xml',
  'https://missav.ws/sitemap_items_108.xml',
  'https://missav.ws/sitemap_items_109.xml',
  'https://missav.ws/sitemap_items_110.xml',
  'https://missav.ws/sitemap_items_111.xml',
  'https://missav.ws/sitemap_items_112.xml',
  'https://missav.ws/sitemap_items_113.xml',
  'https://missav.ws/sitemap_items_114.xml',
  'https://missav.ws/sitemap_items_115.xml',
  'https://missav.ws/sitemap_items_116.xml',
  'https://missav.ws/sitemap_items_117.xml',
  'https://missav.ws/sitemap_items_118.xml',
  'https://missav.ws/sitemap_items_119.xml',
  'https://missav.ws/sitemap_items_120.xml',
  'https://missav.ws/sitemap_items_121.xml',
  'https://missav.ws/sitemap_items_122.xml',
  'https://missav.ws/sitemap_items_123.xml',
  'https://missav.ws/sitemap_items_124.xml',
  'https://missav.ws/sitemap_items_125.xml',
  'https://missav.ws/sitemap_items_126.xml',
  'https://missav.ws/sitemap_items_127.xml',
  'https://missav.ws/sitemap_items_128.xml',
  'https://missav.ws/sitemap_items_129.xml',
  'https://missav.ws/sitemap_items_130.xml',
  'https://missav.ws/sitemap_items_131.xml',
  'https://missav.ws/sitemap_items_132.xml',
  'https://missav.ws/sitemap_items_133.xml',
  'https://missav.ws/sitemap_items_134.xml',
  'https://missav.ws/sitemap_items_135.xml',
  'https://missav.ws/sitemap_items_136.xml',
  'https://missav.ws/sitemap_items_137.xml',
  'https://missav.ws/sitemap_items_138.xml',
  'https://missav.ws/sitemap_items_139.xml',
  'https://missav.ws/sitemap_items_140.xml',
  'https://missav.ws/sitemap_items_141.xml',
  'https://missav.ws/sitemap_items_142.xml',
  'https://missav.ws/sitemap_items_143.xml',
  'https://missav.ws/sitemap_items_144.xml',
  'https://missav.ws/sitemap_items_145.xml',
  'https://missav.ws/sitemap_items_146.xml',
  'https://missav.ws/sitemap_items_147.xml',
  'https://missav.ws/sitemap_items_148.xml',
  'https://missav.ws/sitemap_items_149.xml',
  'https://missav.ws/sitemap_items_150.xml'
];

const POSTS_DIR = path.join(__dirname, "../data/posts");
const INDEX_DIR = path.join(__dirname, "../data/index");
const META_DIR = path.join(__dirname, "../data/meta");

[POSTS_DIR, INDEX_DIR, META_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---------- FETCH ----------
async function fetchWithFlareSolverr(url) {
  const res = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout: 60000
    })
  });

  const data = await res.json();
  if (!data.solution) throw new Error("FlareSolverr failed");

  return data.solution.response;
}

async function smartFetch(url) {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {}

  console.log("⚡ FlareSolverr:", url);
  return await fetchWithFlareSolverr(url);
}

// ---------- SITEMAP ----------
async function fetchSitemap(url) {
  const xml = await smartFetch(url);
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);

  return result.urlset.url.map(u => {
    if (u["xhtml:link"]) {
      const en = u["xhtml:link"].find(x => x.$.hreflang === "en");
      return en ? en.$.href : null;
    }
    return null;
  }).filter(Boolean);
}

// ---------- HELPERS ----------
function getKey(url) {
  const match = url.match(/([a-z0-9\-]+)$/i);
  return match ? match[1].toLowerCase() : "unknown";
}

function getIndexFile(key) {
  return path.join(INDEX_DIR, key[0] + ".json");
}

// function getMetaFile(key) {
//   return path.join(META_DIR, key[0] + ".json");
// }

function slugFromUrl(url) {
  // Clean URL
  const clean = url
    .replace(/https?:\/\/[^\/]+\//, "")
    .replace(/\/$/, "");

  // Split parts
  const parts = clean.split("/");

  // ✅ Detect language (common langs)
  const langs = ["en", "cn", "zh", "ja", "ko", "ms", "th", "de", "fr", "vi", "id", "fil", "pt"];

  let lang = "xx";
  for (const p of parts) {
    if (langs.includes(p)) {
      lang = p;
      break;
    }
  }

  // ✅ Always take LAST part as ID
  const id = parts[parts.length - 1] || "unknown";

  // ✅ Clean filename
  const safeId = id.replace(/[^a-z0-9\-]/gi, "").toLowerCase();
  const slug = `${lang}-${safeId}.html`;

  // 🔥 SMART SHARDING (works for ANY id format)
  const level1 = safeId.slice(0, 2) || "00";
  const level2 = safeId.slice(2, 4) || "00";
  const level3 = safeId.slice(4, 6) || "00";

  const dir = path.join(POSTS_DIR, lang, level1, level2, level3);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(lang, level1, level2, level3, slug);
}

// ---------- MAIN DOWNLOAD ----------
async function downloadPost(url) {
  try {
    const key = getKey(url);
    const indexFile = getIndexFile(key);

    // skip if exists
    if (fs.existsSync(indexFile)) {
      const data = JSON.parse(fs.readFileSync(indexFile));
      if (data[key]) {
        console.log("⏩ Skip:", key);
        return;
      }
    }

    const html = await smartFetch(url);

    const relativePath = slugFromUrl(url);
    const filePath = path.join(POSTS_DIR, relativePath);

    fs.writeFileSync(filePath, html);

    // INDEX
    let idx = {};
    if (fs.existsSync(indexFile)) {
      try { idx = JSON.parse(fs.readFileSync(indexFile)); } catch {}
    }
    idx[key] = relativePath;
    fs.writeFileSync(indexFile, JSON.stringify(idx));

    // META
    // const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1] || key;
    // const image = (html.match(/og:image" content="(.*?)"/i) || [])[1] || null;

    // const metaFile = getMetaFile(key);
    // let meta = {};
    // if (fs.existsSync(metaFile)) {
    //   try { meta = JSON.parse(fs.readFileSync(metaFile)); } catch {}
    // }

    // meta[key] = { title, image, path: relativePath };
    // fs.writeFileSync(metaFile, JSON.stringify(meta));

    console.log("✅ Saved:", key);

  } catch (err) {
    console.error("❌ Error:", url, err.message);
  }
}

// ---------- RUN ----------
(async () => {
  for (const sitemap of SITEMAP_URLS) {
    console.log("📄", sitemap);
    const urls = await fetchSitemap(sitemap);

    const BATCH = 3;
    for (let i = 0; i < urls.length; i += BATCH) {
      await Promise.all(urls.slice(i, i + BATCH).map(downloadPost));
    }
  }
})();
