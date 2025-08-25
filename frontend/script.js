// Neon UI logic + API calls

function qs(sel){ return document.querySelector(sel) }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)) }

function getChecked(name){
  return qsa(`input[name="${name}"]:checked`).map(i => i.value)
}

function saveProgress(name, planIds){
  localStorage.setItem(`plan:${name}`, JSON.stringify(planIds))
}
function loadProgress(name){
  try { return JSON.parse(localStorage.getItem(`plan:${name}`) || "[]") } catch { return [] }
}

const form = qs("#profileForm")
const clearBtn = qs("#clearBtn")
const randomBtn = qs("#randomBtn")
const tabs = qs("#tabs")
const careersEl = qs("#careers")
const skillsEl = qs("#skills")
const coursesEl = qs("#courses")
const planEl = qs("#plan")
const bar = qs("#bar")
const progressText = qs("#progressText")
const internshipsEl = qs("#internships")
const hello = qs("#hello")

// Tabs
qsa(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".tab").forEach(b => b.classList.remove("active"))
    qsa(".tabcontent").forEach(t => t.classList.remove("active"))
    qs(`#${btn.dataset.tab}`).classList.add("active")
    btn.classList.add("active")
  })
})

// Randomize helper for demo
if (randomBtn) {
  randomBtn.addEventListener("click", () => {
    qsa('input[name="interests"]').forEach(i => i.checked = Math.random() > 0.6)
    qsa('input[name="strengths"]').forEach(i => i.checked = Math.random() > 0.6)
    const lvl = qs("#level"), sty = qs("#style"), tim = qs("#time")
    if (lvl) lvl.selectedIndex = Math.floor(Math.random()*3)
    if (sty) sty.selectedIndex = Math.floor(Math.random()*4)
    if (tim) tim.selectedIndex = Math.floor(Math.random()*4)
  })
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    form?.reset()
    qsa('input[type="checkbox"]').forEach(i => i.checked = false)
    tabs.classList.add("hidden")
  })
}

// API
async function postJSON(url = "", data = {}){
  const resp = await fetch(url, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data)
  })
  if(!resp.ok) throw new Error("Request failed")
  return await resp.json()
}

function renderPlan(name, plan){
  planEl.innerHTML = ""
  let steps = []
  if (Array.isArray(plan)) {
    steps = plan
  } else if (typeof plan === "string") {
    steps = plan.split(/\n+/).map((line, idx) => ({
      step: idx + 1,
      title: line.replace(/^\d+\.\s*/, ""),
      items: []
    }))
  }

  const saved = loadProgress(name)
  const ids = []

  steps.forEach(s => {
    const id = `step-${s.step}`
    ids.push(id)
    const done = saved.includes(id)
    const div = document.createElement("div")
    div.className = "item"
    div.innerHTML = `
      <label style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" ${done ? "checked" : ""} data-step="${id}">
        <div>
          <strong>Step ${s.step}: ${s.title || ""}</strong>
          ${
            Array.isArray(s.items) && s.items.length
              ? "<ul>" + s.items.map(it => `<li>${it}</li>`).join("") + "</ul>"
              : ""
          }
        </div>
      </label>`
    planEl.appendChild(div)
  })

  function updateProgress(){
    const checks = qsa("#plan input[type=checkbox]")
    const doneIds = checks.filter(c => c.checked).map(c => c.dataset.step)
    saveProgress(name, doneIds)
    const pct = Math.round((doneIds.length / Math.max(1, ids.length)) * 100)
    bar.style.width = pct + "%"
    progressText.textContent = `Progress: ${pct}%`
  }

  qsa("#plan input[type=checkbox]").forEach(cb => cb.addEventListener("change", updateProgress))
  updateProgress()
}

function groupCoursesBySkill(courses){
  const map = {}
  courses.forEach(c => {
    map[c.skill] ||= []
    map[c.skill].push(c)
  })
  return map
}

// Mock internships generated from skills + domains input
function generateInternships(skills, domainsText){
  const domains = (domainsText || "").split(",").map(s => s.trim()).filter(Boolean)
  const items = []
  const seed = skills.slice(0,4).concat(domains).slice(0,6)
  seed.forEach((s, idx) => {
    items.push({
      title: `${s || "General"} Intern`,
      company: ["NovaTech","ByteForge","SkyLabs","DataNest","Circuitry","AsterAI"][idx % 6],
      mode: ["Remote","Hybrid","Onsite"][idx % 3],
      link: "#"
    })
  })
  return items
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault()
  const payload = {
    name: qs("#name")?.value.trim(),
    goal: qs("#goal")?.value.trim(),
    level: qs("#level")?.value,
    style: qs("#style")?.value,
    time: qs("#time")?.value,
    location: qs("#location") ? qs("#location").value : "Remote",
    internship: qs("#internship") ? qs("#internship").value : "No",
    domains: qs("#domains") ? qs("#domains").value.trim() : "",
    interests: getChecked("interests"),
    strengths: getChecked("strengths"),
  }

  try{
    const data = await postJSON("/api/recommend", payload)

    // 🔹 PERSONAL GREETING HERE
    const name = payload.name || "there"
    const goal = payload.goal ? ` for <strong>${payload.goal}</strong>` : ""
    if (hello) hello.innerHTML = `Hi <strong>${name}</strong> — here’s your personalized plan${goal}.`

    // Careers
    careersEl.innerHTML = data.careers.map(c => `
      <div class="item">
        <strong>${c.name}</strong>
        <div class="muted">Skills: ${c.skills.join(", ")}</div>
      </div>
    `).join("")

    // Skills + Courses
    skillsEl.innerHTML = "<h3>Skills</h3>" + data.skills.map(s => `<span class="pill" title="Required skill">${s}</span>`).join(" ")
    const grouped = groupCoursesBySkill(data.courses)
    coursesEl.innerHTML = "<h3>Courses by Skill</h3>" + Object.entries(grouped).map(([skill, list]) => `
      <div class="item">
        <strong>${skill}</strong>
        <ul>
          ${list.map(c => `<li><a href="${c.url}" target="_blank" rel="noopener">${c.title}</a> <small>— ${c.provider}</small></li>`).join("")}
        </ul>
      </div>
    `).join("")

    // Plan
    renderPlan(payload.name || "you", data.plan)

    // Internships (mock cards)
    const ints = generateInternships(data.skills, payload.domains)
    internshipsEl.innerHTML = ints.map(i => `
      <div class="card-mini">
        <h4>${i.title}</h4>
        <div class="muted">${i.company}</div>
        <div style="margin:6px 0"><span class="badge">${i.mode}</span></div>
        <a href="${i.link}" class="muted">View posting</a>
      </div>
    `).join("")

    // Show Tabs and reset to first tab
    tabs.classList.remove("hidden")
    qsa(".tab").forEach(b => b.classList.remove("active"))
    qsa(".tabcontent").forEach(t => t.classList.remove("active"))
    qsa(".tab")[0].classList.add("active")
    qs("#t1").classList.add("active")

    window.scrollTo({ top: 0, behavior: "smooth" })
  } catch (err) {
    alert("Error: is the Flask server running on port 8000?")
    console.error(err)
  }
})
