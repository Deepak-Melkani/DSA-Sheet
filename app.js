const DATA_URL = "./data/problems.json";
const STORAGE_KEY = "dsavault-solved-v1";
const table = document.getElementById("problemTable");
const searchInput = document.getElementById("searchInput");
const moduleFilter = document.getElementById("moduleFilter");
const topicFilter = document.getElementById("topicFilter");
const statusFilter = document.getElementById("statusFilter");
const resultCount = document.getElementById("resultCount");
const errorMessage = document.getElementById("errorMessage");
let problems = [];
let solved = new Set();

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    solved = new Set(Array.isArray(saved) ? saved.filter(id => typeof id === "string") : []);
  } catch { solved = new Set(); }
}
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...solved]));
    errorMessage.hidden = true;
  } catch {
    errorMessage.hidden = false;
    errorMessage.textContent = "Progress could not be saved. Export your progress as a backup.";
  }
}
function updateStats() {
  const total = problems.length;
  const count = problems.filter(p => solved.has(p.id)).length;
  const percentage = total ? Math.round(count / total * 100) : 0;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("solvedCount").textContent = count;
  document.getElementById("completion").textContent = `${percentage}%`;
  document.getElementById("progressBar").style.width = `${percentage}%`;
}
function fillSelect(select, values, firstLabel) {
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHTML(firstLabel)}</option>` +
    values.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
  if (values.includes(current)) select.value = current;
}
function populateFilters() {
  const modules = [...new Map(problems.map(p => [p.moduleNumber, p.module])).entries()]
    .sort((a,b) => a[0]-b[0]).map(([number, name]) => ({number, name}));
  const selectedModule = moduleFilter.value;
  moduleFilter.innerHTML = '<option value="">All modules</option>' +
    modules.map(m => `<option value="${m.number}">${String(m.number).padStart(2,"0")}. ${escapeHTML(m.name)}</option>`).join("");
  if (modules.some(m => String(m.number) === selectedModule)) moduleFilter.value = selectedModule;
  updateTopicFilter();
}
function updateTopicFilter() {
  const selectedModule = moduleFilter.value;
  const relevant = problems.filter(p => !selectedModule || String(p.moduleNumber) === selectedModule);
  const topics = [...new Set(relevant.map(p => p.topic))];
  fillSelect(topicFilter, topics, "All subtopics");
}
function platformLink(url, label) {
  if (!url) return `<span class="problem-link disabled" title="No mapped link in the supplied dataset">${label} —</span>`;
  try {
    const parsed = new URL(url);
    const hosts = { "LeetCode": ["leetcode.com", "www.leetcode.com"], "GFG": ["geeksforgeeks.org", "www.geeksforgeeks.org"], "takeUforward": ["takeuforward.org", "www.takeuforward.org"] };
    if (parsed.protocol !== "https:" || !hosts[label]?.includes(parsed.hostname)) throw new Error("Invalid URL");
    return `<a class="problem-link" href="${escapeHTML(parsed.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  } catch {
    return `<span class="problem-link disabled" title="Invalid platform URL">${label} —</span>`;
  }
}
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedModule = moduleFilter.value;
  const selectedTopic = topicFilter.value;
  const selectedStatus = statusFilter.value;
  const filtered = problems.filter(p => {
    const searchable = `${p.title} ${p.module} ${p.topic} ${p.difficulty}`.toLowerCase();
    const matchesText = searchable.includes(query);
    const matchesModule = !selectedModule || String(p.moduleNumber) === selectedModule;
    const matchesTopic = !selectedTopic || p.topic === selectedTopic;
    const isSolved = solved.has(p.id);
    const matchesStatus = selectedStatus === "all" ||
      (selectedStatus === "solved" && isSolved) ||
      (selectedStatus === "pending" && !isSolved);
    return matchesText && matchesModule && matchesTopic && matchesStatus;
  });
  resultCount.textContent = `Showing ${filtered.length} of ${problems.length} problems`;
  if (!filtered.length) {
    table.innerHTML = '<tr><td colspan="5" class="empty">No problems found.</td></tr>';
    updateStats();
    return;
  }
  table.innerHTML = filtered.map(p => {
    const isSolved = solved.has(p.id);
    const difficulty = ["Easy", "Medium", "Hard"].includes(p.difficulty) ? p.difficulty : "";
    return `<tr>
      <td><input class="solved-check" type="checkbox" data-id="${escapeHTML(p.id)}"
        aria-label="Mark ${escapeHTML(p.title)} as solved" ${isSolved ? "checked" : ""}></td>
      <td>${p.order}</td>
      <td><span class="problem-name">${escapeHTML(p.title)}</span>
        <span class="problem-meta">${String(p.moduleNumber).padStart(2,"0")}. ${escapeHTML(p.module)} · ${escapeHTML(p.topic)}</span></td>
      <td><span class="difficulty ${difficulty}">${escapeHTML(difficulty || "Unrated")}</span></td>
      <td><div class="link-group">${platformLink(p.leetcode, "LeetCode")}${platformLink(p.gfg, "GFG")}${platformLink(p.takeuforward, "takeUforward")}</div></td>
    </tr>`;
  }).join("");
  updateStats();
}
table.addEventListener("change", event => {
  const checkbox = event.target.closest(".solved-check");
  if (!checkbox) return;
  if (checkbox.checked) solved.add(checkbox.dataset.id);
  else solved.delete(checkbox.dataset.id);
  saveProgress();
  render();
});
searchInput.addEventListener("input", render);
moduleFilter.addEventListener("change", () => { updateTopicFilter(); render(); });
topicFilter.addEventListener("change", render);
statusFilter.addEventListener("change", render);

document.getElementById("exportBtn").addEventListener("click", () => {
  const backup = { version: 1, exportedAt: new Date().toISOString(), solvedIds: [...solved] };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "dsavault-progress.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.getElementById("importInput").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const ids = Array.isArray(backup) ? backup : backup.solvedIds;
    if (!Array.isArray(ids) || !ids.every(id => typeof id === "string")) throw new Error("Invalid backup");
    const knownIds = new Set(problems.map(p => p.id));
    solved = new Set(ids.filter(id => knownIds.has(id)));
    saveProgress(); render();
    errorMessage.hidden = true;
  } catch {
    errorMessage.hidden = false;
    errorMessage.textContent = "Import failed. Choose a valid DSA Vault progress backup.";
  }
  event.target.value = "";
});
async function init() {
  loadProgress();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Could not load problem data");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Problem data must be an array");
    const ids = new Set();
    problems = data.map(p => {
      if (!p.id || !p.title || !p.module || !p.topic || !Number.isFinite(p.order) || ids.has(p.id)) {
        throw new Error("Invalid or duplicate problem entry");
      }
      ids.add(p.id);
      return p;
    }).sort((a,b) => a.order - b.order);
    populateFilters();
    render();
    const linkedLC = problems.filter(p => p.leetcode).length;
    const linkedGFG = problems.filter(p => p.gfg).length;
    const linkedTUF = problems.filter(p => p.takeuforward).length;
    document.getElementById("datasetMeta").textContent =
      `${problems.length} problems · ${new Set(problems.map(p => p.moduleNumber)).size} modules · links in source: ${linkedLC} LeetCode, ${linkedGFG} GFG, ${linkedTUF} takeUforward`;
  } catch (error) {
    console.error(error);
    errorMessage.hidden = false;
    errorMessage.textContent = "Could not load problems. Ensure data/problems.json exists and run the site through a local server.";
    table.innerHTML = '<tr><td colspan="5" class="empty">Could not load the dataset.</td></tr>';
  }
}
init();
