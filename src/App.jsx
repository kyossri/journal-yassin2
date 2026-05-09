import { useState, useEffect } from "react";

const INDICATORS = [
  { emoji: "🔴", label: "Important" },
  { emoji: "🟢", label: "Positif" },
  { emoji: "🟡", label: "Neutre" },
  { emoji: "📈", label: "Évolution" },
  { emoji: "⚡", label: "Énergie" },
  { emoji: "💪", label: "Physique" },
  { emoji: "🎯", label: "Objectif" },
  { emoji: "🌫️", label: "Flou" },
];

const BLOCK_COLORS = [
  { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd", label: "🏃 Sport" },
  { bg: "#1a2e1a", border: "#22c55e", text: "#86efac", label: "🍳 Repas" },
  { bg: "#2d1b4e", border: "#8b5cf6", text: "#c4b5fd", label: "🎯 Projet" },
  { bg: "#3b1f1f", border: "#ef4444", text: "#fca5a5", label: "🔴 Important" },
  { bg: "#2a2010", border: "#f59e0b", text: "#fcd34d", label: "📋 Admin" },
  { bg: "#1a1f2e", border: "#64748b", text: "#94a3b8", label: "😴 Repos" },
  { bg: "#1e2a1e", border: "#3d3a50", text: "#6b6880", label: "📝 Autre" },
];

const HUMEUR_LABELS = ["", "💀 Très bas", "😔 Bas", "😐 Neutre", "😊 Bien", "🔥 En feu"];
const HUMEUR_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

const generateSlots = () => {
  const slots = [];
  for (let h = 5; h <= 23; h++) {
    slots.push({ time: `${String(h).padStart(2, "0")}:00`, id: `${h}-0` });
    slots.push({ time: `${String(h).padStart(2, "0")}:30`, id: `${h}-30` });
  }
  return slots;
};
const ALL_SLOTS = generateSlots();

const defaultSlotData = () => {
  const d = {};
  ALL_SLOTS.forEach((s) => { d[s.id] = { label: "", colorIdx: 6, note: "", groupSize: 1 }; });
  const defaults = [
    { id: "6-0", label: "Réveil · eau · respiration", colorIdx: 5 },
    { id: "6-30", label: "Sport · pompes", colorIdx: 0, groupSize: 2 },
    { id: "7-0", label: "Sport · pompes", colorIdx: 0, groupSize: 0 },
    { id: "7-30", label: "Douche · préparation", colorIdx: 5 },
    { id: "8-0", label: "Petit-déj · œufs", colorIdx: 1 },
  ];
  defaults.forEach((def) => { d[def.id] = { ...d[def.id], ...def }; });
  return d;
};

const todayKey = () => new Date().toISOString().split("T")[0];

const defaultDay = (date) => ({
  date: date || todayKey(),
  pompes: "", sport: "", cannabis: "", alimentation: "",
  humeur: 3, projets: "", pensee: "",
  entries: [], slots: defaultSlotData(),
});

export default function Journal() {
  const [day, setDay] = useState(() => {
    try {
      const key = todayKey();
      const saved = localStorage.getItem(`journal-${key}`);
      return saved ? JSON.parse(saved) : defaultDay(key);
    } catch { return defaultDay(); }
  });
  const [tab, setTab] = useState("planning");
  const [newEntry, setNewEntry] = useState({ text: "", emoji: "🟢" });
  const [saved, setSaved] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selecting, setSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState(null);
  const [selectEnd, setSelectEnd] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ label: "", colorIdx: 0 });

  useEffect(() => {
    try {
      localStorage.setItem(`journal-${day.date}`, JSON.stringify(day));
    } catch {}
  }, [day]);

  const update = (key, val) => setDay((d) => ({ ...d, [key]: val }));
  const updateSlot = (id, patch) =>
    setDay((d) => ({ ...d, slots: { ...d.slots, [id]: { ...d.slots[id], ...patch } } }));
  const getSlotIndex = (id) => ALL_SLOTS.findIndex((s) => s.id === id);

  const applyGroup = (startId, endId, label, colorIdx) => {
    const si = getSlotIndex(startId);
    const ei = getSlotIndex(endId);
    const [from, to] = si <= ei ? [si, ei] : [ei, si];
    const size = to - from + 1;
    setDay((d) => {
      const slots = { ...d.slots };
      for (let i = from; i <= to; i++) {
        const sid = ALL_SLOTS[i].id;
        slots[sid] = { ...slots[sid], label, colorIdx, groupSize: i === from ? size : 0 };
      }
      return { ...d, slots };
    });
    setSelecting(false); setSelectStart(null); setSelectEnd(null);
  };

  const handleSlotClick = (slotId) => {
    if (selecting) {
      if (!selectStart) { setSelectStart(slotId); }
      else { setSelectEnd(slotId); setGroupForm({ label: "", colorIdx: 0 }); setShowGroupModal(true); }
    } else {
      setEditingSlot(slotId);
      setEditForm({ ...day.slots[slotId] });
    }
  };

  const isInSelection = (slotId) => {
    if (!selectStart) return false;
    const si = getSlotIndex(selectStart);
    const ei = selectEnd ? getSlotIndex(selectEnd) : si;
    const ci = getSlotIndex(slotId);
    const [from, to] = si <= ei ? [si, ei] : [ei, si];
    return ci >= from && ci <= to;
  };

  const saveEdit = () => { updateSlot(editingSlot, editForm); setEditingSlot(null); };
  const clearSlot = (id) => updateSlot(id, { label: "", colorIdx: 6, note: "", groupSize: 1 });

  const addEntry = () => {
    if (!newEntry.text.trim()) return;
    setDay((d) => ({ ...d, entries: [...d.entries, { ...newEntry, id: Date.now() }] }));
    setNewEntry({ text: "", emoji: "🟢" });
  };
  const removeEntry = (id) =>
    setDay((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));

  const changeDate = (date) => {
    try {
      const saved = localStorage.getItem(`journal-${date}`);
      setDay(saved ? JSON.parse(saved) : defaultDay(date));
    } catch { setDay(defaultDay(date)); }
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", color: "#e8e6f0", fontFamily: "'Georgia', serif", paddingBottom: 60 }}>
      <div style={{ textAlign: "center", padding: "24px 16px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#6b6880", textTransform: "uppercase", marginBottom: 6 }}>Journal de bord</div>
        <h1 style={{ fontSize: 24, fontWeight: "normal", margin: 0, color: "#f0eeff" }}>Yassin · {formatDate(day.date)}</h1>
        <input type="date" value={day.date} onChange={(e) => changeDate(e.target.value)}
          style={{ marginTop: 10, background: "#1a1a24", border: "1px solid #2e2c3e", borderRadius: 8, color: "#a09cb8", padding: "5px 12px", fontSize: 12, cursor: "pointer" }} />
        <div style={{ fontSize: 10, color: "#3d3a50", marginTop: 6, fontFamily: "sans-serif" }}>💾 Sauvegarde automatique</div>
        <div style={{ width: 40, height: 2, background: "linear-gradient(90deg,#7c3aed,#3b82f6)", margin: "10px auto 0", borderRadius: 2 }} />
      </div>

      <div style={{ display: "flex", margin: "20px 16px 0", borderRadius: 10, overflow: "hidden", border: "1px solid #22203a" }}>
        {[["planning", "📅 Planning"], ["journal", "📓 Journal"]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "11px 0",
            background: tab === id ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#141420",
            border: "none", color: tab === id ? "white" : "#6b6880",
            fontSize: 13, fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer",
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        {tab === "planning" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <button onClick={() => { setSelecting(!selecting); setSelectStart(null); setSelectEnd(null); }} style={{
                padding: "8px 14px", borderRadius: 8,
                border: `1px solid ${selecting ? "#7c3aed" : "#2e2c3e"}`,
                background: selecting ? "#2d1b4e" : "#1a1a24",
                color: selecting ? "#c4b5fd" : "#a09cb8",
                fontSize: 12, fontFamily: "sans-serif", cursor: "pointer",
              }}>
                {selecting ? "✏️ Sélection active — annuler" : "✏️ Grouper des créneaux"}
              </button>
              {selecting && <span style={{ fontSize: 11, color: "#6b6880", fontFamily: "sans-serif" }}>
                {!selectStart ? "① 1er créneau" : "② Dernier créneau"}
              </span>}
            </div>
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #22203a" }}>
              {ALL_SLOTS.map((slot) => {
                const s = day.slots[slot.id];
                const color = BLOCK_COLORS[s.colorIdx];
                const isEmpty = !s.label;
                const isHour = slot.time.endsWith(":00");
                const inSel = isInSelection(slot.id);
                if (s.groupSize === 0) return null;
                const rowH = (s.groupSize > 1 ? s.groupSize : 1) * 44;
                return (
                  <div key={slot.id} onClick={() => handleSlotClick(slot.id)} style={{
                    display: "flex", alignItems: "stretch", height: rowH,
                    borderBottom: "1px solid #1a1826",
                    background: inSel ? "#2d1b4e" : isEmpty ? (isHour ? "#131320" : "#111118") : color.bg,
                    cursor: "pointer", outline: inSel ? "2px solid #7c3aed" : "none", outlineOffset: -2,
                  }}>
                    <div style={{ width: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #22203a", fontSize: 11, color: isHour ? "#7c6fa0" : "#3d3a50", fontFamily: "monospace" }}>
                      {slot.time}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
                      {!isEmpty && <div style={{ width: 3, height: "55%", borderRadius: 2, background: color.border, flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, color: isEmpty ? "#2e2c3e" : color.text, fontFamily: "sans-serif", fontStyle: isEmpty ? "italic" : "normal", flex: 1 }}>
                        {s.label || "—"}
                      </span>
                      {s.note && <span style={{ fontSize: 11, color: "#6b6880" }}>💬</span>}
                      {s.groupSize > 1 && <span style={{ fontSize: 10, color: color.border, fontFamily: "monospace" }}>{s.groupSize * 30}min</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "journal" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <StatCard icon="💪" label="Pompes" placeholder="ex: 80 en 3 séries" value={day.pompes} onChange={(v) => update("pompes", v)} />
              <StatCard icon="🏃" label="Sport" placeholder="ex: 30min marche" value={day.sport} onChange={(v) => update("sport", v)} />
              <StatCard icon="🍳" label="Alimentation" placeholder="ex: œufs + pâtes" value={day.alimentation} onChange={(v) => update("alimentation", v)} />
              <StatCard icon="🌿" label="Cannabis" placeholder="ex: 1x soir" value={day.cannabis} onChange={(v) => update("cannabis", v)} accent="#22c55e" />
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>🎯 Projets / Avancées</label>
              <textarea value={day.projets} onChange={(e) => update("projets", e.target.value)} placeholder="Ce sur quoi tu as bossé aujourd'hui..." rows={3} style={textareaStyle} />
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>🌡️ Humeur</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input type="range" min={1} max={5} value={day.humeur} onChange={(e) => update("humeur", Number(e.target.value))} style={{ flex: 1, accentColor: HUMEUR_COLORS[day.humeur] }} />
                <span style={{ fontSize: 13, color: HUMEUR_COLORS[day.humeur], minWidth: 90, fontFamily: "sans-serif" }}>{HUMEUR_LABELS[day.humeur]}</span>
              </div>
            </div>
            <div style={cardStyle}>
              <label style={labelStyle}>📝 Notes</label>
              <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 10 }}>
                <select value={newEntry.emoji} onChange={(e) => setNewEntry((n) => ({ ...n, emoji: e.target.value }))}
                  style={{ background: "#1a1a24", border: "1px solid #2e2c3e", borderRadius: 8, color: "#e8e6f0", padding: "8px", fontSize: 16, cursor: "pointer" }}>
                  {INDICATORS.map((i) => <option key={i.emoji} value={i.emoji}>{i.emoji} {i.label}</option>)}
                </select>
                <input value={newEntry.text} onChange={(e) => setNewEntry((n) => ({ ...n, text: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addEntry()} placeholder="Ajouter une note..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addEntry} style={addBtnStyle}>+</button>
              </div>
              {day.entries.length === 0
                ? <p style={{ color: "#3d3a50", fontSize: 12, fontStyle: "italic", textAlign: "center", fontFamily: "sans-serif", margin: "4px 0" }}>Aucune note</p>
                : day.entries.map((e) => (
                  <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#13131c", border: "1px solid #22203a", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{e.emoji}</span>
                    <span style={{ flex: 1, fontSize: 13, fontFamily: "sans-serif", lineHeight: 1.5 }}>{e.text}</span>
                    <button onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", color: "#3d3a50", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                ))}
            </div>
            <div style={{ ...cardStyle, border: "1px solid #3b1d6e", background: "linear-gradient(135deg,#12101e,#1a0f2e)" }}>
              <label style={{ ...labelStyle, color: "#a78bfa" }}>✨ Pensée du jour</label>
              <p style={{ fontSize: 11, color: "#6b6880", margin: "2px 0 8px", fontFamily: "sans-serif" }}>Ce que tu retiens · Ce que tu veux manifester demain</p>
              <textarea value={day.pensee} onChange={(e) => update("pensee", e.target.value)}
                placeholder="Écris librement..." rows={5}
                style={{ ...textareaStyle, border: "1px solid #3b1d6e", background: "#0d0b18", color: "#d4c8ff", fontStyle: "italic", lineHeight: 1.7 }} />
            </div>
          </div>
        )}

        <button onClick={handleSave} style={{
          width: "100%", padding: 14, marginTop: 8,
          background: saved ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
          border: "none", borderRadius: 12, color: "white", fontSize: 14,
          fontFamily: "sans-serif", fontWeight: 600, cursor: "pointer",
        }}>
          {saved ? "✅ Sauvegardé" : "💾 Sauvegarder"}
        </button>
      </div>

      {editingSlot && (
        <Modal onClose={() => setEditingSlot(null)}>
          <h3 style={{ margin: "0 0 4px", color: "#f0eeff", fontWeight: "normal" }}>✏️ {ALL_SLOTS.find((s) => s.id === editingSlot)?.time}</h3>
          <p style={{ fontSize: 11, color: "#6b6880", margin: "0 0 14px", fontFamily: "sans-serif" }}>Modifier ce créneau</p>
          <label style={modalLabelStyle}>Activité</label>
          <input value={editForm.label || ""} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} placeholder="ex: Sport · pompes" style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={modalLabelStyle}>Catégorie</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {BLOCK_COLORS.map((c, i) => (
              <button key={i} onClick={() => setEditForm((f) => ({ ...f, colorIdx: i }))} style={{
                padding: "5px 10px", borderRadius: 8, border: `1px solid ${c.border}`,
                background: editForm.colorIdx === i ? c.bg : "#1a1a24",
                color: c.text, fontSize: 12, cursor: "pointer", fontFamily: "sans-serif",
              }}>{c.label}</button>
            ))}
          </div>
          <label style={modalLabelStyle}>Note</label>
          <input value={editForm.note || ""} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} placeholder="Détail..." style={{ ...inputStyle, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveEdit} style={{ ...addBtnStyle, flex: 1, height: 40, fontSize: 13, borderRadius: 8 }}>✅ Valider</button>
            <button onClick={() => { clearSlot(editingSlot); setEditingSlot(null); }} style={{ flex: 1, height: 40, background: "#1a1a24", border: "1px solid #3d3a50", borderRadius: 8, color: "#6b6880", fontSize: 13, cursor: "pointer", fontFamily: "sans-serif" }}>🗑 Effacer</button>
          </div>
        </Modal>
      )}

      {showGroupModal && (
        <Modal onClose={() => { setShowGroupModal(false); setSelecting(false); setSelectStart(null); setSelectEnd(null); }}>
          <h3 style={{ margin: "0 0 4px", color: "#f0eeff", fontWeight: "normal" }}>📦 Grouper</h3>
          <p style={{ fontSize: 11, color: "#6b6880", margin: "0 0 14px", fontFamily: "sans-serif" }}>
            {ALL_SLOTS.find((s) => s.id === selectStart)?.time} → {ALL_SLOTS.find((s) => s.id === selectEnd)?.time}
          </p>
          <label style={modalLabelStyle}>Activité</label>
          <input value={groupForm.label} onChange={(e) => setGroupForm((f) => ({ ...f, label: e.target.value }))} placeholder="ex: Travail projet" style={{ ...inputStyle, marginBottom: 12 }} />
          <label style={modalLabelStyle}>Catégorie</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {BLOCK_COLORS.map((c, i) => (
              <button key={i} onClick={() => setGroupForm((f) => ({ ...f, colorIdx: i }))} style={{
                padding: "5px 10px", borderRadius: 8, border: `1px solid ${c.border}`,
                background: groupForm.colorIdx === i ? c.bg : "#1a1a24",
                color: c.text, fontSize: 12, cursor: "pointer", fontFamily: "sans-serif",
              }}>{c.label}</button>
            ))}
          </div>
          <button onClick={() => { applyGroup(selectStart, selectEnd, groupForm.label, groupForm.colorIdx); setShowGroupModal(false); }}
            style={{ ...addBtnStyle, width: "100%", height: 42, fontSize: 13, borderRadius: 8 }}>✅ Appliquer</button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#141420", border: "1px solid #22203a", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon, label, placeholder, value, onChange, accent = "#7c3aed" }) {
  return (
    <div style={cardStyle}>
      <label style={{ ...labelStyle, color: "#a09cb8" }}>{icon} {label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, marginTop: 6, borderColor: value ? accent : "#2e2c3e" }} />
    </div>
  );
}

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const cardStyle = { background: "#141420", border: "1px solid #22203a", borderRadius: 12, padding: "12px 14px", marginBottom: 10 };
const labelStyle = { display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#7c6fa0", marginBottom: 2, fontFamily: "sans-serif", fontWeight: 600 };
const inputStyle = { width: "100%", background: "#1a1a24", border: "1px solid #2e2c3e", borderRadius: 8, color: "#e8e6f0", padding: "8px 12px", fontSize: 13, fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" };
const textareaStyle = { width: "100%", background: "#1a1a24", border: "1px solid #2e2c3e", borderRadius: 8, color: "#e8e6f0", padding: "10px 12px", fontSize: 13, fontFamily: "sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 };
const addBtnStyle = { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 8, color: "white", fontSize: 20, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const modalLabelStyle = { display: "block", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#7c6fa0", marginBottom: 6, fontFamily: "sans-serif", fontWeight: 600 };
