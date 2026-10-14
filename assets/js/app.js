/* Zed Photos — single-page marketplace app (hash routing, browser-stored demo state). */
(function () {
  "use strict";
  const { COMMISSION, LICENCES, PLANS, CATEGORIES, PROVINCES, PAY_NETWORKS, PHOTOGRAPHERS, PHOTOS } = ZP;
  const app = document.getElementById("app");
  const HOLD_DAYS = 7; // earnings clear after the refund window
  const MIN_PAYOUT = 50;

  // ---------------------------------------------------------------------------
  // State (persisted in this browser only)
  // ---------------------------------------------------------------------------
  const STORE_KEY = "zedphotos:v1";
  const fresh = () => ({ cart: [], orders: [], user: null, photographers: [], uploads: [], sales: [], payouts: [], views: {} });
  let state = fresh();
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch (e) { /* storage unavailable */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
    catch (e) { toast("Your browser storage is full — remove some uploads and try again."); return false; }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const K = (n) => "K" + Number(n).toLocaleString("en-ZM", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const uid = (p) => p + Math.random().toString(36).slice(2, 8).toUpperCase();
  let mediaSeq = 0;

  const allPhotos = () => PHOTOS.concat(state.uploads);
  const allPhotographers = () => PHOTOGRAPHERS.concat(state.photographers);
  const photoById = (id) => allPhotos().find((p) => p.id === id);
  const photographerById = (id) => allPhotographers().find((p) => p.id === id);
  const catName = (id) => (CATEGORIES.find((c) => c.id === id) || { name: id }).name;
  const province = (loc) => PROVINCES[loc] || "Zambia";
  const premiumBlocked = (p) => p.people && !p.release;
  const fromPrice = (p) => p.prices.personal;
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  function icon(name, cls) {
    const paths = {
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
      check: '<path d="m5 12 5 5 9-10"/>',
      upload: '<path d="M12 16V4m0 0-5 5m5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
      download: '<path d="M12 4v12m0 0-5-5m5 5 5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
      shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
      phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
      chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H3"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
      camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      x: '<path d="m6 6 12 12M18 6 6 18"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
      pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      tag: '<path d="M3 12V4h8l9 9-8 8-9-9Z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      flag: '<path d="M5 21V4m0 0h12l-2 4 2 4H5"/>',
      wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18M6 6l9-3 1 3"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/>',
      star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8L12 3Z"/>',
    };
    return `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  }

  function media(p, opts) {
    opts = opts || {};
    const inner = p.src
      ? `<img src="${esc(p.src)}" alt="${esc(p.title)}" loading="lazy">`
      : ZP.scene(p, { uid: "m" + mediaSeq++ });
    return `<div class="media">${inner}</div>${opts.clean ? "" : '<div class="wm" aria-hidden="true"></div>'}`;
  }

  function toast(msg) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; wrap.setAttribute("role", "status"); document.body.appendChild(wrap); }
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    wrap.appendChild(t); setTimeout(() => t.remove(), 4200);
  }

  function updateCartCount() {
    const el = document.getElementById("cart-count");
    el.textContent = state.cart.length;
    el.classList.toggle("hidden", !state.cart.length);
  }

  function photoCard(p) {
    const ph = photographerById(p.by) || { name: "Unknown" };
    const badge = p.release ? `<span class="badge badge-dark">${icon("shield")}Model release</span>` : (p.featured ? `<span class="badge badge-dark">${icon("star")}Featured</span>` : "");
    return `<article class="photo-card">
      <a class="thumb" href="#/photo/${p.id}" aria-label="${esc(p.title)}">${badge}${media(p)}</a>
      <div class="meta">
        <a class="title" href="#/photo/${p.id}">${esc(p.title)}</a>
        <span class="by">${esc(ph.name)} · ${esc(p.location)}</span>
        <div class="foot"><span class="price-from"><small>from </small>${K(fromPrice(p))}</span><span class="badge">${esc(catName(p.category))}</span></div>
      </div>
    </article>`;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  function searchPhotos(f) {
    const q = (f.q || "").toLowerCase().trim();
    const terms = q ? q.split(/\s+/) : [];
    let list = allPhotos().filter((p) => {
      if (f.cat && p.category !== f.cat) return false;
      if (f.prov && province(p.location) !== f.prov) return false;
      if (f.by && p.by !== f.by) return false;
      if (f.release === "1" && !(p.release || !p.people)) return false;
      if (f.max && fromPrice(p) > +f.max) return false;
      if (!terms.length) return true;
      const ph = photographerById(p.by);
      const hay = [p.title, p.location, province(p.location), catName(p.category), ph && ph.name, (p.tags || []).join(" ")].join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    const sorts = {
      popular: (a, b) => b.downloads - a.downloads,
      newest: (a, b) => b.date.localeCompare(a.date),
      price: (a, b) => fromPrice(a) - fromPrice(b),
      views: (a, b) => b.views - a.views,
    };
    return list.sort(sorts[f.sort] || sorts.popular);
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------
  function viewHome() {
    const hero = PHOTOS.find((p) => p.id === "zp-1001");
    const featured = allPhotos().filter((p) => p.featured).slice(0, 8);
    const catArt = { wildlife: "zp-1003", landscapes: "zp-1001", tourism: "zp-1015", culture: "zp-1005", weddings: "zp-1008", graduations: "zp-1007", business: "zp-1012", everyday: "zp-1010" };
    const photographers = allPhotographers().length;
    return `
    <section class="hero">
      <div class="hero-bg">${ZP.scene(hero, { uid: "hero" })}</div>
      <div class="container hero-inner">
        <span class="eyebrow" style="color:#fbd7b0">Zambia's photography marketplace</span>
        <h1>Authentic Zambian images, licensed in minutes.</h1>
        <p class="lead">Discover photographs of Zambia's people, places, wildlife and events, taken by Zambian photographers. Pay with mobile money and download the high resolution original straight away.</p>
        <form class="search-bar" data-search>
          <input type="search" name="q" placeholder="Try “Victoria Falls”, “Kuomboka” or “graduation”" aria-label="Search photos">
          <select name="cat" aria-label="Category"><option value="">All categories</option>${CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
          <button class="btn btn-copper" type="submit">${icon("search")}<span>Search</span></button>
        </form>
        <div class="quick-tags">${["Victoria Falls", "Elephant", "Wedding", "Lusaka", "Kuomboka", "Copperbelt", "Graduation", "Lake Kariba"].map((t) => `<a href="#/browse?q=${encodeURIComponent(t)}">${t}</a>`).join("")}</div>
        <div class="stats-strip">
          <div><strong>${allPhotos().length}</strong><span>licensable images</span></div>
          <div><strong>${photographers}</strong><span>Zambian photographers</span></div>
          <div><strong>${Object.keys(PROVINCES).length}</strong><span>towns & parks covered</span></div>
          <div><strong>70%</strong><span>of every sale to the photographer</span></div>
        </div>
      </div>
      <span class="hero-credit">Sunset over the Zambezi · Mosi Light Studio</span>
    </section>

    <section class="section">
      <div class="container">
        <div class="spread"><div><span class="eyebrow">Browse by category</span><h2>Find the shot you need</h2></div><a class="btn btn-ghost" href="#/browse">View all photos</a></div>
        <div class="cat-grid" style="margin-top:20px">
          ${CATEGORIES.map((c) => `<a class="cat-tile" href="#/browse?cat=${c.id}"><div class="art">${ZP.scene(photoById(catArt[c.id]), { uid: "cat" + c.id })}</div><strong>${c.name}<small>${c.blurb}</small></strong></a>`).join("")}
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="spread"><div><span class="eyebrow">Featured this month</span><h2>Best-selling Zambian images</h2></div><a class="btn btn-ghost" href="#/browse?sort=popular">See more</a></div>
        <div class="photo-grid" style="margin-top:20px">${featured.map(photoCard).join("")}</div>
      </div>
    </section>

    <section class="section" style="background:var(--surface);border-block:1px solid var(--line)">
      <div class="container grid-3">
        <div><div class="feature-icon">${icon("search")}</div><h3>Search what matters locally</h3><p class="muted">Search by town, landmark, ceremony, event, category or keyword. Find a photo of a particular Zambian town, hotel, festival or landmark that global libraries don't have.</p></div>
        <div><div class="feature-icon green">${icon("phone")}</div><h3>Pay with mobile money</h3><p class="muted">Check out with MTN MoMo, Airtel Money, Zamtel Kwacha or card. Your licence and high resolution download are ready as soon as you approve payment.</p></div>
        <div><div class="feature-icon">${icon("shield")}</div><h3>Licensed and consent-checked</h3><p class="muted">Every image carries a clear licence. Photos of identifiable people are flagged, and premium commercial use needs a signed model release.</p></div>
      </div>
    </section>

    <section class="section">
      <div class="container grid-2" style="align-items:start">
        <div class="card">
          <span class="eyebrow">For customers</span><h2>Licence an image in four steps</h2>
          <div class="steps" style="margin-top:16px">
            <div class="step"><p><strong>Search</strong> weddings, graduations, business events, wildlife, tourism, landscapes, culture and everyday life.</p></div>
            <div class="step"><p><strong>Preview</strong> the watermarked image and check who took it, where, and whether a model release is held.</p></div>
            <div class="step"><p><strong>Pick a licence</strong> based on how you'll use it: personal, business or premium commercial.</p></div>
            <div class="step"><p><strong>Pay and download</strong> the original high resolution file, with a licence certificate for your records.</p></div>
          </div>
          <a class="btn btn-primary" href="#/browse" style="margin-top:20px">Start browsing</a>
        </div>
        <div class="card">
          <span class="eyebrow">For photographers</span><h2>Earn from the photos you already take</h2>
          <div class="steps" style="margin-top:16px">
            <div class="step"><p><strong>Subscribe</strong> from K50 a month and create your verified photographer profile.</p></div>
            <div class="step"><p><strong>Upload</strong> photos with categories, locations and keywords. Use platform pricing or set your own.</p></div>
            <div class="step"><p><strong>Sell</strong> to individuals, agencies, newspapers, lodges and corporate teams across Zambia.</p></div>
            <div class="step"><p><strong>Get paid</strong> 70% of every sale, withdrawn straight to your mobile money wallet.</p></div>
          </div>
          <a class="btn btn-copper" href="#/sell" style="margin-top:20px">See photographer plans</a>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="split-band">
          <div>
            <span class="eyebrow" style="color:#fbd7b0">Business accounts</span>
            <h2>Images for agencies, newsrooms and brands</h2>
            <p class="lead">Marketing agencies, newspapers, tourism operators, event organisers and corporate communications teams can license in bulk, share credits across a team and pay against invoice.</p>
            <a class="btn btn-copper" href="#/business">Explore business accounts</a>
          </div>
          <div class="grid-2" style="gap:12px">
            <div class="kpi" style="background:#211b17;border-color:#3a312a"><div class="label" style="color:#bfb3a6">Team seats</div><div class="value" style="color:#fff">Unlimited</div></div>
            <div class="kpi" style="background:#211b17;border-color:#3a312a"><div class="label" style="color:#bfb3a6">Bulk licences</div><div class="value" style="color:#fff">Up to 30% off</div></div>
            <div class="kpi" style="background:#211b17;border-color:#3a312a"><div class="label" style="color:#bfb3a6">Invoicing</div><div class="value" style="color:#fff">Monthly</div></div>
            <div class="kpi" style="background:#211b17;border-color:#3a312a"><div class="label" style="color:#bfb3a6">Custom shoots</div><div class="value" style="color:#fff">On request</div></div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function viewBrowse(params) {
    const f = Object.fromEntries(params.entries());
    const results = searchPhotos(f);
    const base = searchPhotos(Object.assign({}, f, { cat: "", prov: "" }));
    const count = (key, val) => base.filter((p) => (key === "cat" ? p.category : province(p.location)) === val).length;
    const provs = [...new Set(allPhotos().map((p) => province(p.location)))].sort();
    const radio = (name, val, label, n) => `<label><input type="radio" name="${name}" value="${val}" ${(f[name] || "") === val ? "checked" : ""}> ${label}${n != null ? `<span class="count">${n}</span>` : ""}</label>`;
    const title = f.by ? `Photos by ${esc((photographerById(f.by) || {}).name)}` : f.cat ? catName(f.cat) : f.q ? `Results for “${esc(f.q)}”` : "All photos";
    return `
    <section class="container page-head">
      <div class="breadcrumbs"><a href="#/">Home</a> / Browse</div>
      <h1 style="font-size:2rem">${title}</h1>
      <p class="muted">${results.length} image${results.length === 1 ? "" : "s"} · prices shown are the lowest (personal) licence</p>
    </section>
    <section class="container">
      <div class="browse-layout">
        <form class="filters" id="filters">
          <h4>Category</h4>
          <div class="filter-list">${radio("cat", "", "All categories")}${CATEGORIES.map((c) => radio("cat", c.id, c.name, count("cat", c.id))).join("")}</div>
          <h4>Province</h4>
          <div class="filter-list">${radio("prov", "", "All of Zambia")}${provs.map((p) => radio("prov", p, p, count("prov", p))).join("")}</div>
          <h4>Licence price</h4>
          <div class="filter-list">${radio("max", "", "Any price")}${radio("max", "15", "Personal up to K15")}${radio("max", "20", "Personal up to K20")}</div>
          <h4>Commercial use</h4>
          <div class="filter-list"><label><input type="checkbox" name="release" value="1" ${f.release === "1" ? "checked" : ""}> Cleared for premium use</label></div>
          ${f.by ? `<input type="hidden" name="by" value="${esc(f.by)}">` : ""}
        </form>
        <div>
          <form class="browse-head" data-search id="browse-search">
            <div class="field"><input type="search" name="q" value="${esc(f.q || "")}" placeholder="Search keywords, places, events…" aria-label="Search"></div>
            <div class="field" style="flex:0 0 auto;min-width:0"><select name="sort" aria-label="Sort">${[["popular", "Most downloaded"], ["newest", "Newest"], ["views", "Most viewed"], ["price", "Lowest price"]].map(([v, l]) => `<option value="${v}" ${f.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
            <button class="btn btn-primary" type="submit">${icon("search")}Search</button>
          </form>
          ${results.length ? `<div class="photo-grid">${results.map(photoCard).join("")}</div>` : `<div class="empty"><h3>No photos match yet</h3><p class="muted">Try fewer keywords or a different province. Photographers upload new images every week.</p><a class="btn btn-ghost" href="#/browse">Clear filters</a></div>`}
        </div>
      </div>
    </section>`;
  }

  function viewPhoto(id) {
    const p = photoById(id);
    if (!p) return viewNotFound();
    state.views[id] = (state.views[id] || 0) + 1; save();
    const ph = photographerById(p.by) || { name: "Unknown", color: "#999", id: "" };
    const blocked = premiumBlocked(p);
    const related = allPhotos().filter((x) => x.id !== p.id && (x.category === p.category || x.by === p.by)).slice(0, 4);
    const opt = (lic, i) => {
      const L = LICENCES[lic], dis = lic === "premium" && blocked;
      return `<label class="licence-option ${dis ? "disabled" : ""}">
        <input type="radio" name="licence" value="${lic}" ${i === 1 && !dis ? "checked" : ""} ${dis ? "disabled" : ""}>
        <div><strong>${L.name}</strong><p>${dis ? "Not available: no model release is held for the people in this photo." : L.summary}</p></div>
        <span class="lp">${K(p.prices[lic])}</span>
      </label>`;
    };
    return `
    <section class="container page-head">
      <div class="breadcrumbs"><a href="#/">Home</a> / <a href="#/browse?cat=${p.category}">${esc(catName(p.category))}</a> / ${esc(p.title)}</div>
    </section>
    <section class="container">
      <div class="detail">
        <div>
          <div class="detail-media">${media(p)}</div>
          <p class="small muted" style="margin-top:10px">${icon("info")} Watermarked preview. Your download is the clean, full resolution original.</p>
          <div class="card" style="margin-top:20px">
            <h3>About this image</h3>
            <dl class="kv">
              <dt>Image ID</dt><dd>${esc(p.id)}</dd>
              <dt>Location</dt><dd>${esc(p.location)}, ${esc(province(p.location))} Province</dd>
              <dt>Category</dt><dd>${esc(catName(p.category))}</dd>
              <dt>Taken</dt><dd>${fmtDate(p.date)}</dd>
              <dt>People</dt><dd>${p.people ? (p.release ? `<span class="badge badge-green">${icon("shield")}Identifiable people · model release on file</span>` : `<span class="badge badge-copper">Identifiable people · no model release</span>`) : "No identifiable people"}</dd>
              <dt>Original</dt><dd>${p.src ? "As uploaded" : "6000 × 4000 px · JPEG"}</dd>
            </dl>
            <div class="tags" style="margin-top:14px">${(p.tags || []).map((t) => `<a href="#/browse?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>
          </div>
        </div>
        <aside>
          <h1 style="font-size:1.9rem">${esc(p.title)}</h1>
          <a class="row" href="#/photographer/${ph.id}" style="margin:6px 0 18px;color:var(--ink)">
            <span class="avatar" style="background:${ph.color}">${initials(ph.name)}</span>
            <span><strong>${esc(ph.name)}</strong> ${ph.verified ? `<span class="badge badge-green">${icon("check")}Verified</span>` : ""}<br><span class="small muted">${esc(ph.town || "")} · view portfolio</span></span>
          </a>
          <form id="buy-form">
            <h3>Choose a licence</h3>
            <p class="small muted">The price depends on how you'll use the image, not on file size.</p>
            ${["personal", "business", "premium"].map(opt).join("")}
            <button class="btn btn-copper btn-block" type="submit" style="margin-top:16px">${icon("cart")}Add to cart</button>
            <button class="btn btn-primary btn-block" type="button" id="buy-now" style="margin-top:8px">Buy now</button>
          </form>
          <div class="notice" style="margin-top:16px">${icon("phone")}<span>Pay with MTN MoMo, Airtel Money, Zamtel Kwacha or card. ${Math.round(COMMISSION.photographer * 100)}% of the price goes to the photographer.</span></div>
          <p class="small muted" style="margin-top:14px"><a href="#/licensing">Read licence terms</a> · <a href="#/licensing?report=${p.id}">${icon("flag")} Report this image</a></p>
        </aside>
      </div>
      ${related.length ? `<div style="margin-top:48px"><h2>More like this</h2><div class="photo-grid" style="margin-top:16px">${related.map(photoCard).join("")}</div></div>` : ""}
    </section>`;
  }

  function cartTotals() {
    const items = state.cart.map((c) => ({ ...c, photo: photoById(c.photoId) })).filter((c) => c.photo);
    const total = items.reduce((s, c) => s + c.photo.prices[c.licence], 0);
    return { items, total };
  }

  function viewCart() {
    const { items, total } = cartTotals();
    if (!items.length) return `<section class="container page-head"><h1 style="font-size:2rem">Your cart</h1><div class="empty"><h3>Your cart is empty</h3><p class="muted">Find an image and choose a licence to get started.</p><a class="btn btn-primary" href="#/browse">Browse photos</a></div></section>`;
    return `
    <section class="container page-head"><h1 style="font-size:2rem">Your cart</h1></section>
    <section class="container cart-layout">
      <div class="card">
        ${items.map((c, i) => `<div class="cart-item">
          <a class="thumb" href="#/photo/${c.photo.id}">${media(c.photo)}</a>
          <div><strong>${esc(c.photo.title)}</strong><div class="small muted">${esc(LICENCES[c.licence].name)} licence · ${esc(c.photo.id)}</div>
            <select class="input" data-cart-licence="${i}" style="margin-top:8px;max-width:260px;padding:6px 10px">${Object.values(LICENCES).map((L) => `<option value="${L.id}" ${L.id === c.licence ? "selected" : ""} ${L.id === "premium" && premiumBlocked(c.photo) ? "disabled" : ""}>${L.short} · ${K(c.photo.prices[L.id])}</option>`).join("")}</select>
          </div>
          <div class="row" style="justify-content:flex-end"><strong>${K(c.photo.prices[c.licence])}</strong><button class="btn btn-ghost btn-icon" data-remove="${i}" aria-label="Remove">${icon("trash")}</button></div>
        </div>`).join("")}
      </div>
      <aside class="card">
        <h3>Order summary</h3>
        <div class="summary-line"><span>${items.length} licence${items.length > 1 ? "s" : ""}</span><span>${K(total)}</span></div>
        <div class="summary-line"><span>Payment fees</span><span>K0</span></div>
        <div class="summary-line total"><span>Total</span><span>${K(total)}</span></div>
        <a class="btn btn-copper btn-block" href="#/checkout" style="margin-top:16px">Checkout</a>
        <p class="small muted" style="margin-top:12px">Prices are in Zambian Kwacha and include any applicable taxes.</p>
      </aside>
    </section>`;
  }

  function payMethods(name, selected, includeCard) {
    return `<div class="pay-methods">${Object.values(PAY_NETWORKS).filter((n) => includeCard || n.id !== "card").map((n) => `
      <label class="pay-method"><input type="radio" name="${name}" value="${n.id}" ${n.id === selected ? "checked" : ""} class="sr-only">
        <span class="pay-logo" style="background:${n.color};color:${n.ink}">${n.tag}</span>
        <span><strong>${n.name}</strong><small>${n.prefixes.length ? n.prefixes.join(" / ") + " numbers" : "Debit or credit card"}</small></span></label>`).join("")}</div>`;
  }

  function viewCheckout() {
    const { items, total } = cartTotals();
    if (!items.length) { location.hash = "#/cart"; return ""; }
    const u = state.user || {};
    return `
    <section class="container page-head"><div class="breadcrumbs"><a href="#/cart">Cart</a> / Checkout</div><h1 style="font-size:2rem">Checkout</h1></section>
    <section class="container cart-layout">
      <form class="card" id="checkout-form" novalidate>
        <h3>Your details</h3>
        <div class="form-grid" style="margin-bottom:22px">
          <div class="field"><label for="co-name">Full name</label><input id="co-name" name="name" type="text" required value="${esc(u.name || "")}"></div>
          <div class="field"><label for="co-email">Email for receipt</label><input id="co-email" name="email" type="email" required placeholder="you@example.com"></div>
          <div class="field full"><label for="co-org">Organisation (optional)</label><input id="co-org" name="org" type="text" placeholder="Shown on your licence certificate"></div>
        </div>
        <h3>Payment method</h3>
        ${payMethods("method", "mtn", true)}
        <div class="field" id="phone-field" style="margin-top:16px"><label for="co-phone">Mobile money number</label><input id="co-phone" name="phone" type="tel" inputmode="numeric" placeholder="096 123 4567" value="${esc(u.phone || "")}"><span class="hint" id="phone-hint">You'll get a prompt on this phone to approve with your PIN.</span><span class="error hidden" id="phone-error"></span></div>
        <div class="form-grid hidden" id="card-fields" style="margin-top:16px">
          <div class="field full"><label for="co-card">Card number</label><input id="co-card" type="text" inputmode="numeric" placeholder="4242 4242 4242 4242"></div>
          <div class="field"><label for="co-exp">Expiry</label><input id="co-exp" type="text" placeholder="MM/YY"></div>
          <div class="field"><label for="co-cvc">CVC</label><input id="co-cvc" type="text" inputmode="numeric" placeholder="123"></div>
        </div>
        <label class="check" style="margin-top:18px"><input type="checkbox" name="agree" required> <span>I agree to the <a href="#/licensing" target="_blank">licence terms</a> for each image in my order.</span></label>
        <button class="btn btn-copper btn-block" type="submit" style="margin-top:18px">Pay ${K(total)}</button>
        <p class="small muted center" style="margin-top:10px">${icon("shield")} Demo checkout: no money is taken.</p>
      </form>
      <aside class="card">
        <h3>Order</h3>
        ${items.map((c) => `<div class="summary-line"><span>${esc(c.photo.title)}<br><span class="small muted">${LICENCES[c.licence].short} licence</span></span><span>${K(c.photo.prices[c.licence])}</span></div>`).join("")}
        <div class="summary-line total"><span>Total</span><span>${K(total)}</span></div>
      </aside>
    </section>`;
  }

  function viewOrder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return viewNotFound();
    return `
    <section class="container page-head">
      <div class="notice green" style="margin-bottom:20px">${icon("check")}<span><strong>Payment approved.</strong> Order ${esc(o.id)} · ${K(o.total)} via ${esc(PAY_NETWORKS[o.method].name)} · ${fmtDate(o.date)}</span></div>
      <h1 style="font-size:2rem">Your downloads</h1>
      <p class="muted">Download each high resolution original and keep the licence certificate with your project files.</p>
    </section>
    <section class="container">
      <div class="card">
        ${o.items.map((it, i) => { const p = photoById(it.photoId); if (!p) return ""; return `<div class="cart-item">
          <a class="thumb" href="#/photo/${p.id}">${media(p, { clean: true })}</a>
          <div><strong>${esc(p.title)}</strong><div class="small muted">${LICENCES[it.licence].name} · licence ${esc(o.id)}-${i + 1}</div></div>
          <div class="row" style="justify-content:flex-end">
            <button class="btn btn-primary btn-sm" data-download="${p.id}">${icon("download")}Original</button>
            <button class="btn btn-ghost btn-sm" data-cert="${i}" data-order="${o.id}">Licence</button>
          </div></div>`; }).join("")}
      </div>
      <p class="small muted" style="margin-top:14px">Lost a file? Every past order is listed under <a href="#/orders">My downloads</a>.</p>
    </section>`;
  }

  function viewOrders() {
    return `<section class="container page-head"><h1 style="font-size:2rem">My downloads</h1></section>
    <section class="container">${state.orders.length ? `<div class="card table-wrap"><table class="table"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Paid with</th><th class="num">Total</th></tr></thead><tbody>
      ${state.orders.slice().reverse().map((o) => `<tr><td><a href="#/order/${o.id}">${esc(o.id)}</a></td><td>${fmtDate(o.date)}</td><td>${o.items.length}</td><td>${esc(PAY_NETWORKS[o.method].name)}</td><td class="num">${K(o.total)}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty"><h3>No purchases yet</h3><a class="btn btn-primary" href="#/browse">Browse photos</a></div>`}</section>`;
  }

  function planCards(action) {
    return `<div class="plans">${Object.values(PLANS).map((pl) => `
      <div class="plan ${pl.id === "professional" ? "featured" : ""}">
        ${pl.id === "professional" ? '<span class="ribbon">Most popular</span>' : ""}
        <h3>${pl.name}</h3><p class="muted small" style="margin:0">${pl.tagline}</p>
        <p class="price">${K(pl.price)} <small>/ month</small></p>
        <ul>${pl.features.map((f) => `<li>${icon("check")}<span>${f}</span></li>`).join("")}<li>${icon("check")}<span>Keep ${Math.round(COMMISSION.photographer * 100)}% of every sale</span></li></ul>
        ${action(pl)}
      </div>`).join("")}</div>`;
  }

  function viewSell() {
    const ex = 50, pe = ex * COMMISSION.photographer, pl = ex * COMMISSION.platform;
    return `
    <section class="container page-head center">
      <span class="eyebrow">Sell on Zed Photos</span>
      <h1>Turn your portfolio into monthly income</h1>
      <p class="lead" style="margin:0 auto">Pick a plan, upload your best work and earn 70% every time a customer licenses one of your photos. Payouts go to your mobile money wallet.</p>
    </section>
    <section class="section-tight"><div class="container">
      ${planCards((pl) => `<a class="btn ${pl.id === "professional" ? "btn-copper" : "btn-primary"} btn-block" href="#/dashboard?plan=${pl.id}">Start with ${pl.name}</a>`)}
      <p class="small muted center" style="margin-top:14px">Subscriptions are billed monthly by mobile money. Cancel any time; your photos stop being listed at the end of the paid month.</p>
    </div></section>

    <section class="section"><div class="container grid-2" style="align-items:start">
      <div>
        <span class="eyebrow">How the commission works</span>
        <h2>You keep 70% of every sale</h2>
        <p class="muted">Zed Photos keeps 30% to cover payment processing, hosting, marketing to business buyers, licensing and support. For example, when a customer buys a K50 business licence:</p>
        <div class="split-calc" style="margin-top:18px">
          <div class="box"><span class="small muted">Customer pays</span><strong>${K(ex)}</strong></div><span class="op">=</span>
          <div class="box"><span class="small muted">You earn</span><strong style="color:var(--green)">${K(pe)}</strong></div><span class="op">+</span>
          <div class="box"><span class="small muted">Platform</span><strong style="color:var(--copper)">${K(pl)}</strong></div>
        </div>
        <div class="split-bar" role="img" aria-label="70% photographer, 30% platform"><span style="flex:70"></span><span style="flex:30"></span></div>
        <div class="spread small muted" style="margin-top:6px"><span>Photographer 70%</span><span>Platform 30%</span></div>
      </div>
      <div class="card">
        <h3>Earnings calculator</h3>
        <div class="form-grid">
          <div class="field"><label for="calc-price">Average sale price (K)</label><input id="calc-price" type="number" min="10" value="50"></div>
          <div class="field"><label for="calc-sales">Sales per month</label><input id="calc-sales" type="number" min="0" value="20"></div>
          <div class="field full"><label for="calc-plan">Plan</label><select id="calc-plan">${Object.values(PLANS).map((p) => `<option value="${p.id}" ${p.id === "professional" ? "selected" : ""}>${p.name} · ${K(p.price)}/month</option>`).join("")}</select></div>
        </div>
        <div id="calc-out" style="margin-top:16px"></div>
      </div>
    </div></section>

    <section class="section" style="padding-top:0"><div class="container">
      <span class="eyebrow">Photo licence prices</span><h2>What customers pay</h2>
      <p class="muted">Use platform pricing, or set your own price within each licence's range.</p>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Licence</th><th>Permitted use</th><th class="num">Platform price</th><th class="num">Your range</th><th class="num">You earn (platform price)</th></tr></thead><tbody>
        ${Object.values(LICENCES).map((L) => `<tr><td><strong>${L.name}</strong></td><td>${L.summary}</td><td class="num">${K(L.default)}</td><td class="num">${K(L.min)} to ${K(L.max)}</td><td class="num">${K(L.default * COMMISSION.photographer)}</td></tr>`).join("")}
      </tbody></table></div>
    </div></section>

    <section class="section" style="padding-top:0"><div class="container faq">
      <h2>Photographer questions</h2>
      <details><summary>When can I withdraw my earnings?</summary><p>Each sale is held for ${HOLD_DAYS} days to cover the refund window, then moves to your available balance. Withdraw any amount from ${K(MIN_PAYOUT)} to MTN MoMo, Airtel Money or Zamtel Kwacha. Payouts are processed within 48 hours.</p></details>
      <details><summary>Who pays the mobile money and card fees?</summary><p>Zed Photos pays them out of its 30% share. Your 70% is calculated on the full price the customer paid.</p></details>
      <details><summary>What happens if a customer gets a refund?</summary><p>Customers can ask for a refund within ${HOLD_DAYS} days if they haven't downloaded the file, or if it's faulty. A refunded sale is reversed from your pending balance, so it never touches money you've already withdrawn.</p></details>
      <details><summary>What about tax?</summary><p>Prices customers see include any applicable taxes. You're responsible for declaring your earnings to ZRA, and we give you a downloadable annual earnings statement to help.</p></details>
      <details><summary>Do I need model releases?</summary><p>Personal and business licences can be sold for photos of people taken in public. Premium commercial licences, such as advertising and billboards, are only available when you upload a signed model release for each identifiable person.</p></details>
      <details><summary>Do I keep the copyright?</summary><p>Yes. You always own your photographs. Customers buy a licence to use them; they never buy the copyright.</p></details>
    </div></section>`;
  }

  function viewBusiness() {
    const packs = [
      { name: "Team 10", n: 10, price: 400, note: "10 business licences · K40 each" },
      { name: "Agency 25", n: 25, price: 875, note: "25 business licences · K35 each" },
      { name: "Enterprise", n: 0, price: 0, note: "Unlimited business licences, premium on request" },
    ];
    return `
    <section class="container page-head">
      <span class="eyebrow">Business accounts</span>
      <h1>Licensing for teams that publish every day</h1>
      <p class="lead">Built for marketing agencies, newspapers, tourism operators, event organisers and corporate communications teams who need authentic Zambian images quickly and legally.</p>
    </section>
    <section class="section-tight"><div class="container grid-4">
      ${[["briefcase", "Shared credits", "Buy licences in bulk and share them across your team."], ["wallet", "Pay by invoice", "Monthly invoices with company details, payable by bank transfer or mobile money."], ["shield", "Clearance on file", "Model releases and licence certificates stored against every download."], ["camera", "Commission a shoot", "Brief our verified photographers for custom shoots anywhere in Zambia."]]
        .map(([i, t, d]) => `<div class="card"><div class="feature-icon">${icon(i)}</div><h3>${t}</h3><p class="muted small" style="margin:0">${d}</p></div>`).join("")}
    </div></section>
    <section class="section"><div class="container">
      <h2>Bulk licence packs</h2>
      <div class="plans" style="margin-top:20px">${packs.map((p, i) => `<div class="plan ${i === 1 ? "featured" : ""}">${i === 1 ? '<span class="ribbon">Best value</span>' : ""}<h3>${p.name}</h3><p class="price">${p.price ? K(p.price) : "Custom"}</p><p class="muted">${p.note}</p><a class="btn ${i === 1 ? "btn-copper" : "btn-primary"} btn-block" href="#/business" data-pack="${p.name}">${p.price ? "Request this pack" : "Talk to sales"}</a></div>`).join("")}</div>
    </div></section>
    <section class="section" style="padding-top:0" id="business-form"><div class="container" style="max-width:760px">
      <form class="card" id="biz-form">
        <h2>Open a business account</h2>
        <div class="form-grid">
          <div class="field"><label for="b-org">Organisation</label><input id="b-org" type="text" required></div>
          <div class="field"><label for="b-type">Type</label><select id="b-type"><option>Marketing agency</option><option>Newspaper / media</option><option>Tourism operator</option><option>Event organiser</option><option>Corporate communications</option><option>NGO / government</option></select></div>
          <div class="field"><label for="b-name">Contact name</label><input id="b-name" type="text" required></div>
          <div class="field"><label for="b-phone">Phone</label><input id="b-phone" type="tel" required></div>
          <div class="field"><label for="b-pack">Interested in</label><select id="b-pack">${packs.map((p) => `<option>${p.name}</option>`).join("")}</select></div>
          <div class="field"><label for="b-vol">Images per month</label><input id="b-vol" type="number" min="1" value="10"></div>
          <div class="field full"><label for="b-notes">What do you publish?</label><textarea id="b-notes" rows="3"></textarea></div>
        </div>
        <button class="btn btn-copper" type="submit" style="margin-top:16px">Request account</button>
      </form>
    </div></section>`;
  }

  function viewLicensing(params) {
    const report = params.get("report") || "";
    return `
    <section class="container page-head">
      <span class="eyebrow">Licensing, copyright & consent</span>
      <h1>Clear licences. Protected photographers.</h1>
      <p class="lead">Every image on Zed Photos is sold under one of three licences. The price depends on how you'll use the image, not on file size.</p>
    </section>
    <section class="section-tight"><div class="container grid-3">
      ${Object.values(LICENCES).map((L) => `<div class="card"><span class="badge badge-copper">${K(L.min)} to ${L.id === "premium" ? K(300) + "+" : K(L.max)}</span><h3 style="margin-top:10px">${L.name}</h3><p class="muted small">${L.summary}</p><ul style="padding-left:18px;margin:0">${L.rights.map((r) => `<li class="small">${r}</li>`).join("")}</ul></div>`).join("")}
    </div></section>
    <section class="section"><div class="container grid-2" style="align-items:start">
      <div>
        <h2>How we protect photographers</h2>
        <div class="steps" style="margin-top:12px">
          <div class="step"><p><strong>Watermarked previews.</strong> Only paying customers receive the clean original.</p></div>
          <div class="step"><p><strong>Photographer verification.</strong> We confirm the NRC or company registration of every seller before they get a Verified badge.</p></div>
          <div class="step"><p><strong>Model releases.</strong> Photos of identifiable people need a signed release before they can be sold for premium commercial use.</p></div>
          <div class="step"><p><strong>Takedown within 48 hours.</strong> Images reported as stolen or posted without consent are hidden while we review them.</p></div>
        </div>
        <h2 style="margin-top:32px">Refunds</h2>
        <p class="muted">Ask for a refund within ${HOLD_DAYS} days of purchase if you haven't downloaded the file or the file is faulty. Refunds go back to the mobile money wallet or card you paid with.</p>
      </div>
      <form class="card" id="report-form">
        <h2>Report an image</h2>
        <p class="muted small">Your photo was uploaded by someone else, or you appear in a photo without consent? Tell us and we'll act fast.</p>
        <div class="form-grid">
          <div class="field full"><label for="r-id">Image ID</label><input id="r-id" type="text" required value="${esc(report)}" placeholder="e.g. zp-1001"></div>
          <div class="field full"><label for="r-reason">Reason</label><select id="r-reason"><option>This is my photograph (copyright)</option><option>I appear in it without consent</option><option>Offensive or harmful content</option><option>Wrong location or description</option></select></div>
          <div class="field full"><label for="r-details">Details</label><textarea id="r-details" rows="3" required></textarea></div>
          <div class="field full"><label for="r-contact">Your phone or email</label><input id="r-contact" type="text" required></div>
        </div>
        <button class="btn btn-primary" type="submit" style="margin-top:16px">${icon("flag")}Submit report</button>
      </form>
    </div></section>`;
  }

  function viewPhotographer(id) {
    const ph = photographerById(id);
    if (!ph) return viewNotFound();
    const photos = allPhotos().filter((p) => p.by === id);
    const dl = photos.reduce((s, p) => s + (p.downloads || 0), 0);
    return `
    <section class="container page-head">
      <div class="dash-head">
        <span class="avatar lg" style="background:${ph.color}">${initials(ph.name)}</span>
        <div><h1 style="font-size:2rem;margin:0">${esc(ph.name)} ${ph.verified ? `<span class="badge badge-green" style="vertical-align:middle">${icon("check")}Verified</span>` : ""}</h1>
        <p class="muted" style="margin:4px 0 0">${icon("pin")} ${esc(ph.town)} · ${photos.length} photos · ${dl.toLocaleString()} downloads · ${esc(PLANS[ph.plan].name)} member</p></div>
      </div>
      <p class="lead" style="margin-top:16px">${esc(ph.bio || "")}</p>
    </section>
    <section class="container">${photos.length ? `<div class="photo-grid">${photos.map(photoCard).join("")}</div>` : `<div class="empty"><p class="muted">No photos listed yet.</p></div>`}</section>`;
  }

  // ---------------------------------------------------------------------------
  // Photographer dashboard
  // ---------------------------------------------------------------------------
  function currentPhotographer() {
    return state.user && photographerById(state.user.photographerId);
  }
  function mySales(phId) {
    const seeded = PHOTOGRAPHERS.some((p) => p.id === phId) ? ZP.seedSales(phId, PHOTOS, new Date()) : [];
    const live = state.sales.filter((s) => photoById(s.photoId) && photoById(s.photoId).by === phId);
    return live.concat(seeded).sort((a, b) => b.date.localeCompare(a.date));
  }
  function balances(phId, sales) {
    const cutoff = Date.now() - HOLD_DAYS * 864e5;
    const total = sales.reduce((s, x) => s + x.earning, 0);
    const pending = sales.filter((x) => new Date(x.date).getTime() > cutoff).reduce((s, x) => s + x.earning, 0);
    const paid = state.payouts.filter((p) => p.by === phId).reduce((s, p) => s + p.amount, 0);
    return { total, pending, paid, available: Math.max(0, total - pending - paid) };
  }

  function viewJoin(params) {
    const plan = params.get("plan") || "professional";
    return `
    <section class="container page-head center"><span class="eyebrow">Photographer dashboard</span><h1>Start selling your photos</h1><p class="lead" style="margin:0 auto">Create your photographer account, or explore a demo dashboard first.</p></section>
    <section class="container grid-2" style="align-items:start;margin-top:24px">
      <form class="card" id="join-form">
        <h2>Create your account</h2>
        <div class="form-grid">
          <div class="field full"><label for="j-name">Name or studio name</label><input id="j-name" type="text" required></div>
          <div class="field"><label for="j-town">Town</label><input id="j-town" type="text" required placeholder="e.g. Kabwe"></div>
          <div class="field"><label for="j-plan">Plan</label><select id="j-plan">${Object.values(PLANS).map((p) => `<option value="${p.id}" ${p.id === plan ? "selected" : ""}>${p.name} · ${K(p.price)}/month</option>`).join("")}</select></div>
          <div class="field full"><label>Payout wallet</label>${payMethods("network", "mtn", false)}</div>
          <div class="field full"><label for="j-phone">Mobile money number</label><input id="j-phone" type="tel" required placeholder="096 123 4567"><span class="error hidden" id="j-phone-error"></span></div>
          <div class="field full"><label for="j-bio">Short bio</label><textarea id="j-bio" rows="2" placeholder="What do you photograph?"></textarea></div>
        </div>
        <label class="check" style="margin-top:14px"><input type="checkbox" required> <span>I'll only upload photos I took myself, and I'll hold model releases where I say I do.</span></label>
        <button class="btn btn-copper btn-block" type="submit" style="margin-top:16px">Subscribe and continue</button>
        <p class="small muted center" style="margin-top:8px">Demo only: no subscription is charged.</p>
      </form>
      <div class="card-soft">
        <h2>Explore the demo</h2>
        <p class="muted">See the dashboard as <strong>Mutale Chanda</strong>, a Lusaka wedding and events photographer on the Professional plan, with sales history, analytics and payouts.</p>
        <button class="btn btn-primary" id="demo-login">Open demo dashboard</button>
        <hr style="border:0;border-top:1px solid var(--line);margin:24px 0">
        <h3>What you get</h3>
        <ul style="padding-left:18px;color:var(--ink-2)"><li>Views, downloads and conversion for every photo</li><li>Monthly income and best sellers</li><li>Available, pending and paid-out balances</li><li>Mobile money withdrawals from ${K(MIN_PAYOUT)}</li></ul>
      </div>
    </section>`;
  }

  function viewDashboard(params) {
    const ph = currentPhotographer();
    if (!ph) return viewJoin(params);
    const tab = params.get("tab") || "overview";
    const photos = allPhotos().filter((p) => p.by === ph.id);
    const sales = mySales(ph.id);
    const b = balances(ph.id, sales);
    const plan = PLANS[ph.plan];
    const views = photos.reduce((s, p) => s + (p.views || 0) + (state.views[p.id] || 0), 0);
    const downloads = sales.length;
    const conv = views ? (downloads / views) * 100 : 0;
    const now = new Date();
    const thisMonth = sales.filter((s) => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const tabs = [["overview", "Overview"], ["photos", "My photos"], ["sales", "Sales"], ["payouts", "Payouts"], ["plan", "Subscription"]];
    const perPhoto = photos.map((p) => {
      const s = sales.filter((x) => x.photoId === p.id);
      const v = (p.views || 0) + (state.views[p.id] || 0);
      return { p, v, n: s.length, earned: s.reduce((t, x) => t + x.earning, 0) };
    }).sort((a, b2) => b2.earned - a.earned);

    let body = "";
    if (tab === "overview") {
      body = `
      <div class="grid-4">
        <div class="kpi"><div class="label">Available to withdraw</div><div class="value">${K(b.available.toFixed(2))}</div><div class="sub">${K(b.pending.toFixed(2))} pending (${HOLD_DAYS}-day hold)</div></div>
        <div class="kpi"><div class="label">Earned this month</div><div class="value">${K(thisMonth.reduce((s, x) => s + x.earning, 0).toFixed(2))}</div><div class="sub">${thisMonth.length} sales</div></div>
        <div class="kpi"><div class="label">Portfolio views</div><div class="value">${views.toLocaleString()}</div><div class="sub">${photos.length} active photos</div></div>
        <div class="kpi"><div class="label">Conversion rate</div><div class="value">${conv.toFixed(1)}%</div><div class="sub">${downloads} downloads ÷ views</div></div>
      </div>
      <div class="grid-2" style="margin-top:20px;align-items:start">
        <div class="card"><div class="spread"><h3 style="margin:0">Monthly earnings</h3><span class="small muted">Your 70% share, last 6 months</span></div><div class="chart" id="earn-chart" style="margin-top:12px"></div></div>
        <div class="card"><h3>Best-selling images</h3><div class="table-wrap"><table class="table"><thead><tr><th>Photo</th><th class="num">Sales</th><th class="num">Earned</th></tr></thead><tbody>
          ${perPhoto.slice(0, 5).map((x) => `<tr><td><a href="#/photo/${x.p.id}">${esc(x.p.title)}</a></td><td class="num">${x.n}</td><td class="num">${K(x.earned.toFixed(2))}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">No sales yet. <a href="#/upload">Upload photos</a> to start selling.</td></tr>`}
        </tbody></table></div></div>
      </div>`;
    } else if (tab === "photos") {
      body = `<div class="spread" style="margin-bottom:12px"><p class="muted" style="margin:0">${photos.length} of ${plan.limit.toLocaleString()} active photos on your ${plan.name} plan</p><a class="btn btn-copper" href="#/upload">${icon("upload")}Upload photos</a></div>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Photo</th><th>Category</th><th class="num">Views</th><th class="num">Sales</th><th class="num">Conversion</th><th class="num">Earned</th><th></th></tr></thead><tbody>
        ${perPhoto.map((x) => `<tr><td><a href="#/photo/${x.p.id}">${esc(x.p.title)}</a><div class="small muted">${esc(x.p.id)} · from ${K(fromPrice(x.p))}</div></td><td>${esc(catName(x.p.category))}</td><td class="num">${x.v.toLocaleString()}</td><td class="num">${x.n}</td><td class="num">${x.v ? ((x.n / x.v) * 100).toFixed(1) : "0.0"}%</td><td class="num">${K(x.earned.toFixed(2))}</td><td>${x.p.src ? `<button class="btn btn-ghost btn-icon" data-unlist="${x.p.id}" aria-label="Remove photo">${icon("trash")}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">No photos yet.</td></tr>`}
      </tbody></table></div>`;
    } else if (tab === "sales") {
      body = `<div class="card table-wrap"><table class="table"><thead><tr><th>Date</th><th>Photo</th><th>Licence</th><th>Buyer</th><th class="num">Price</th><th class="num">Your 70%</th><th>Status</th></tr></thead><tbody>
        ${sales.slice(0, 60).map((s) => { const p = photoById(s.photoId); const pend = new Date(s.date).getTime() > Date.now() - HOLD_DAYS * 864e5; return `<tr><td>${fmtDate(s.date)}</td><td>${esc(p ? p.title : s.photoId)}</td><td>${LICENCES[s.licence].short}</td><td>${esc(s.buyer)}</td><td class="num">${K(s.price)}</td><td class="num">${K(s.earning.toFixed(2))}</td><td>${pend ? '<span class="badge badge-copper">Pending</span>' : '<span class="badge badge-green">Cleared</span>'}</td></tr>`; }).join("") || `<tr><td colspan="7" class="muted">No sales yet.</td></tr>`}
      </tbody></table></div>`;
    } else if (tab === "payouts") {
      const mine = state.payouts.filter((p) => p.by === ph.id).slice().reverse();
      body = `<div class="grid-2" style="align-items:start">
        <form class="card" id="payout-form">
          <h3>Withdraw to mobile money</h3>
          <div class="grid-2" style="gap:10px;margin-bottom:16px">
            <div class="kpi"><div class="label">Available</div><div class="value">${K(b.available.toFixed(2))}</div></div>
            <div class="kpi"><div class="label">Pending</div><div class="value">${K(b.pending.toFixed(2))}</div></div>
          </div>
          <div class="field"><label for="po-amt">Amount (K)</label><input id="po-amt" type="number" min="${MIN_PAYOUT}" step="1" max="${Math.floor(b.available)}" value="${Math.floor(b.available)}"><span class="hint">Minimum ${K(MIN_PAYOUT)}. Paid to ${esc(PAY_NETWORKS[state.user.network].name)} ${esc(state.user.phone)} within 48 hours.</span></div>
          <button class="btn btn-green btn-block" type="submit" style="margin-top:14px" ${b.available < MIN_PAYOUT ? "disabled" : ""}>${icon("wallet")}Request payout</button>
        </form>
        <div class="card"><h3>Payout history</h3><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Reference</th><th>Wallet</th><th class="num">Amount</th></tr></thead><tbody>
          ${mine.map((p) => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.id)}</td><td>${esc(PAY_NETWORKS[p.network].name)}</td><td class="num">${K(p.amount)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">No payouts yet.</td></tr>`}
        </tbody></table></div><p class="small muted">Lifetime earnings: ${K(b.total.toFixed(2))} · Paid out: ${K(b.paid.toFixed(2))}</p></div>
      </div>`;
    } else if (tab === "plan") {
      const pct = Math.min(100, (photos.length / plan.limit) * 100);
      body = `<div class="card" style="margin-bottom:20px"><div class="spread"><div><h3 style="margin:0">${plan.name} plan · ${K(plan.price)}/month</h3><p class="muted small" style="margin:0">Renews monthly via ${esc(PAY_NETWORKS[state.user.network].name)}</p></div><span class="badge badge-green">Active</span></div>
        <div class="meter" aria-label="Photo limit used"><span style="width:${pct}%"></span></div><p class="small muted" style="margin-top:6px">${photos.length} of ${plan.limit.toLocaleString()} active photos used</p></div>
        ${planCards((pl) => pl.id === plan.id ? `<button class="btn btn-ghost btn-block" disabled>Current plan</button>` : `<button class="btn btn-primary btn-block" data-plan="${pl.id}">Switch to ${pl.name}</button>`)}`;
    }

    return `
    <section class="container page-head">
      <div class="spread">
        <div class="dash-head"><span class="avatar lg" style="background:${ph.color}">${initials(ph.name)}</span>
          <div><span class="eyebrow" style="margin:0">Photographer dashboard</span><h1 style="font-size:1.9rem;margin:0">${esc(ph.name)}</h1><p class="muted small" style="margin:0">${esc(plan.name)} plan · ${esc(ph.town)} · <a href="#/photographer/${ph.id}">public profile</a></p></div></div>
        <div class="row"><a class="btn btn-copper" href="#/upload">${icon("upload")}Upload</a><button class="btn btn-ghost" id="logout">Sign out</button></div>
      </div>
      <nav class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" class="${id === tab ? "active" : ""}" data-tab="${id}">${l}</button>`).join("")}</nav>
      ${body}
    </section>`;
  }

  function earningsChart(el, sales) {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.getFullYear() + "-" + d.getMonth(), label: d.toLocaleDateString("en-GB", { month: "short" }), long: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), v: 0, n: 0 });
    }
    sales.forEach((s) => { const d = new Date(s.date); const m = months.find((x) => x.key === d.getFullYear() + "-" + d.getMonth()); if (m) { m.v += s.earning; m.n++; } });
    const W = 520, H = 220, pl = 44, pb = 26, pt = 10;
    const max = Math.max(50, ...months.map((m) => m.v));
    const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
    const top = Math.ceil(max / step) * step;
    const y = (v) => pt + (H - pt - pb) * (1 - v / top);
    const bw = ((W - pl) / months.length) * 0.5;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly earnings bar chart"><g class="grid">`;
    for (let v = 0; v <= top; v += step) svg += `<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">K${v}</text>`;
    svg += `</g>`;
    months.forEach((m, i) => {
      const cx = pl + ((W - pl) / months.length) * (i + 0.5), h = H - pb - y(m.v), x = cx - bw / 2, yy = y(m.v), r = Math.min(4, h);
      const d = h > 0 ? `M${x} ${H - pb} V${yy + r} Q${x} ${yy} ${x + r} ${yy} H${x + bw - r} Q${x + bw} ${yy} ${x + bw} ${yy + r} V${H - pb} Z` : "";
      svg += `<path class="bar" data-i="${i}" d="${d}"/>`;
      svg += `<rect class="bar-hit" data-i="${i}" x="${cx - (W - pl) / months.length / 2}" y="${pt}" width="${(W - pl) / months.length}" height="${H - pt - pb}" fill="transparent"/>`;
      svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">${m.label}</text>`;
    });
    svg += `<line x1="${pl}" x2="${W}" y1="${H - pb}" y2="${H - pb}" stroke="var(--ink-2)"/></svg><div class="tooltip" id="chart-tip"></div>`;
    el.innerHTML = svg;
    const tip = el.querySelector("#chart-tip");
    el.querySelectorAll(".bar-hit").forEach((hit) => {
      const i = +hit.dataset.i, m = months[i], bar = el.querySelector(`.bar[data-i="${i}"]`);
      hit.addEventListener("mouseenter", () => {
        bar.classList.add("hover");
        const svgEl = el.querySelector("svg"), scale = svgEl.getBoundingClientRect().width / W;
        const cx = pl + ((W - pl) / months.length) * (i + 0.5);
        tip.innerHTML = `<strong>${m.long}</strong><br>${K(m.v.toFixed(2))} from ${m.n} sale${m.n === 1 ? "" : "s"}`;
        tip.style.left = cx * scale + "px"; tip.style.top = y(m.v) * scale + "px"; tip.classList.add("show");
      });
      hit.addEventListener("mouseleave", () => { bar.classList.remove("hover"); tip.classList.remove("show"); });
    });
  }

  function viewUpload() {
    const ph = currentPhotographer();
    if (!ph) { location.hash = "#/dashboard"; return ""; }
    const plan = PLANS[ph.plan];
    const used = allPhotos().filter((p) => p.by === ph.id).length;
    return `
    <section class="container page-head"><div class="breadcrumbs"><a href="#/dashboard">Dashboard</a> / Upload</div><h1 style="font-size:2rem">Upload photos</h1><p class="muted">${used} of ${plan.limit.toLocaleString()} active photos used on your ${plan.name} plan.</p></section>
    <section class="container" style="max-width:860px">
      <form class="card" id="upload-form" novalidate>
        <label class="dropzone" id="dropzone" for="u-files">
          ${icon("upload")}<p style="margin:8px 0 0"><strong>Drop photos here or click to choose</strong></p><p class="small muted" style="margin:0">JPEG or PNG. You can select several photos that share the same details.</p>
          <input id="u-files" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hidden">
        </label>
        <div class="upload-previews" id="previews"></div>
        <div class="form-grid" style="margin-top:20px">
          <div class="field full"><label for="u-title">Title</label><input id="u-title" type="text" required placeholder="e.g. Sunrise over Lake Kariba"><span class="hint">With several photos, each gets this title plus a number.</span></div>
          <div class="field"><label for="u-cat">Category</label><select id="u-cat">${CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
          <div class="field"><label for="u-loc">Location</label><input id="u-loc" type="text" required list="u-locs" placeholder="Town, park or landmark"><datalist id="u-locs">${Object.keys(PROVINCES).map((l) => `<option value="${l}">`).join("")}</datalist></div>
          <div class="field"><label for="u-date">Date taken</label><input id="u-date" type="date" class="input" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field"><label for="u-tags">Keywords</label><input id="u-tags" type="text" placeholder="sunrise, lake, boats"><span class="hint">Separate with commas. Add places, events and subjects.</span></div>
          <div class="field full"><label>People in the photo</label>
            <label class="check"><input type="checkbox" id="u-people"> <span>Identifiable people appear in this photo</span></label>
            <label class="check hidden" id="u-release-wrap"><input type="checkbox" id="u-release"> <span>I hold a signed model release for every identifiable person (unlocks premium commercial licences)</span></label>
          </div>
          <div class="field full"><label>Pricing</label>
            <label class="check"><input type="radio" name="pricing" value="platform" checked> <span>Use platform pricing (${Object.values(LICENCES).map((L) => `${L.short} ${K(L.default)}`).join(" · ")})</span></label>
            <label class="check"><input type="radio" name="pricing" value="custom"> <span>Set my own prices</span></label>
          </div>
          <div class="grid-3 full hidden" id="custom-prices">${Object.values(LICENCES).map((L) => `<div class="field"><label for="u-price-${L.id}">${L.short} (K${L.min} to K${L.max})</label><input id="u-price-${L.id}" type="number" min="${L.min}" max="${L.max}" value="${L.default}"></div>`).join("")}</div>
        </div>
        <label class="check" style="margin-top:18px"><input type="checkbox" id="u-own" required> <span>I took these photos and own the copyright. I understand that uploading other people's work leads to removal and account suspension.</span></label>
        <p class="error hidden" id="upload-error" style="color:var(--red);margin-top:12px"></p>
        <button class="btn btn-copper" type="submit" style="margin-top:18px">${icon("upload")}Publish photos</button>
      </form>
    </section>`;
  }

  function viewNotFound() {
    return `<section class="container page-head center"><h1>Page not found</h1><p class="muted">That page or photo doesn't exist.</p><a class="btn btn-primary" href="#/">Go home</a></section>`;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  function addToCart(photoId, licence) {
    const existing = state.cart.find((c) => c.photoId === photoId);
    if (existing) existing.licence = licence; else state.cart.push({ photoId, licence });
    save(); updateCartCount();
  }

  function validatePhone(raw, network) {
    const n = raw.replace(/\D/g, "").replace(/^260/, "0");
    if (!/^0[79]\d{8}$/.test(n)) return { error: "Enter a 10-digit Zambian number, e.g. 096 123 4567." };
    const net = PAY_NETWORKS[network];
    if (net && net.prefixes.length && !net.prefixes.includes(n.slice(0, 3))) return { error: `${net.name} numbers start with ${net.prefixes.join(" or ")}.` };
    return { phone: n };
  }

  function modal(html) {
    const back = document.createElement("div"); back.className = "modal-back";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(back); return back;
  }

  function downloadOriginal(p) {
    const name = `${p.id}-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const trigger = (href, ext) => { const a = document.createElement("a"); a.href = href; a.download = name + ext; document.body.appendChild(a); a.click(); a.remove(); };
    if (p.src) return trigger(p.src, p.src.startsWith("data:image/png") ? ".png" : ".jpg");
    const svg = ZP.scene(p, { uid: "dl", width: 3000 });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 3000; c.height = 2000;
      c.getContext("2d").drawImage(img, 0, 0, 3000, 2000);
      c.toBlob((blob) => { const u = URL.createObjectURL(blob); trigger(u, ".png"); setTimeout(() => URL.revokeObjectURL(u), 4000); URL.revokeObjectURL(url); }, "image/png");
    };
    img.onerror = () => trigger(url, ".svg");
    img.src = url;
  }

  function downloadCertificate(order, i) {
    const it = order.items[i], p = photoById(it.photoId), L = LICENCES[it.licence], ph = photographerById(p.by);
    const text = [
      "ZED PHOTOS — LICENCE CERTIFICATE", "================================", "",
      `Licence number : ${order.id}-${i + 1}`, `Issued         : ${fmtDate(order.date)}`, `Licensee       : ${order.name}${order.org ? " (" + order.org + ")" : ""}`, "",
      `Image          : ${p.title} (${p.id})`, `Photographer   : ${ph ? ph.name : ""}`, `Location       : ${p.location}, Zambia`, "",
      `Licence type   : ${L.name}`, `Price paid     : ${K(it.price)}`, "", "Permitted use:", ...L.rights.map((r) => "  - " + r), "",
      "The photographer keeps the copyright. This licence is non-exclusive and cannot be transferred or resold.",
      p.people ? (p.release ? "A model release is held for the identifiable people in this image." : "No model release is held. Do not use this image to imply endorsement by the people shown.") : "",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `licence-${order.id}-${i + 1}.txt`; a.click();
  }

  function resizeImage(file, maxSide) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const k = Math.min(1, maxSide / Math.max(img.width, img.height));
          const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Wiring per view
  // ---------------------------------------------------------------------------
  function bind(route, params) {
    app.querySelectorAll("form[data-search]").forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(f), cur = new URLSearchParams(route === "browse" ? params : "");
      for (const [k, v] of fd.entries()) { if (v) cur.set(k, v); else cur.delete(k); }
      location.hash = "#/browse?" + cur.toString();
    }));

    if (route === "browse") {
      document.getElementById("filters").addEventListener("change", (e) => {
        const cur = new URLSearchParams(params);
        const t = e.target;
        if (t.type === "checkbox") { t.checked ? cur.set(t.name, t.value) : cur.delete(t.name); }
        else if (t.value) cur.set(t.name, t.value); else cur.delete(t.name);
        location.hash = "#/browse?" + cur.toString();
      });
    }

    if (route === "photo") {
      const form = document.getElementById("buy-form");
      const id = location.hash.split("/")[2];
      const chosen = () => (form.querySelector("input[name=licence]:checked") || {}).value;
      form.addEventListener("submit", (e) => { e.preventDefault(); if (!chosen()) return; addToCart(id, chosen()); toast(`Added to cart: ${LICENCES[chosen()].name} licence`); });
      document.getElementById("buy-now").addEventListener("click", () => { if (!chosen()) return; addToCart(id, chosen()); location.hash = "#/checkout"; });
    }

    if (route === "cart") {
      app.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => { state.cart.splice(+b.dataset.remove, 1); save(); updateCartCount(); render(); }));
      app.querySelectorAll("[data-cart-licence]").forEach((s) => s.addEventListener("change", () => { state.cart[+s.dataset.cartLicence].licence = s.value; save(); render(); }));
    }

    if (route === "checkout") {
      const form = document.getElementById("checkout-form");
      if (!form) return;
      const sync = () => {
        const m = form.method.value;
        document.getElementById("phone-field").classList.toggle("hidden", m === "card");
        document.getElementById("card-fields").classList.toggle("hidden", m !== "card");
        const net = PAY_NETWORKS[m];
        form.phone.placeholder = net.prefixes.length ? net.prefixes[0] + " 123 4567" : "";
      };
      form.addEventListener("change", sync); sync();
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const err = document.getElementById("phone-error"); err.classList.add("hidden");
        if (!form.name.value.trim() || !/^\S+@\S+\.\S+$/.test(form.email.value)) return toast("Please enter your name and a valid email address.");
        const method = form.method.value;
        let phone = "";
        if (method !== "card") {
          const v = validatePhone(form.phone.value, method);
          if (v.error) { err.textContent = v.error; err.classList.remove("hidden"); form.phone.focus(); return; }
          phone = v.phone;
        } else if (document.getElementById("co-card").value.replace(/\D/g, "").length < 12) return toast("Please enter a valid card number.");
        if (!form.agree.checked) return toast("Please accept the licence terms.");
        const { items, total } = cartTotals();
        const m = modal(method === "card"
          ? `<div class="spinner"></div><h3>Processing card payment…</h3><p class="muted">${K(total)}</p>`
          : `<div class="spinner"></div><h3>Check your phone</h3><p class="muted">Approve the ${K(total)} payment prompt from <strong>Zed Photos</strong> on ${esc(phone)} by entering your ${esc(PAY_NETWORKS[method].name)} PIN.</p>`);
        setTimeout(() => {
          const order = {
            id: uid("ZP-"), date: new Date().toISOString(), name: form.name.value.trim(), email: form.email.value.trim(), org: form.org.value.trim(),
            method, phone, total, items: items.map((c) => ({ photoId: c.photo.id, licence: c.licence, price: c.photo.prices[c.licence] })),
          };
          state.orders.push(order);
          order.items.forEach((it) => state.sales.push({ id: uid("S"), photoId: it.photoId, licence: it.licence, price: it.price, earning: +(it.price * COMMISSION.photographer).toFixed(2), date: order.date, buyer: order.org || order.name }));
          state.cart = []; save(); updateCartCount(); m.remove();
          location.hash = "#/order/" + order.id;
        }, 2600);
      });
    }

    if (route === "order") {
      app.querySelectorAll("[data-download]").forEach((b) => b.addEventListener("click", () => downloadOriginal(photoById(b.dataset.download))));
      app.querySelectorAll("[data-cert]").forEach((b) => b.addEventListener("click", () => downloadCertificate(state.orders.find((o) => o.id === b.dataset.order), +b.dataset.cert)));
    }

    if (route === "sell") {
      const out = document.getElementById("calc-out");
      const calc = () => {
        const price = Math.max(0, +document.getElementById("calc-price").value || 0), n = Math.max(0, +document.getElementById("calc-sales").value || 0);
        const plan = PLANS[document.getElementById("calc-plan").value];
        const gross = price * n * COMMISSION.photographer, net = gross - plan.price;
        out.innerHTML = `<div class="summary-line"><span>Your 70% of sales</span><strong>${K(gross.toFixed(2))}</strong></div><div class="summary-line"><span>${plan.name} subscription</span><span>−${K(plan.price)}</span></div><div class="summary-line total"><span>Monthly profit</span><span style="color:${net >= 0 ? "var(--green)" : "var(--red)"}">${net < 0 ? "−" : ""}${K(Math.abs(net).toFixed(2))}</span></div><p class="small muted" style="margin-top:8px">You cover your subscription after ${Math.ceil(plan.price / Math.max(0.01, price * COMMISSION.photographer))} sales a month.</p>`;
      };
      ["calc-price", "calc-sales", "calc-plan"].forEach((id) => document.getElementById(id).addEventListener("input", calc));
      calc();
    }

    if (route === "business") {
      app.querySelectorAll("[data-pack]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("b-pack").value = a.dataset.pack; document.getElementById("business-form").scrollIntoView(); document.getElementById("b-org").focus(); }));
      document.getElementById("biz-form").addEventListener("submit", (e) => { e.preventDefault(); toast("Thanks! Our business team will call you within one working day."); e.target.reset(); });
    }

    if (route === "licensing") {
      document.getElementById("report-form").addEventListener("submit", (e) => { e.preventDefault(); toast(`Report ${uid("ZP-R-")} received. We'll review it within 48 hours.`); e.target.reset(); });
    }

    if (route === "dashboard") {
      const join = document.getElementById("join-form");
      if (join) {
        document.getElementById("demo-login").addEventListener("click", () => {
          state.user = { name: "Mutale Chanda", photographerId: "p1", phone: "0961234567", network: "mtn", demo: true };
          save(); location.hash = "#/dashboard"; render();
        });
        join.addEventListener("submit", (e) => {
          e.preventDefault();
          const err = document.getElementById("j-phone-error"); err.classList.add("hidden");
          if (!join.checkValidity()) return join.reportValidity();
          const network = join.network.value;
          const v = validatePhone(document.getElementById("j-phone").value, network);
          if (v.error) { err.textContent = v.error; err.classList.remove("hidden"); return; }
          const id = uid("u");
          const name = document.getElementById("j-name").value.trim();
          state.photographers.push({ id, name, town: document.getElementById("j-town").value.trim(), plan: document.getElementById("j-plan").value, color: ["#b8682b", "#1e8c45", "#2a5d8f", "#d7262e"][Math.floor(Math.random() * 4)], verified: false, joined: new Date().toISOString().slice(0, 7), bio: document.getElementById("j-bio").value.trim() });
          state.user = { name, photographerId: id, phone: v.phone, network };
          save(); toast("Welcome to Zed Photos! Upload your first photos to start selling."); location.hash = "#/upload";
        });
        return;
      }
      app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { location.hash = "#/dashboard?tab=" + b.dataset.tab; }));
      document.getElementById("logout").addEventListener("click", () => { state.user = null; save(); location.hash = "#/"; });
      const chart = document.getElementById("earn-chart");
      if (chart) earningsChart(chart, mySales(state.user.photographerId));
      app.querySelectorAll("[data-plan]").forEach((b) => b.addEventListener("click", () => {
        const ph = currentPhotographer(), used = allPhotos().filter((p) => p.by === ph.id).length, target = PLANS[b.dataset.plan];
        if (used > target.limit) return toast(`You have ${used} photos; ${target.name} allows ${target.limit}. Remove some first.`);
        ph.plan = target.id;
        const custom = state.photographers.find((p) => p.id === ph.id); if (custom) custom.plan = target.id;
        save(); toast(`You're now on the ${target.name} plan.`); render();
      }));
      app.querySelectorAll("[data-unlist]").forEach((b) => b.addEventListener("click", () => {
        if (!confirm("Remove this photo from sale?")) return;
        state.uploads = state.uploads.filter((p) => p.id !== b.dataset.unlist); save(); render();
      }));
      const po = document.getElementById("payout-form");
      if (po) po.addEventListener("submit", (e) => {
        e.preventDefault();
        const ph = currentPhotographer(), b2 = balances(ph.id, mySales(ph.id)), amt = Math.floor(+document.getElementById("po-amt").value || 0);
        if (amt < MIN_PAYOUT) return toast(`The minimum payout is ${K(MIN_PAYOUT)}.`);
        if (amt > b2.available) return toast(`You can withdraw up to ${K(b2.available.toFixed(2))}.`);
        state.payouts.push({ id: uid("PO-"), by: ph.id, amount: amt, network: state.user.network, phone: state.user.phone, date: new Date().toISOString() });
        save(); toast(`${K(amt)} is on its way to your ${PAY_NETWORKS[state.user.network].name} wallet.`); render();
      });
    }

    if (route === "upload") {
      const form = document.getElementById("upload-form");
      if (!form) return;
      let files = [];
      const input = document.getElementById("u-files"), dz = document.getElementById("dropzone"), prev = document.getElementById("previews");
      const show = () => { prev.innerHTML = ""; files.forEach((f) => { const d = document.createElement("div"); const im = document.createElement("img"); im.src = URL.createObjectURL(f); d.appendChild(im); prev.appendChild(d); }); };
      input.addEventListener("change", () => { files = [...input.files]; show(); });
      ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
      ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
      dz.addEventListener("drop", (e) => { files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")); show(); });
      const people = document.getElementById("u-people");
      people.addEventListener("change", () => document.getElementById("u-release-wrap").classList.toggle("hidden", !people.checked));
      form.addEventListener("change", () => document.getElementById("custom-prices").classList.toggle("hidden", form.pricing.value !== "custom"));
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errEl = document.getElementById("upload-error");
        const fail = (m) => { errEl.textContent = m; errEl.classList.remove("hidden"); };
        errEl.classList.add("hidden");
        const ph = currentPhotographer(), plan = PLANS[ph.plan];
        const used = allPhotos().filter((p) => p.by === ph.id).length;
        const title = document.getElementById("u-title").value.trim(), loc = document.getElementById("u-loc").value.trim();
        if (!files.length) return fail("Choose at least one photo.");
        if (!title || !loc) return fail("Add a title and location so customers can find your photo.");
        if (!document.getElementById("u-own").checked) return fail("Please confirm you own the copyright.");
        if (used + files.length > plan.limit) return fail(`Your ${plan.name} plan allows ${plan.limit} active photos. Upgrade your plan to add more.`);
        const prices = {};
        for (const L of Object.values(LICENCES)) {
          const v = form.pricing.value === "custom" ? Math.round(+document.getElementById("u-price-" + L.id).value) : L.default;
          if (!(v >= L.min && v <= L.max)) return fail(`${L.short} price must be between K${L.min} and K${L.max}.`);
          prices[L.id] = v;
        }
        const btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Publishing…";
        try {
          const added = [];
          for (let i = 0; i < files.length; i++) {
            const src = await resizeImage(files[i], 1600);
            added.push({
              id: uid("zp-u"), title: files.length > 1 ? `${title} ${i + 1}` : title, category: document.getElementById("u-cat").value, location: loc, by: ph.id,
              tags: document.getElementById("u-tags").value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
              people: people.checked, release: people.checked && document.getElementById("u-release").checked,
              prices, views: 0, downloads: 0, featured: false, date: document.getElementById("u-date").value || new Date().toISOString().slice(0, 10), src,
            });
          }
          state.uploads.push(...added);
          if (!save()) { state.uploads.splice(-added.length); btn.disabled = false; btn.textContent = "Publish photos"; return; }
          toast(`${added.length} photo${added.length > 1 ? "s" : ""} published.`);
          location.hash = "#/dashboard?tab=photos";
        } catch (err) { btn.disabled = false; btn.textContent = "Publish photos"; fail("One of those files couldn't be read. Try a JPEG or PNG."); }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  function render() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query || "");
    const route = parts[0] || "home";
    const views = {
      home: () => viewHome(),
      browse: () => viewBrowse(params),
      photo: () => viewPhoto(parts[1]),
      photographer: () => viewPhotographer(parts[1]),
      cart: () => viewCart(),
      checkout: () => viewCheckout(),
      order: () => viewOrder(parts[1]),
      orders: () => viewOrders(),
      sell: () => viewSell(),
      business: () => viewBusiness(),
      licensing: () => viewLicensing(params),
      dashboard: () => viewDashboard(params),
      upload: () => viewUpload(),
    };
    mediaSeq = 0;
    app.innerHTML = (views[route] || viewNotFound)();
    document.querySelectorAll(".main-nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
    document.querySelector(".main-nav").classList.remove("open");
    const titles = { home: "Authentic Zambian photography", browse: "Browse photos", sell: "Sell your photos", business: "Business accounts", licensing: "Licensing", dashboard: "Dashboard", cart: "Cart", checkout: "Checkout", upload: "Upload" };
    document.title = "Zed Photos · " + (titles[route] || "Marketplace");
    window.scrollTo(0, 0);
    bind(route, params);
  }

  document.getElementById("menu-toggle").addEventListener("click", () => document.querySelector(".main-nav").classList.toggle("open"));
  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", render);
  updateCartCount();
  render();
})();
