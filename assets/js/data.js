/* Zed Photos — catalogue data, business rules and illustrative artwork.
 *
 * The demo ships with no real photographs. Every catalogue image is an
 * illustration generated as SVG from a seed, so the marketplace can be
 * explored offline. Photographs uploaded through the dashboard are shown as-is.
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Business rules
  // ---------------------------------------------------------------------------
  const COMMISSION = { photographer: 0.70, platform: 0.30 };

  const LICENCES = {
    personal: {
      id: "personal",
      name: "Personal & social media",
      short: "Personal",
      summary: "Personal projects, social media posts, school work and non-commercial blogs.",
      default: 20, min: 10, max: 25,
      rights: ["Personal and social media use", "Unlimited personal posts", "No resale or advertising"],
    },
    business: {
      id: "business",
      name: "Business & website",
      short: "Business",
      summary: "Company websites, newsletters, presentations, brochures and organic business social media.",
      default: 50, min: 30, max: 75,
      rights: ["Commercial website & social use", "Print runs up to 5,000 copies", "No paid advertising campaigns"],
    },
    premium: {
      id: "premium",
      name: "Premium commercial",
      short: "Premium",
      summary: "Paid advertising, billboards, TV, national campaigns, packaging and unlimited print runs.",
      default: 200, min: 100, max: 1000,
      rights: ["Paid advertising & billboards", "Unlimited print runs", "Requires model release where people are identifiable"],
    },
  };

  const PLANS = {
    starter: {
      id: "starter", name: "Starter", price: 50, limit: 100, tagline: "For emerging photographers",
      features: ["Up to 100 active photos", "Sales dashboard", "Mobile money payouts", "Standard support"],
    },
    professional: {
      id: "professional", name: "Professional", price: 150, limit: 1000, tagline: "For regular working photographers",
      features: ["Up to 1,000 active photos", "Portfolio analytics", "Featured listing eligibility", "Priority support"],
    },
    studio: {
      id: "studio", name: "Studio", price: 350, limit: 5000, tagline: "For professional studios and agencies",
      features: ["Up to 5,000 active photos", "Multiple contributors", "Advanced sales reporting", "Business customer introductions"],
    },
  };

  const CATEGORIES = [
    { id: "wildlife", name: "Wildlife", blurb: "Luangwa, Kafue, Liuwa" },
    { id: "landscapes", name: "Landscapes", blurb: "Rivers, plains, falls" },
    { id: "tourism", name: "Tourism & Travel", blurb: "Lodges, landmarks, adventure" },
    { id: "culture", name: "Culture & Ceremonies", blurb: "Kuomboka, Ncwala, Likumbi" },
    { id: "weddings", name: "Weddings", blurb: "Ceremonies & celebrations" },
    { id: "graduations", name: "Graduations", blurb: "UNZA, CBU, schools" },
    { id: "business", name: "Business & Events", blurb: "Conferences, offices, launches" },
    { id: "everyday", name: "Everyday Life", blurb: "Markets, streets, people" },
  ];

  const PROVINCES = {
    "Lusaka": "Lusaka", "Livingstone": "Southern", "Siavonga": "Southern", "Mfuwe": "Eastern", "Chipata": "Eastern",
    "Kafue National Park": "Central", "Lower Zambezi": "Lusaka", "Mongu": "Western", "Liuwa Plain": "Western",
    "Kitwe": "Copperbelt", "Ndola": "Copperbelt", "Mpulungu": "Northern", "Mbala": "Northern", "Kasama": "Northern",
    "Kasanka": "Central", "Solwezi": "North-Western", "Zambezi": "North-Western", "Samfya": "Luapula",
  };

  const PAY_NETWORKS = {
    mtn: { id: "mtn", name: "MTN MoMo", prefixes: ["096", "076"], color: "#ffcc00", ink: "#14110f", tag: "MoMo" },
    airtel: { id: "airtel", name: "Airtel Money", prefixes: ["097", "077"], color: "#e40000", ink: "#fff", tag: "airtel" },
    zamtel: { id: "zamtel", name: "Zamtel Kwacha", prefixes: ["095", "075"], color: "#1aa34a", ink: "#fff", tag: "ZAM" },
    card: { id: "card", name: "Visa / Mastercard", prefixes: [], color: "#1a1f71", ink: "#fff", tag: "CARD" },
  };

  // ---------------------------------------------------------------------------
  // Photographers (fictional demo accounts)
  // ---------------------------------------------------------------------------
  const PHOTOGRAPHERS = [
    { id: "p1", name: "Mutale Chanda", town: "Lusaka", plan: "professional", color: "#b8682b", verified: true, joined: "2025-02",
      bio: "Wedding and events photographer covering Lusaka and the Copperbelt. Ten years behind the lens, still chasing golden hour." },
    { id: "p2", name: "Mosi Light Studio", town: "Livingstone", plan: "studio", color: "#1e8c45", verified: true, joined: "2024-11",
      bio: "A Livingstone studio of four photographers documenting Victoria Falls, the Zambezi and the tourism businesses around them." },
    { id: "p3", name: "Chipo Banda", town: "Ndola", plan: "starter", color: "#d7262e", verified: true, joined: "2026-01",
      bio: "Street and everyday-life photographer from Ndola. Markets, minibuses and the people who keep the Copperbelt moving." },
    { id: "p4", name: "Mwila Tembo", town: "Mfuwe", plan: "professional", color: "#6b4a2b", verified: true, joined: "2025-06",
      bio: "Safari guide turned wildlife photographer, based on the edge of South Luangwa National Park." },
    { id: "p5", name: "Kondwani Zulu", town: "Chipata", plan: "starter", color: "#f28c28", verified: false, joined: "2026-05",
      bio: "Documenting traditional ceremonies and cultural life in Eastern Province." },
    { id: "p6", name: "Lubasi Mubita", town: "Mongu", plan: "professional", color: "#2a5d8f", verified: true, joined: "2025-04",
      bio: "Western Province storyteller: the Barotse floodplain, Kuomboka and the Liuwa Plain migration." },
  ];

  // ---------------------------------------------------------------------------
  // Catalogue
  // scene: art recipe for the illustration. people: identifiable people in shot.
  // ---------------------------------------------------------------------------
  const P = (personal, business, premium) => ({ personal, business, premium });
  const STD = P(20, 50, 200);

  const PHOTOS = [
    { id: "zp-1001", title: "Sunset over the Zambezi", category: "landscapes", location: "Livingstone", by: "p2", scene: "river", time: "dusk", tags: ["zambezi", "river", "sunset", "boat", "canoe"], people: false, prices: STD, views: 1840, downloads: 96, featured: true, date: "2026-03-14" },
    { id: "zp-1002", title: "Mosi-oa-Tunya: The Smoke that Thunders", category: "tourism", location: "Livingstone", by: "p2", scene: "falls", time: "day", tags: ["victoria falls", "waterfall", "rainbow", "mist", "landmark"], people: false, prices: P(25, 75, 300), views: 3120, downloads: 188, featured: true, date: "2026-02-02" },
    { id: "zp-1003", title: "Elephant herd crossing the Luangwa", category: "wildlife", location: "Mfuwe", by: "p4", scene: "savanna", animal: "elephant", time: "golden", tags: ["elephant", "luangwa", "safari", "herd"], people: false, prices: P(20, 60, 250), views: 2210, downloads: 121, featured: true, date: "2026-04-21" },
    { id: "zp-1004", title: "Thornicroft giraffe at dawn", category: "wildlife", location: "Mfuwe", by: "p4", scene: "savanna", animal: "giraffe", time: "dawn", tags: ["giraffe", "thornicroft", "south luangwa", "endemic"], people: false, prices: STD, views: 1460, downloads: 74, featured: false, date: "2026-05-09" },
    { id: "zp-1005", title: "Kuomboka royal barge on the floodplain", category: "culture", location: "Mongu", by: "p6", scene: "ceremony", variant: "barge", time: "day", tags: ["kuomboka", "lozi", "nalikwanda", "barotse", "ceremony"], people: true, release: true, prices: P(25, 75, 300), views: 2680, downloads: 143, featured: true, date: "2026-04-05" },
    { id: "zp-1006", title: "Ncwala dancers, Mutenguleni", category: "culture", location: "Chipata", by: "p5", scene: "ceremony", variant: "dance", time: "day", tags: ["ncwala", "ngoni", "dance", "ceremony", "tradition"], people: true, release: false, prices: STD, views: 980, downloads: 41, featured: false, date: "2026-02-28" },
    { id: "zp-1007", title: "Graduation day at UNZA", category: "graduations", location: "Lusaka", by: "p1", scene: "crowd", variant: "graduation", time: "day", tags: ["unza", "graduation", "university", "students", "celebration"], people: true, release: true, prices: STD, views: 1320, downloads: 88, featured: true, date: "2026-06-12" },
    { id: "zp-1008", title: "Garden wedding in Lusaka", category: "weddings", location: "Lusaka", by: "p1", scene: "crowd", variant: "wedding", time: "golden", tags: ["wedding", "bride", "groom", "garden", "chitenge"], people: true, release: true, prices: P(25, 70, 250), views: 1675, downloads: 102, featured: true, date: "2026-05-30" },
    { id: "zp-1009", title: "Cairo Road at dusk", category: "everyday", location: "Lusaka", by: "p3", scene: "city", time: "dusk", tags: ["cairo road", "city", "skyline", "traffic", "capital"], people: false, prices: STD, views: 1510, downloads: 97, featured: false, date: "2026-03-03" },
    { id: "zp-1010", title: "Morning at Soweto Market", category: "everyday", location: "Lusaka", by: "p3", scene: "market", time: "day", tags: ["market", "soweto", "vendors", "vegetables", "trade"], people: true, release: false, prices: STD, views: 1190, downloads: 66, featured: false, date: "2026-01-19" },
    { id: "zp-1011", title: "Kapenta fishermen, Lake Kariba", category: "everyday", location: "Siavonga", by: "p2", scene: "lake", time: "dawn", tags: ["kariba", "kapenta", "fishing", "boat", "lake"], people: false, prices: STD, views: 870, downloads: 39, featured: false, date: "2026-02-11" },
    { id: "zp-1012", title: "Copper mine headframe, Kitwe", category: "business", location: "Kitwe", by: "p3", scene: "mine", time: "dusk", tags: ["mining", "copper", "copperbelt", "industry", "headframe"], people: false, prices: P(20, 60, 250), views: 1405, downloads: 92, featured: true, date: "2026-04-17" },
    { id: "zp-1013", title: "Leadership summit keynote", category: "business", location: "Lusaka", by: "p1", scene: "crowd", variant: "conference", time: "indoor", tags: ["conference", "summit", "keynote", "corporate", "event"], people: true, release: true, prices: P(20, 60, 250), views: 990, downloads: 71, featured: false, date: "2026-07-08" },
    { id: "zp-1014", title: "Wildebeest on the Liuwa Plain", category: "wildlife", location: "Liuwa Plain", by: "p6", scene: "savanna", animal: "wildebeest", time: "golden", tags: ["wildebeest", "migration", "liuwa", "plains"], people: false, prices: STD, views: 1120, downloads: 58, featured: false, date: "2026-05-11" },
    { id: "zp-1015", title: "Canoe safari, Lower Zambezi", category: "tourism", location: "Lower Zambezi", by: "p2", scene: "river", time: "golden", tags: ["canoe", "safari", "lower zambezi", "adventure", "river"], people: false, prices: STD, views: 1290, downloads: 64, featured: false, date: "2026-06-22" },
    { id: "zp-1016", title: "Kalambo Falls from the gorge", category: "landscapes", location: "Mbala", by: "p6", scene: "falls", time: "golden", tags: ["kalambo falls", "waterfall", "gorge", "northern"], people: false, prices: STD, views: 760, downloads: 33, featured: false, date: "2026-03-26" },
    { id: "zp-1017", title: "Lake Tanganyika harbour", category: "tourism", location: "Mpulungu", by: "p6", scene: "lake", time: "day", tags: ["tanganyika", "harbour", "lake", "boats", "mpulungu"], people: false, prices: STD, views: 640, downloads: 27, featured: false, date: "2026-01-30" },
    { id: "zp-1018", title: "Kasanka bat migration at dusk", category: "wildlife", location: "Kasanka", by: "p4", scene: "savanna", animal: "bats", time: "dusk", tags: ["bats", "kasanka", "migration", "dusk", "fruit bats"], people: false, prices: P(25, 70, 280), views: 1730, downloads: 85, featured: true, date: "2026-01-08" },
    { id: "zp-1019", title: "Church wedding procession", category: "weddings", location: "Ndola", by: "p1", scene: "crowd", variant: "wedding", time: "day", tags: ["wedding", "procession", "church", "family"], people: true, release: false, prices: STD, views: 820, downloads: 44, featured: false, date: "2026-04-11" },
    { id: "zp-1020", title: "School leavers' graduation, Kasama", category: "graduations", location: "Kasama", by: "p5", scene: "crowd", variant: "graduation", time: "golden", tags: ["graduation", "school", "students", "kasama"], people: true, release: false, prices: STD, views: 540, downloads: 22, featured: false, date: "2026-07-25" },
    { id: "zp-1021", title: "Lusaka skyline from Kabulonga", category: "landscapes", location: "Lusaka", by: "p1", scene: "city", time: "golden", tags: ["lusaka", "skyline", "city", "aerial"], people: false, prices: STD, views: 1040, downloads: 61, featured: false, date: "2026-08-03" },
    { id: "zp-1022", title: "Lion pride, Kafue National Park", category: "wildlife", location: "Kafue National Park", by: "p4", scene: "savanna", animal: "lion", time: "golden", tags: ["lion", "kafue", "pride", "big cats", "safari"], people: false, prices: P(25, 75, 300), views: 2540, downloads: 132, featured: true, date: "2026-08-19" },
    { id: "zp-1023", title: "Lake Bangweulu fishing village", category: "everyday", location: "Samfya", by: "p3", scene: "lake", time: "golden", tags: ["bangweulu", "fishing", "village", "luapula", "lake"], people: false, prices: STD, views: 480, downloads: 18, featured: false, date: "2026-09-02" },
    { id: "zp-1024", title: "Product launch, Ndola", category: "business", location: "Ndola", by: "p3", scene: "crowd", variant: "conference", time: "indoor", tags: ["launch", "corporate", "event", "stage", "audience"], people: true, release: true, prices: STD, views: 610, downloads: 35, featured: false, date: "2026-09-15" },
  ];

  // ---------------------------------------------------------------------------
  // Seeded random
  // ---------------------------------------------------------------------------
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = typeof seed === "number" ? seed : hashStr(String(seed));
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // Illustration generator
  // ---------------------------------------------------------------------------
  const SKIES = {
    dawn: { top: "#3b4a7a", mid: "#d98a8a", low: "#f6c28b", sun: "#ffe2a8", land: ["#5a4a5e", "#3f3445", "#2a2230"], water: "#c98d8f" },
    golden: { top: "#e48a3c", mid: "#f4b45f", low: "#fbe0a0", sun: "#fff3c4", land: ["#a2652f", "#7a4a22", "#4e2f17"], water: "#e9a85c" },
    dusk: { top: "#2a1d3d", mid: "#b5473a", low: "#f0883e", sun: "#ffd27a", land: ["#4a2633", "#2e1822", "#1a0f15"], water: "#c85a3a" },
    day: { top: "#3d8ed6", mid: "#7fbbe8", low: "#cfe7f6", sun: "#fffbe6", land: ["#6f9b4a", "#4f7a35", "#355a24"], water: "#3f8fc4" },
    indoor: { top: "#1b1426", mid: "#2b1f3a", low: "#3a2a4d", sun: "#ffd27a", land: ["#2a2133", "#1c1624", "#120e18"], water: "#000" },
  };
  const CHITENGE = ["#d7262e", "#f28c28", "#1e8c45", "#f5c518", "#2a5d8f", "#8e2b8e", "#e85d75", "#14b8a6"];

  function ridge(r, w, h, base, amp, steps) {
    let d = `M0 ${h} L0 ${base}`;
    for (let i = 1; i <= steps; i++) {
      const x = (w / steps) * i;
      const y = base - r() * amp;
      const cx = x - w / steps / 2;
      d += ` Q${cx.toFixed(0)} ${(y - amp * 0.4 * r()).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    return d + ` L${w} ${h} Z`;
  }
  function acacia(x, y, s, fill) {
    return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${s})">
      <path d="M-3 0 L-2 -60 Q-20 -80 -45 -88 L-40 -92 Q-14 -84 0 -70 Q10 -86 38 -94 L42 -90 Q14 -80 4 -62 L4 0 Z"/>
      <ellipse cx="-2" cy="-98" rx="78" ry="14"/><ellipse cx="-30" cy="-92" rx="40" ry="10"/><ellipse cx="30" cy="-102" rx="42" ry="10"/>
    </g>`;
  }
  function elephant(x, y, s, fill, flip) {
    return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <ellipse cx="0" cy="-46" rx="38" ry="28"/><rect x="-30" y="-36" width="11" height="36" rx="4"/><rect x="-14" y="-34" width="11" height="34" rx="4"/>
      <rect x="10" y="-34" width="11" height="34" rx="4"/><rect x="24" y="-36" width="11" height="36" rx="4"/>
      <circle cx="40" cy="-52" r="17"/><ellipse cx="32" cy="-50" rx="12" ry="18"/>
      <path d="M50 -50 Q62 -30 56 -4 L50 -4 Q54 -28 44 -42 Z"/><path d="M-38 -50 Q-46 -36 -44 -24 L-42 -24 Q-42 -36 -36 -46 Z"/>
    </g>`;
  }
  function giraffe(x, y, s, fill, flip) {
    return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <ellipse cx="0" cy="-74" rx="30" ry="16"/><rect x="-24" y="-70" width="6" height="70" rx="3"/><rect x="-12" y="-68" width="6" height="68" rx="3"/>
      <rect x="10" y="-68" width="6" height="68" rx="3"/><rect x="20" y="-70" width="6" height="70" rx="3"/>
      <path d="M18 -84 L44 -150 L54 -146 L30 -78 Z"/><ellipse cx="54" cy="-152" rx="14" ry="7" transform="rotate(20 54 -152)"/>
      <rect x="44" y="-166" width="3" height="10"/><rect x="50" y="-166" width="3" height="10"/>
    </g>`;
  }
  function wildebeest(x, y, s, fill, flip) {
    return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <path d="M-28 -30 Q-20 -46 10 -46 Q22 -50 30 -40 L40 -26 L36 -22 L26 -30 Q20 -24 14 -22 L-26 -20 Z"/>
      <rect x="-24" y="-24" width="4" height="24"/><rect x="-14" y="-22" width="4" height="22"/><rect x="8" y="-24" width="4" height="24"/><rect x="16" y="-24" width="4" height="24"/>
      <path d="M24 -44 Q20 -54 28 -54 L28 -50 Z"/><path d="M-28 -30 L-34 -18 L-32 -18 L-26 -28 Z"/>
    </g>`;
  }
  function lion(x, y, s, fill, flip) {
    return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <path d="M-40 -18 Q-40 -38 -10 -38 L22 -38 Q30 -38 32 -30 L32 -10 L-40 -10 Z"/>
      <circle cx="34" cy="-36" r="16"/><path d="M38 -34 L54 -28 L50 -22 L36 -24 Z"/>
      <rect x="-36" y="-14" width="8" height="14" rx="3"/><rect x="20" y="-14" width="8" height="14" rx="3"/><rect x="28" y="-12" width="22" height="7" rx="3"/>
      <path d="M-40 -24 Q-58 -30 -56 -12 L-52 -12 Q-54 -26 -40 -20 Z"/>
    </g>`;
  }
  function person(x, y, s, body, opts) {
    opts = opts || {};
    const head = opts.head || "#3a2418";
    let extra = "";
    if (opts.cap) extra += `<path d="M-14 -88 L0 -94 L14 -88 L0 -82 Z" fill="#14110f"/><rect x="-6" y="-88" width="12" height="5" fill="#14110f"/><path d="M12 -88 L14 -76" stroke="#f5c518" stroke-width="2"/>`;
    if (opts.veil) extra += `<path d="M-10 -84 Q-26 -60 -22 -20 L-10 -60 Z" fill="#fff" opacity=".85"/>`;
    const shape = opts.dress
      ? `<path d="M-9 -66 L9 -66 L26 0 L-26 0 Z" fill="${body}"/>`
      : `<path d="M-12 -66 Q0 -72 12 -66 L14 -30 L10 0 L-10 0 L-14 -30 Z" fill="${body}"/>`;
    const arms = opts.armsUp ? `<path d="M-12 -62 L-26 -96 L-21 -98 L-8 -64 Z M12 -62 L26 -96 L21 -98 L8 -64 Z" fill="${body}"/>` : "";
    return `<g transform="translate(${x} ${y}) scale(${s})">${arms}${shape}<circle cx="0" cy="-78" r="10" fill="${head}"/>${extra}</g>`;
  }
  function boat(x, y, s, fill, rower) {
    return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${s})">
      <path d="M-60 0 Q0 16 60 0 L52 -6 L-52 -6 Z"/>${rower ? `<circle cx="10" cy="-26" r="6"/><path d="M4 -20 L16 -20 L14 -6 L6 -6 Z"/><path d="M-6 -40 L30 6" stroke="${fill}" stroke-width="3"/>` : ""}
    </g>`;
  }

  function scene(photo, opts) {
    opts = opts || {};
    const W = 1200, H = 800;
    const r = rng(photo.id);
    const sky = SKIES[photo.time] || SKIES.golden;
    const gid = "g" + photo.id.replace(/\W/g, "") + (opts.uid || "");
    let s = "";
    const defs = `<defs>
      <linearGradient id="${gid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.top}"/><stop offset=".55" stop-color="${sky.mid}"/><stop offset="1" stop-color="${sky.low}"/></linearGradient>
      <radialGradient id="${gid}g"><stop offset="0" stop-color="${sky.sun}" stop-opacity=".95"/><stop offset=".35" stop-color="${sky.sun}" stop-opacity=".35"/><stop offset="1" stop-color="${sky.sun}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${gid}v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
      <linearGradient id="${gid}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky.water}"/><stop offset="1" stop-color="${sky.land[2]}"/></linearGradient>
    </defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${gid}s)"/>`;
    const sunX = 250 + r() * 700, sunY = 220 + r() * 170;
    const sunGlow = () => `<circle cx="${sunX}" cy="${sunY}" r="260" fill="url(#${gid}g)"/><circle cx="${sunX}" cy="${sunY}" r="${44 + r() * 20}" fill="${sky.sun}"/>`;

    switch (photo.scene) {
      case "river": {
        s += sunGlow();
        s += `<path d="${ridge(r, W, H, 470, 90, 7)}" fill="${sky.land[0]}" opacity=".8"/>`;
        s += `<path d="${ridge(r, W, H, 520, 50, 9)}" fill="${sky.land[1]}"/>`;
        s += `<rect y="540" width="${W}" height="260" fill="url(#${gid}w)"/>`;
        for (let i = 0; i < 14; i++) s += `<rect x="${sunX - 80 + r() * 160}" y="${560 + i * 16}" width="${40 + r() * 90}" height="3" rx="1.5" fill="${sky.sun}" opacity="${0.6 - i * 0.035}"/>`;
        s += `<path d="M0 800 L0 640 Q140 600 260 660 L320 800 Z" fill="${sky.land[2]}"/>`;
        s += acacia(160, 650, 1.3, sky.land[2]);
        s += boat(700 + r() * 200, 640, 1.2, sky.land[2], true);
        break;
      }
      case "falls": {
        s += `<circle cx="${sunX}" cy="140" r="240" fill="url(#${gid}g)"/>`;
        s += `<path d="M0 260 L1200 240 L1200 800 L0 800 Z" fill="${sky.land[1]}"/>`;
        s += `<path d="M0 250 Q300 230 600 248 T1200 236 L1200 270 L0 280 Z" fill="${sky.land[0]}"/>`;
        for (let i = 0; i < 46; i++) {
          const x = 40 + i * 25 + r() * 10;
          s += `<rect x="${x}" y="262" width="${10 + r() * 12}" height="${300 + r() * 120}" fill="#fff" opacity="${0.55 + r() * 0.4}"/>`;
        }
        s += `<ellipse cx="600" cy="600" rx="760" ry="150" fill="#fff" opacity=".7"/>`;
        s += `<ellipse cx="600" cy="560" rx="620" ry="90" fill="#fff" opacity=".45"/>`;
        ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#5e35b1"].forEach((c, i) =>
          s += `<path d="M180 640 A420 360 0 0 1 1020 640" fill="none" stroke="${c}" stroke-width="9" opacity=".32" transform="translate(0 ${i * 9})"/>`);
        s += `<path d="${ridge(r, W, H, 720, 50, 6)}" fill="${sky.land[2]}"/>`;
        s += `<path d="M0 0 L0 800 L120 800 Q90 500 140 300 L80 0 Z" fill="${sky.land[2]}" opacity=".9"/>`;
        break;
      }
      case "savanna": {
        s += sunGlow();
        s += `<path d="${ridge(r, W, H, 520, 60, 5)}" fill="${sky.land[0]}" opacity=".7"/>`;
        s += `<rect y="560" width="${W}" height="240" fill="${sky.land[1]}"/>`;
        for (let i = 0; i < 90; i++) {
          const x = r() * W, y = 570 + r() * 230;
          s += `<path d="M${x} ${y} l-4 -${10 + r() * 14} M${x} ${y} l3 -${8 + r() * 16} M${x} ${y} l7 -${6 + r() * 10}" stroke="${sky.land[2]}" stroke-width="2" opacity=".55"/>`;
        }
        s += acacia(950 + r() * 120, 600, 1.6, sky.land[2]);
        s += acacia(120, 590, 0.9, sky.land[2]);
        const a = photo.animal, c = sky.land[2];
        if (a === "elephant") { s += elephant(420, 640, 2.4, c) + elephant(640, 650, 2.0, c, true) + elephant(540, 660, 1.1, c); }
        else if (a === "giraffe") { s += giraffe(480, 660, 2.4, c) + giraffe(700, 650, 1.7, c, true); }
        else if (a === "wildebeest") { for (let i = 0; i < 16; i++) s += wildebeest(140 + i * 60 + r() * 30, 610 + r() * 120, 1.2 + r() * 0.8, c, r() > 0.5); }
        else if (a === "lion") { s += lion(460, 690, 2.6, c) + lion(720, 700, 2.0, c, true); }
        else if (a === "bats") {
          for (let i = 0; i < 260; i++) {
            const x = r() * W, y = 60 + r() * 460, k = 0.5 + r() * 1.2;
            s += `<path d="M${x} ${y} q${5 * k} -${6 * k} ${10 * k} 0 q${5 * k} -${6 * k} ${10 * k} 0" fill="none" stroke="${c}" stroke-width="${1.6 * k}"/>`;
          }
        }
        break;
      }
      case "lake": {
        s += sunGlow();
        s += `<path d="${ridge(r, W, H, 470, 40, 6)}" fill="${sky.land[0]}" opacity=".6"/>`;
        s += `<rect y="480" width="${W}" height="320" fill="url(#${gid}w)"/>`;
        for (let i = 0; i < 26; i++) s += `<rect x="${r() * W}" y="${500 + r() * 290}" width="${30 + r() * 120}" height="2" fill="#fff" opacity=".25"/>`;
        for (let i = 0; i < 4; i++) {
          const x = 180 + i * 260 + r() * 60, y = 560 + r() * 160;
          s += `<g fill="${sky.land[2]}"><path d="M${x - 70} ${y} L${x + 70} ${y} L${x + 50} ${y + 18} L${x - 50} ${y + 18} Z"/><rect x="${x - 2}" y="${y - 120}" width="4" height="120"/><path d="M${x + 2} ${y - 116} L${x + 60} ${y - 10} L${x + 2} ${y - 10} Z" opacity=".75"/></g>`;
        }
        break;
      }
      case "city": {
        s += sunGlow();
        let x = 0;
        while (x < W) {
          const bw = 50 + r() * 90, bh = 120 + r() * (x > 380 && x < 820 ? 360 : 200);
          s += `<rect x="${x}" y="${640 - bh}" width="${bw}" height="${bh + 10}" fill="${sky.land[1]}"/>`;
          for (let wy = 640 - bh + 14; wy < 620; wy += 22)
            for (let wx = x + 8; wx < x + bw - 12; wx += 16)
              if (r() > 0.55) s += `<rect x="${wx}" y="${wy}" width="7" height="10" fill="${sky.sun}" opacity=".75"/>`;
          x += bw + 4;
        }
        s += `<rect y="640" width="${W}" height="160" fill="${sky.land[2]}"/>`;
        for (let i = 0; i < 40; i++) s += `<rect x="${r() * W}" y="${670 + r() * 90}" width="${16 + r() * 30}" height="4" rx="2" fill="${r() > 0.5 ? "#ff5a3c" : "#fff2c4"}" opacity=".85"/>`;
        break;
      }
      case "mine": {
        s += sunGlow();
        s += `<path d="${ridge(r, W, H, 560, 70, 5)}" fill="${sky.land[0]}" opacity=".7"/>`;
        s += `<path d="M0 620 L300 520 L520 620 Z" fill="${sky.land[1]}"/>`;
        s += `<g stroke="${sky.land[2]}" stroke-width="10" fill="none"><path d="M640 640 L720 220 L800 640"/><path d="M660 540 L780 540 M675 440 L765 440 M690 340 L750 340 M670 520 L760 340 M770 520 L690 340"/><path d="M720 220 L560 640"/></g>`;
        s += `<circle cx="720" cy="226" r="28" fill="none" stroke="${sky.land[2]}" stroke-width="8"/>`;
        s += `<rect x="820" y="470" width="220" height="170" fill="${sky.land[2]}"/><rect x="900" y="300" width="34" height="180" fill="${sky.land[2]}"/>`;
        s += `<ellipse cx="917" cy="260" rx="70" ry="40" fill="#fff" opacity=".18"/>`;
        s += `<rect y="630" width="${W}" height="170" fill="${sky.land[2]}"/>`;
        break;
      }
      case "market": {
        s += `<rect y="560" width="${W}" height="240" fill="#b98a5a"/>`;
        for (let i = 0; i < 5; i++) {
          const x = i * 250 - 20, c = CHITENGE[(i * 3) % CHITENGE.length];
          s += `<rect x="${x + 20}" y="360" width="8" height="240" fill="#5a3a22"/><rect x="${x + 220}" y="360" width="8" height="240" fill="#5a3a22"/>`;
          s += `<path d="M${x} 370 L${x + 125} 300 L${x + 250} 370 Z" fill="${c}"/>`;
          s += `<rect x="${x + 30}" y="490" width="190" height="20" fill="#6b4a2b"/>`;
          for (let k = 0; k < 9; k++) s += `<circle cx="${x + 44 + k * 20}" cy="${482 - (k % 2) * 8}" r="11" fill="${["#e53935", "#43a047", "#f9a825", "#8d6e63"][(k + i) % 4]}"/>`;
        }
        for (let i = 0; i < 9; i++) s += person(60 + i * 130 + r() * 40, 760 + r() * 30, 2 + r() * 0.6, CHITENGE[Math.floor(r() * CHITENGE.length)], { head: "#2b1a12" });
        break;
      }
      case "ceremony": {
        if (photo.variant === "barge") {
          s += sunGlow();
          s += `<rect y="470" width="${W}" height="330" fill="url(#${gid}w)"/>`;
          s += `<path d="M0 470 Q300 455 600 470 T1200 466 L1200 490 L0 490 Z" fill="${sky.land[1]}"/>`;
          s += `<g transform="translate(600 640)"><path d="M-380 0 Q0 50 380 0 L340 -30 L-340 -30 Z" fill="#14110f"/>`;
          for (let k = -6; k <= 6; k += 2) s += `<path d="M${k * 50} -30 L${k * 50 - 4} -90 L${k * 50 + 4} -90 Z" fill="#f2f2f2"/>`;
          s += `<rect x="-90" y="-150" width="180" height="120" fill="#f2f2f2"/><path d="M-110 -150 L0 -210 L110 -150 Z" fill="#14110f"/>`;
          s += `<path d="M-10 -210 L-10 -320 L-120 -300 L-10 -270" fill="none" stroke="#14110f" stroke-width="6"/>`;
          s += `<ellipse cx="0" cy="-340" rx="70" ry="30" fill="#14110f"/><circle cx="60" cy="-360" r="22" fill="#14110f"/></g>`;
          for (let i = 0; i < 12; i++) s += `<path d="M${240 + i * 64} 590 l26 -60" stroke="#14110f" stroke-width="4"/><circle cx="${266 + i * 64}" cy="${520}" r="8" fill="#d7262e"/>`;
        } else {
          s += sunGlow();
          s += `<rect y="560" width="${W}" height="240" fill="#a5733f"/>`;
          s += `<ellipse cx="600" cy="700" rx="600" ry="80" fill="#8b5a2b" opacity=".6"/>`;
          for (let i = 0; i < 7; i++) s += person(150 + i * 150 + r() * 30, 740, 2.6, CHITENGE[i % CHITENGE.length], { armsUp: i % 2 === 0, head: "#2b1a12" });
          for (let i = 0; i < 4; i++) s += `<g transform="translate(${80 + i * 330} 790)"><rect x="-30" y="-70" width="60" height="70" rx="8" fill="#6b3f1f"/><ellipse cx="0" cy="-70" rx="30" ry="8" fill="#e8d3b0"/></g>`;
        }
        break;
      }
      case "crowd": {
        const v = photo.variant;
        if (v === "conference") {
          s += `<rect y="0" width="${W}" height="${H}" fill="#1b1426"/>`;
          s += `<rect x="300" y="100" width="600" height="300" rx="10" fill="#2a5d8f"/><rect x="330" y="130" width="540" height="240" rx="6" fill="#3d8ed6" opacity=".7"/>`;
          s += `<rect x="380" y="180" width="300" height="22" rx="6" fill="#fff" opacity=".85"/><rect x="380" y="220" width="220" height="14" rx="6" fill="#fff" opacity=".55"/><rect x="380" y="250" width="260" height="14" rx="6" fill="#fff" opacity=".55"/>`;
          s += `<path d="M0 0 L380 0 L600 560 Z" fill="#fff6d0" opacity=".06"/><path d="M1200 0 L820 0 L600 560 Z" fill="#fff6d0" opacity=".06"/>`;
          s += `<rect x="0" y="470" width="${W}" height="40" fill="#3a2a4d"/>`;
          s += `<rect x="560" y="400" width="80" height="80" fill="#6b3f1f"/>` + person(600, 400, 1.6, "#1e2a44", { head: "#3a2418" });
          for (let row = 0; row < 3; row++)
            for (let i = 0; i < 12; i++) s += `<g opacity="${0.75 + row * 0.12}">` + person(40 + i * 100 + (row % 2) * 50, 640 + row * 70, 1.5 + row * 0.25, "#0e0a14", { head: "#0e0a14" }) + `</g>`;
        } else if (v === "wedding") {
          s += sunGlow();
          s += `<rect y="560" width="${W}" height="240" fill="${sky.land[0]}"/>`;
          s += `<path d="M420 600 L420 300 Q600 140 780 300 L780 600" fill="none" stroke="#f4f0e8" stroke-width="18"/>`;
          for (let i = 0; i < 26; i++) {
            const t = i / 25, ang = Math.PI * (1 - t);
            s += `<circle cx="${600 + Math.cos(ang) * 190}" cy="${330 - Math.sin(ang) * 120}" r="${12 + r() * 8}" fill="${["#ffffff", "#f8bbd0", "#e85d75", "#f28c28"][i % 4]}"/>`;
          }
          s += person(560, 690, 3.2, "#fbfaf6", { dress: true, veil: true, head: "#3a2418" });
          s += person(650, 690, 3.4, "#1f2433", { head: "#2b1a12" });
          for (let i = 0; i < 8; i++) {
            const x = i < 4 ? 70 + i * 80 : 850 + (i - 4) * 80;
            s += person(x, 760, 2.3, CHITENGE[i % CHITENGE.length], { head: "#2b1a12" });
          }
        } else {
          // graduation
          s += sunGlow();
          s += `<rect x="150" y="250" width="900" height="330" fill="#d9c9b0"/><path d="M120 250 L600 140 L1080 250 Z" fill="#b8682b"/>`;
          for (let i = 0; i < 8; i++) s += `<rect x="${200 + i * 110}" y="270" width="26" height="310" fill="#efe5d2"/>`;
          s += `<rect y="580" width="${W}" height="220" fill="${sky.land[0]}"/>`;
          for (let i = 0; i < 9; i++) s += person(80 + i * 130 + r() * 20, 780, 2.6 + r() * 0.3, i % 3 === 0 ? "#1e8c45" : "#14110f", { cap: true, armsUp: i === 4, head: "#2b1a12" });
          for (let i = 0; i < 14; i++) s += `<path d="M${r() * W} ${80 + r() * 160} l14 -6 l0 10 Z" fill="#14110f" transform="rotate(${r() * 60 - 30})" opacity=".8"/>`;
        }
        break;
      }
      default:
        s += sunGlow();
    }
    // vignette for a photographic feel
    s += `<rect width="${W}" height="${H}" fill="url(#${gid}v)"/>`;
    const attrs = opts.width ? `width="${opts.width}" height="${Math.round(opts.width * H / W)}"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${attrs} preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeAttr(photo.title)}">${defs}${s}</svg>`;
  }

  function escapeAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  // ---------------------------------------------------------------------------
  // Demo sales history for the dashboard (deterministic)
  // ---------------------------------------------------------------------------
  function seedSales(photographerId, photos, now) {
    const r = rng("sales-" + photographerId);
    const mine = photos.filter((p) => p.by === photographerId);
    const sales = [];
    if (!mine.length) return sales;
    const licIds = ["personal", "personal", "business", "business", "business", "premium"];
    for (let m = 6; m >= 0; m--) {
      const count = 4 + Math.floor(r() * 6) + (6 - m);
      for (let i = 0; i < count; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(r() * 27), 9 + Math.floor(r() * 10));
        if (d > now) continue;
        const p = mine[Math.floor(r() * mine.length)];
        const lic = licIds[Math.floor(r() * licIds.length)];
        if (lic === "premium" && p.people && !p.release) continue;
        const price = p.prices[lic];
        sales.push({
          id: "S" + Math.floor(r() * 1e8).toString(36).toUpperCase(),
          photoId: p.id, licence: lic, price,
          earning: +(price * COMMISSION.photographer).toFixed(2),
          date: d.toISOString(),
          buyer: ["Personal buyer", "Lusaka Times", "Zambezi Lodges", "Copper Ad Agency", "School project", "Event organiser"][Math.floor(r() * 6)],
        });
      }
    }
    return sales.sort((a, b) => b.date.localeCompare(a.date));
  }

  global.ZP = {
    COMMISSION, LICENCES, PLANS, CATEGORIES, PROVINCES, PAY_NETWORKS, PHOTOGRAPHERS, PHOTOS,
    rng, scene, seedSales,
  };
})(window);
