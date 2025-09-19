// Auto-index posts from /posts using GitHub REST API (no manual array).
// Works on public repos. If your repo is private, use a manifest file instead.

const $ = (s)=>document.querySelector(s);

function applyTheme(theme){
  if(theme === "light"){ document.documentElement.classList.add("light"); }
  else{ document.documentElement.classList.remove("light"); }
  localStorage.setItem("theme", theme);
}
function initTheme(){
  const saved = localStorage.getItem("theme");
  if(saved){ applyTheme(saved); return; }
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(prefersLight ? "light" : "dark");
}

function detectOwnerRepo(){
  // Allow override via data attributes on <body data-owner data-repo>
  const b = document.body;
  const dataOwner = b?.dataset?.owner;
  const dataRepo  = b?.dataset?.repo;
  if(dataOwner && dataRepo) return {owner:dataOwner, repo:dataRepo};

  // Heurística para User/Org Pages: {user}.github.io
  const host = location.hostname; // e.g., mortensudoers.github.io
  const m = host.match(/^([a-z0-9-]+)\.github\.io$/i);
  if(m){
    const owner = m[1];
    return {owner, repo: owner + ".github.io"};
  }

  // Heurística para Project Pages (user.github.io/repo)
  const pathParts = location.pathname.split("/").filter(Boolean);
  if(pathParts.length > 0){
    const repo = pathParts[0];
    // Best effort: assume owner == host subdomain before .github.io (if present)
    const sub = host.split(".")[0];
    return {owner: sub, repo};
  }
  // Fallback: require manual data attrs
  return {owner: "", repo: ""};
}

async function ghListMarkdown(owner, repo){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/posts?ref=main`;
  const res = await fetch(url, {headers:{'Accept':'application/vnd.github.v3+json'}});
  if(!res.ok) throw new Error("No se pudo listar /posts desde GitHub API");
  const items = await res.json();
  return items.filter(x => x.type === "file" && /\.md$/i.test(x.name)).map(x => ({
    name: x.name,
    slug: x.name.replace(/\.md$/i, ""),
    path: x.path
  }));
}

async function ghFetchRaw(owner, repo, path){
  // raw.githubusercontent.com/<owner>/<repo>/main/<path>
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  const res = await fetch(raw, {cache:"no-store"});
  if(!res.ok) throw new Error("No se pudo obtener el Markdown");
  return await res.text();
}

function firstHeading(md){
  const m = md.match(/^\s*#\s+(.+)\s*$/m) || md.match(/^\s*##\s+(.+)\s*$/m);
  return m ? m[1].trim() : null;
}

function excerpt(md, len=180){
  // Remove code blocks and headings for a cleaner excerpt
  const cleaned = md.replace(/```[\s\S]*?```/g, "").replace(/^#+\s.*$/gm, "").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, len) + (cleaned.length > len ? "…" : "");
}

function getQS(name){ return new URLSearchParams(location.search).get(name); }

function renderList(posts, filter=""){
  $("#postView").classList.add("hidden");
  const list = $("#postList");
  list.innerHTML = "";
  const f = (filter||"").trim().toLowerCase();
  const data = posts.filter(p => !f || (p.title?.toLowerCase().includes(f) || p.slug.toLowerCase().includes(f)));
  if(!data.length){ list.innerHTML = `<p>No se encontraron resultados para <b>${filter}</b>.</p>`; return; }
  for(const p of data){
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <h3><a href="?post=${encodeURIComponent(p.slug)}">${p.title || p.slug}</a></h3>
      <p>${p.excerpt || ""}</p>
      <div class="tags"><span class="tag">#markdown</span></div>
    `;
    list.appendChild(el);
  }
}

async function renderPost(owner, repo, slug){
  $("#postList").innerHTML = "";
  $("#postView").classList.remove("hidden");
  $("#postTitle").textContent = slug;
  $("#postDate").textContent = "";
  const path = `posts/${slug}.md`;
  try{
    const md = await ghFetchRaw(owner, repo, path);
    const title = firstHeading(md);
    if(title) $("#postTitle").textContent = title;
    const html = window.marked?.parse ? window.marked.parse(md) : md;
    $("#postBody").innerHTML = html;
  }catch(e){
    $("#postBody").innerHTML = "<p>No fue posible cargar el contenido.</p>";
  }
}

async function boot(){
  $("#year").textContent = new Date().getFullYear();
  initTheme();
  $("#themeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.classList.contains("light") ? "light" : "dark";
    applyTheme(current === "light" ? "dark" : "light");
  });

  const {owner, repo} = detectOwnerRepo();
  const slug = getQS("post");
  let posts = [];

  // Try GitHub API auto-index; if not available, fallback to local manifest if provided.
  try{
    posts = await ghListMarkdown(owner, repo);
    // Load titles/excerpts by fetching the first ~ for better UX (lightweight loop)
    const hydrated = [];
    for(const p of posts){
      try{
        const md = await ghFetchRaw(owner, repo, p.path);
        hydrated.push({
          ...p,
          title: firstHeading(md) || p.slug,
          excerpt: excerpt(md, 200)
        });
      }catch(_){ hydrated.push(p); }
    }
    posts = hydrated;
  }catch(e){
    // Fallback: Check for /posts/manifest.json if present (user can maintain it manually if needed)
    try{
      const res = await fetch("/posts/manifest.json",{cache:"no-store"});
      if(res.ok){
        posts = await res.json();
      }
    }catch(_){ /* ignore */ }
  }

  // Search behavior
  $("#search")?.addEventListener("input", (ev)=> renderList(posts, ev.target.value));

  if(slug){ await renderPost(owner, repo, slug); }
  else{ renderList(posts); }
}

document.addEventListener("DOMContentLoaded", boot);