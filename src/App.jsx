import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const GOAL_WIDTH = 3;
const CURVED_CORNER_SIZE = 0.5;
const CHICANE_OFFSET = 1.3;
const PANEL_BLUE = "#2952c4";
const PANEL_BLUE_LIGHT = "#3b6de8";
const PANEL_BLUE_DARK = "#1e3fa0";
const MESH_BLUE = "#4a7af5";
const POST_GREY = "#b0b8c4";
const POST_GREY_DARK = "#8a929e";
const GOAL_FRAME_GREY = "#c0c8d0";
const GATE_GREY = "#a0a8b4";
const MINIGOAL_WHITE = "#f0f0f0";
const SELECTED_OUTLINE = "#fbbf24";
const COURT_SURFACE = "#4a4e54";
const COURT_LINES = "#5ba4d9";

// ─── Court Generation ────────────────────────────────────────────────────────
function generatePanelRun(totalWidth, height) {
  const sections = [];
  let remaining = totalWidth;
  while (remaining >= 2) {
    sections.push({ type: "panel", width: 2, height });
    remaining -= 2;
  }
  if (remaining >= 1) {
    sections.push({ type: "panel", width: 1, height });
  }
  return sections;
}

function generateEndWall(courtWidth, endHeight, cornerType, sideHeight = 0) {
  const sections = [];
  const goalAttachMax = 3;
  const curvedCornerHeight = Math.max(endHeight, sideHeight);

  if (cornerType === "curved") {
    sections.push({ type: "curvedCorner", width: CURVED_CORNER_SIZE, height: curvedCornerHeight });
    const panelSpace = (courtWidth - GOAL_WIDTH - 2 * CURVED_CORNER_SIZE) / 2;
    const leftPanels = generatePanelRun(panelSpace, endHeight);
    // For arches: ensure adjacent-to-goal panel is 2m wide, and add arch info
    if (leftPanels.length > 0) {
      const adj = leftPanels[leftPanels.length - 1];
      if (endHeight === 2 && adj.width === 2) {
        adj.arch = { baseLevel: 1, goalHeight: 2, outerHeight: 1, goalSide: "right" };
      } else if (endHeight === 4 && adj.width === 2) {
        adj.height = endHeight;
        adj.arch = { baseLevel: 2, goalHeight: 1, outerHeight: 2, goalSide: "right" };
      } else if (endHeight > goalAttachMax) {
        adj.height = goalAttachMax;
      }
    }
    sections.push(...leftPanels);
    sections.push({ type: "goal", width: GOAL_WIDTH, height: goalAttachMax });
    const rightPanels = generatePanelRun(panelSpace, endHeight);
    if (rightPanels.length > 0) {
      const adj = rightPanels[0];
      if (endHeight === 2 && adj.width === 2) {
        adj.arch = { baseLevel: 1, goalHeight: 2, outerHeight: 1, goalSide: "left" };
      } else if (endHeight === 4 && adj.width === 2) {
        adj.height = endHeight;
        adj.arch = { baseLevel: 2, goalHeight: 1, outerHeight: 2, goalSide: "left" };
      } else if (endHeight > goalAttachMax) {
        adj.height = goalAttachMax;
      }
    }
    sections.push(...rightPanels);
    sections.push({ type: "curvedCorner", width: CURVED_CORNER_SIZE, height: curvedCornerHeight });
  } else {
    const panelSpace = (courtWidth - GOAL_WIDTH) / 2;
    const leftPanels = generatePanelRun(panelSpace, endHeight);
    if (leftPanels.length > 0) {
      const adj = leftPanels[leftPanels.length - 1];
      if (endHeight === 2 && adj.width === 2) {
        adj.arch = { baseLevel: 1, goalHeight: 2, outerHeight: 1, goalSide: "right" };
      } else if (endHeight === 4 && adj.width === 2) {
        adj.height = endHeight;
        adj.arch = { baseLevel: 2, goalHeight: 1, outerHeight: 2, goalSide: "right" };
      } else if (endHeight > goalAttachMax) {
        adj.height = goalAttachMax;
      }
    }
    sections.push(...leftPanels);
    sections.push({ type: "goal", width: GOAL_WIDTH, height: goalAttachMax });
    const rightPanels = generatePanelRun(panelSpace, endHeight);
    if (rightPanels.length > 0) {
      const adj = rightPanels[0];
      if (endHeight === 2 && adj.width === 2) {
        adj.arch = { baseLevel: 1, goalHeight: 2, outerHeight: 1, goalSide: "left" };
      } else if (endHeight === 4 && adj.width === 2) {
        adj.height = endHeight;
        adj.arch = { baseLevel: 2, goalHeight: 1, outerHeight: 2, goalSide: "left" };
      } else if (endHeight > goalAttachMax) {
        adj.height = goalAttachMax;
      }
    }
    sections.push(...rightPanels);
  }
  return sections;
}

function generateSideWall(courtLength, sideHeight, cornerType) {
  const panelSpace = cornerType === "curved"
    ? courtLength - 2 * CURVED_CORNER_SIZE
    : courtLength;
  return generatePanelRun(panelSpace, sideHeight);
}

function generateCourt(width, length, endHeight, sideHeight) {
  const cornerType = width % 2 === 0 ? "curved" : "90deg";
  return {
    width, length, cornerType, endHeight, sideHeight,
    walls: {
      end1: { sections: generateEndWall(width, endHeight, cornerType, sideHeight) },
      end2: { sections: generateEndWall(width, endHeight, cornerType, sideHeight) },
      side1: { sections: generateSideWall(length, sideHeight, cornerType) },
      side2: { sections: generateSideWall(length, sideHeight, cornerType) },
    },
  };
}

function generateEndWallOnly() {
  return {
    width: GOAL_WIDTH, length: 0, cornerType: null,
    endHeight: 3, sideHeight: 0, isEndWallOnly: true,
    walls: { end1: { sections: [{ type: "goal", width: GOAL_WIDTH, height: 3 }] } },
  };
}

// ─── BOM Calculation ─────────────────────────────────────────────────────────
function calculateBOM(court) {
  const bom = {};
  const add = (name, qty = 1) => { bom[name] = (bom[name] || 0) + qty; };
  const wallIds = Object.keys(court.walls);
  const goalCount = wallIds.reduce((sum, wId) =>
    sum + court.walls[wId].sections.filter(s => s.type === "goal").length, 0);
  add("SAG2B Goal Frame", goalCount);
  add("SAMBR Basketball Hoop", goalCount);
  wallIds.forEach(wallId => {
    const wall = court.walls[wallId];
    wall.sections.forEach((section) => {
      if (section.type === "panel") {
        const w = section.width === 2 ? "2m" : "1m";
        add(`Bar Panel ${w}`, 1);
        if (section.arch) {
          const meshBelow = section.arch.baseLevel - 1;
          if (meshBelow > 0) add(`Mesh Panel ${w}`, meshBelow);
          add(`Arch Panel 2m`, 1);
        } else {
          const meshCount = section.height - 1;
          if (meshCount > 0) add(`Mesh Panel ${w}`, meshCount);
        }
      } else if (section.type === "minigoal") {
        add("Mini Goal 2m", 1);
      } else if (section.type === "gate") {
        const gateH = Math.min(section.height, 2);
        add(`Gate ${gateH}m (in 2m frame)`, 1);
        const meshAbove = section.height - gateH;
        if (meshAbove > 0) add("Mesh Panel 2m", meshAbove);
      } else if (section.type === "chicane") {
        const chicH = Math.min(section.height, 2);
        add(`Chicane Frame 2m`, 1);
        add(`Bar Panel 2m`, 2); // 2x 2m rebound panels
        add(`Post ${chicH}m`, 4); // 2 posts per rebound panel
        const meshAbove = section.height - chicH;
        if (meshAbove > 0) add("Mesh Panel 2m", meshAbove);
      } else if (section.type === "curvedCorner") {
        add("Curved Corner Bar Panel", 1);
        const meshCount = section.height - 1;
        if (meshCount > 0) add("Curved Corner Mesh Panel", meshCount);
      }
    });
  });
  wallIds.forEach(wallId => {
    const wall = court.walls[wallId];
    const secs = wall.sections;
    for (let i = 0; i <= secs.length; i++) {
      const left = i > 0 ? secs[i - 1] : null;
      const right = i < secs.length ? secs[i] : null;
      if (left?.type === "goal" || right?.type === "goal") continue;
      const h = Math.max(left?.height || 0, right?.height || 0);
      if (h > 0) {
        const isCorner = (i === 0 || i === secs.length) && !court.isEndWallOnly && court.cornerType === "90deg";
        if (isCorner) {
          add(`Corner Post ${h}m`, 0.5);
        } else if (i > 0 && i < secs.length) {
          add(`Post ${h}m`, 1);
        } else if (court.isEndWallOnly || court.cornerType === "curved") {
          if (!(left?.type === "curvedCorner" && i === secs.length) &&
              !(right?.type === "curvedCorner" && i === 0)) {
            add(`Post ${h}m`, 1);
          }
        }
      }
    }
  });
  Object.keys(bom).forEach(k => {
    if (k.startsWith("Corner Post")) bom[k] = Math.ceil(bom[k]);
  });
  return Object.entries(bom).map(([name, qty]) => ({ name, qty })).filter(r => r.qty > 0);
}

// ─── Components ──────────────────────────────────────────────────────────────

function LandingScreen({ onChoice }) {
  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-blue-50 flex items-center justify-center p-4 overflow-auto" style={{ minHeight: "100dvh" }}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 mb-5 shadow-lg shadow-blue-200">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="10" width="32" height="20" rx="3" stroke="white" strokeWidth="2.5" fill="none" />
              <line x1="20" y1="10" x2="20" y2="30" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <circle cx="20" cy="20" r="5" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
              <rect x="14" y="4" width="12" height="8" rx="1" stroke="white" strokeWidth="1.5" fill="none" />
              <line x1="20" y1="12" x2="20" y2="10" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Arena Configurator</h1>
          <p className="text-gray-500">Design your multi-use games area</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => onChoice("endwall")}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-blue-400 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center flex-shrink-0">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="5" y="6" width="18" height="16" rx="2" stroke="#f97316" strokeWidth="2" fill="none" />
                  <line x1="14" y1="6" x2="14" y2="22" stroke="#f97316" strokeWidth="1.5" />
                  <line x1="5" y1="14" x2="23" y2="14" stroke="#f97316" strokeWidth="1" strokeDasharray="2,2" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">End Wall</div>
                <div className="text-sm text-gray-500">Build a goal end from scratch, panel by panel</div>
              </div>
            </div>
          </button>
          <button onClick={() => onChoice("arena")}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-blue-400 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="4" y="4" width="20" height="20" rx="3" stroke="#2563eb" strokeWidth="2" fill="none" />
                  <line x1="14" y1="4" x2="14" y2="9" stroke="#2563eb" strokeWidth="1.5" />
                  <line x1="14" y1="19" x2="14" y2="24" stroke="#2563eb" strokeWidth="1.5" />
                  <circle cx="14" cy="14" r="3" stroke="#2563eb" strokeWidth="1" fill="none" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">Full Arena</div>
                <div className="text-sm text-gray-500">Guided setup — enter dimensions and heights</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupForm({ onGenerate, onBack }) {
  const [form, setForm] = useState({ width: "", length: "", endHeight: 3, sideHeight: 3 });
  const widthNum = form.width === "" ? null : parseInt(form.width);
  const lengthNum = form.length === "" ? null : parseInt(form.length);
  const cornerType = widthNum !== null ? (widthNum % 2 === 0 ? "Curved corners" : "90° corners") : "";
  const minWidth = widthNum !== null ? (widthNum % 2 === 0 ? 6 : 5) : 5;
  const widthValid = widthNum !== null && widthNum >= minWidth;
  const lengthValid = lengthNum !== null && lengthNum >= 5;
  const widthEmpty = form.width === "";
  const lengthEmpty = form.length === "";
  const [touched, setTouched] = useState({ width: false, length: false });

  return (
    <div className="bg-gradient-to-br from-slate-100 via-white to-blue-50 flex items-center justify-center p-4 overflow-auto" style={{ minHeight: "100dvh" }}>
      <div className="max-w-md w-full">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
          Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Full Arena Setup</h2>
        <p className="text-gray-500 mb-6 text-sm">Enter your court dimensions and wall heights</p>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width (m)</label>
              <input type="number" min="5" max="50" value={form.width} placeholder="e.g. 10"
                onChange={e => setForm(f => ({ ...f, width: e.target.value }))}
                onBlur={() => setTouched(t => ({ ...t, width: true }))}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${touched.width && !widthValid ? "border-red-300" : "border-gray-300"}`} />
              {cornerType && <p className="text-xs text-blue-500 mt-1 font-medium">{cornerType}</p>}
              {touched.width && widthEmpty && <p className="text-xs text-red-500 mt-1">Please enter a width</p>}
              {touched.width && !widthEmpty && !widthValid && <p className="text-xs text-red-500 mt-1">Min {minWidth}m for {widthNum % 2 === 0 ? "even" : "odd"} width</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
              <input type="number" min="5" max="80" value={form.length} placeholder="e.g. 15"
                onChange={e => setForm(f => ({ ...f, length: e.target.value }))}
                onBlur={() => setTouched(t => ({ ...t, length: true }))}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${touched.length && !lengthValid ? "border-red-300" : "border-gray-300"}`} />
              {touched.length && lengthEmpty && <p className="text-xs text-red-500 mt-1">Please enter a length</p>}
              {touched.length && !lengthEmpty && !lengthValid && <p className="text-xs text-red-500 mt-1">Min 5m</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Wall Height</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(h => (
                  <button key={h} onClick={() => setForm(f => ({ ...f, endHeight: h }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      form.endHeight === h ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>{h}m</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side Wall Height</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(h => (
                  <button key={h} onClick={() => setForm(f => ({ ...f, sideHeight: h }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      form.sideHeight === h ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>{h}m</button>
                ))}
              </div>
            </div>
          </div>
          {widthNum > 30 || lengthNum > 50 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ Very large court — please verify dimensions.
            </div>
          ) : null}
          <button onClick={() => widthValid && lengthValid && onGenerate({ width: widthNum, length: lengthNum, endHeight: form.endHeight, sideHeight: form.sideHeight })}
            disabled={!widthValid || !lengthValid}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl py-3 font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
            Generate Arena
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Editor ──────────────────────────────────────────────────────────
function SectionEditor({ court, selection, onUpdateHeight, onToggleGate, onToggleChicane, onToggleMiniGoal, onUpdateWallHeight, onClose }) {
  if (!selection) return null;

  if (selection.type === "wall") {
    const wall = court.walls[selection.wall];
    const wallLabel = { end1: "End Wall 1", end2: "End Wall 2", side1: "Side Wall 1", side2: "Side Wall 2" }[selection.wall];
    const panelSections = wall.sections.filter(s => s.type === "panel" || s.type === "gate");
    const currentHeight = panelSections.length > 0 ? panelSections[0].height : 1;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">{wallLabel}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">{panelSections.length} section{panelSections.length !== 1 ? "s" : ""}</p>
        <label className="block text-xs font-medium text-gray-600 mb-2">Set all panels to height</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(h => (
            <button key={h} onClick={() => onUpdateWallHeight(selection.wall, h)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                h === currentHeight ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}>{h}m</button>
          ))}
        </div>
      </div>
    );
  }

  if (selection.type === "section") {
    const wall = court.walls[selection.wall];
    const section = wall.sections[selection.index];
    if (!section || section.type === "goal") {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900">Goal Combo</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </div>
          <p className="text-xs text-gray-500">SAG2B + SAMBR — fixed 3m width</p>
        </div>
      );
    }

    if (section.type === "curvedCorner") {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Curved Corner</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </div>
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-600 mb-2">Height</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(h => (
                <button key={h} onClick={() => onUpdateHeight(selection.wall, selection.index, h)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                    h === section.height ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" :
                    "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>{h}m</button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (section.type === "minigoal") {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900">Mini Goal — 2m wide</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">1m high white goal — replaces bar panel</p>
          <button onClick={() => onToggleMiniGoal(selection.wall, selection.index)}
            className="w-full py-2.5 rounded-lg text-sm font-medium border-2 border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition-all">
            Revert to panel
          </button>
        </div>
      );
    }

    const isAdjacentToGoal = (() => {
      const secs = wall.sections;
      const prev = selection.index > 0 ? secs[selection.index - 1] : null;
      const next = selection.index < secs.length - 1 ? secs[selection.index + 1] : null;
      return prev?.type === "goal" || next?.type === "goal";
    })();

    const distToGoal = (() => {
      const secs = wall.sections;
      let distLeft = 0, distRight = 0, foundLeft = false, foundRight = false;
      for (let i = selection.index - 1; i >= 0; i--) {
        if (secs[i].type === "goal") { foundLeft = true; break; }
        distLeft += secs[i].width;
      }
      for (let i = selection.index + 1; i < secs.length; i++) {
        if (secs[i].type === "goal") { foundRight = true; break; }
        distRight += secs[i].width;
      }
      if (!foundLeft && !foundRight) return 999;
      if (!foundLeft) return distRight;
      if (!foundRight) return distLeft;
      return Math.min(distLeft, distRight);
    })();

    const maxHeight = isAdjacentToGoal ? 3 : 4;
    const hasArch = !!section.arch;
    const canChicane = section.width === 2 && distToGoal >= 2 && !hasArch;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">
            {section.type === "gate" ? "Gate" : section.type === "chicane" ? "Chicane" : "Panel"} — {section.width}m wide
            {hasArch && <span className="text-xs text-blue-500 ml-1">(arch)</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
        </div>
        {!hasArch && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Height</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(h => (
                <button key={h} onClick={() => h <= maxHeight && onUpdateHeight(selection.wall, selection.index, h)}
                  disabled={h > maxHeight}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                    h === section.height ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" :
                    h > maxHeight ? "border-gray-100 text-gray-300 cursor-not-allowed" :
                    "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>{h}m</button>
              ))}
            </div>
            {isAdjacentToGoal && <p className="text-xs text-amber-600 mt-2">Max 3m adjacent to goal</p>}
          </div>
        )}
        {hasArch && (
          <p className="text-xs text-gray-500 mb-4">Arch auto-transitions between {section.height}m wall and 3m goal</p>
        )}
        <div className="flex flex-col gap-2">
          {section.width === 2 && section.type !== "chicane" && !hasArch && (
            <button onClick={() => onToggleGate(selection.wall, selection.index)}
              className={`w-full py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                section.type === "gate"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
              }`}>
              {section.type === "gate" ? "✓ Gate — click to revert" : "Convert to gate"}
            </button>
          )}
          {canChicane && section.type !== "gate" && (
            <button onClick={() => onToggleChicane(selection.wall, selection.index)}
              className={`w-full py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                section.type === "chicane"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
              }`}>
              {section.type === "chicane" ? "✓ Chicane — click to revert" : "Convert to chicane"}
            </button>
          )}
          {section.width === 2 && section.type === "panel" && !hasArch && (
            <button onClick={() => onToggleMiniGoal(selection.wall, selection.index)}
              className="w-full py-2.5 rounded-lg text-sm font-medium border-2 border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition-all">
              Add mini goal (replaces bar panel)
            </button>
          )}
        </div>
      </div>
    );
  }
  return null;
}

// ─── SVG Drawing Helpers ─────────────────────────────────────────────────────
function drawBarLines(x, y, w, h, scale, orientation = "h") {
  const elements = [];
  const spacing = scale * 0.08;
  const lw = Math.max(0.4, scale * 0.012);
  if (orientation === "h") {
    const count = Math.floor(w / spacing);
    for (let i = 1; i < count; i++) {
      elements.push(
        <line key={`b${i}`} x1={x + i * spacing} y1={y} x2={x + i * spacing} y2={y + h}
          stroke="#1a3d8f" strokeWidth={lw} opacity={0.45} />
      );
    }
  } else {
    const count = Math.floor(h / spacing);
    for (let i = 1; i < count; i++) {
      elements.push(
        <line key={`b${i}`} x1={x} y1={y + i * spacing} x2={x + w} y2={y + i * spacing}
          stroke="#1a3d8f" strokeWidth={lw} opacity={0.45} />
      );
    }
  }
  return elements;
}

function PostCircle({ cx, cy, scale, isCorner }) {
  const r = scale * (isCorner ? 0.09 : 0.065);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 0.8} fill="white" opacity={0.5} />
      <circle cx={cx} cy={cy} r={r} fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={Math.max(0.4, scale * 0.008)} />
      <circle cx={cx} cy={cy} r={r * 0.25} fill="white" opacity={0.3} />
    </g>
  );
}

// ─── 2D Plan View ────────────────────────────────────────────────────────────
function PlanView2D({ court, selection, onSelectSection, onSelectWall }) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [vbStart, setVbStart] = useState(null);

  const SCALE = useMemo(() => {
    if (court.isEndWallOnly) return 50;
    const maxDim = Math.max(court.width, court.length);
    if (maxDim <= 12) return 45;
    if (maxDim <= 20) return 32;
    if (maxDim <= 30) return 22;
    return 16;
  }, [court]);

  const T = SCALE * 0.35;
  const padding = 4;

  useEffect(() => {
    if (court.isEndWallOnly) {
      const totalW = court.walls.end1.sections.reduce((s, sec) => s + sec.width, 0);
      setViewBox({ x: -padding * SCALE, y: -padding * SCALE, w: (totalW + padding * 2) * SCALE, h: (padding * 2 + 2) * SCALE });
    } else {
      setViewBox({ x: -padding * SCALE, y: -padding * SCALE, w: (court.width + padding * 2) * SCALE, h: (court.length + padding * 2) * SCALE });
    }
  }, [court, SCALE, padding]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setViewBox(vb => {
      if (!vb) return vb;
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x;
      const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y;
      return { x: mx - (mx - vb.x) * factor, y: my - (my - vb.y) * factor, w: vb.w * factor, h: vb.h * factor };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (svg) svg.removeEventListener("wheel", handleWheel); };
  }, [handleWheel]);

  const handlePointerDown = (e) => {
    if (e.target.closest("[data-section]")) return;
    setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); setVbStart(viewBox);
  };
  const handlePointerMove = (e) => {
    if (!isPanning || !panStart || !vbStart) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - panStart.x) / rect.width) * vbStart.w;
    const dy = ((e.clientY - panStart.y) / rect.height) * vbStart.h;
    setViewBox({ ...vbStart, x: vbStart.x - dx, y: vbStart.y - dy });
  };
  const handlePointerUp = () => { setIsPanning(false); };

  if (!viewBox) return null;

  const isSel = (wallId, idx) =>
    (selection?.type === "section" && selection.wall === wallId && selection.index === idx) ||
    (selection?.type === "wall" && selection.wall === wallId);

  // Render horizontal wall (end walls)
  const renderHWall = (wallId, baseX, baseY, flipY = false) => {
    const wall = court.walls[wallId]; if (!wall) return null;
    const elements = []; let pos = 0;
    const yOff = flipY ? -T : 0;

    wall.sections.forEach((section, idx) => {
      const sel = isSel(wallId, idx);
      const sx = baseX + pos * SCALE;
      const sy = baseY + yOff;
      const sw = section.width * SCALE;

      if (section.type === "curvedCorner") {
        const isLeft = idx === 0;
        const isBottom = !flipY;
        const W_px = court.width * SCALE;

        // Quadratic bezier helper
        const qbez = (a, ctrl, b, t) => {
          const u = 1 - t;
          return { x: u*u*a.x + 2*u*t*ctrl.x + t*t*b.x, y: u*u*a.y + 2*u*t*ctrl.y + t*t*b.y };
        };

        // The curved corner connects end wall to side wall, bowing OUTWARD.
        // We draw inner edge (court-facing) and outer edge separately.
        // Inner edge control point = court corner; outer edge control point = outer wall corner.
        let innerStart, innerEnd, innerCtrl, outerStart, outerEnd, outerCtrl;

        if (isBottom && isLeft) {
          // Bottom-left: court corner (0, baseY), outer corner (-T, baseY+T)
          innerStart = { x: sw, y: baseY };
          innerEnd = { x: 0, y: baseY - sw };
          innerCtrl = { x: 0, y: baseY };
          outerStart = { x: sw, y: baseY + T };
          outerEnd = { x: -T, y: baseY - sw };
          outerCtrl = { x: -T, y: baseY + T };
        } else if (isBottom && !isLeft) {
          // Bottom-right: court corner (W_px, baseY), outer corner (W_px+T, baseY+T)
          innerStart = { x: sx, y: baseY };
          innerEnd = { x: W_px, y: baseY - sw };
          innerCtrl = { x: W_px, y: baseY };
          outerStart = { x: sx, y: baseY + T };
          outerEnd = { x: W_px + T, y: baseY - sw };
          outerCtrl = { x: W_px + T, y: baseY + T };
        } else if (!isBottom && isLeft) {
          // Top-left: court corner (0, baseY), outer corner (-T, baseY-T)
          innerStart = { x: sw, y: baseY };
          innerEnd = { x: 0, y: baseY + sw };
          innerCtrl = { x: 0, y: baseY };
          outerStart = { x: sw, y: baseY - T };
          outerEnd = { x: -T, y: baseY + sw };
          outerCtrl = { x: -T, y: baseY - T };
        } else {
          // Top-right: court corner (W_px, baseY), outer corner (W_px+T, baseY-T)
          innerStart = { x: sx, y: baseY };
          innerEnd = { x: W_px, y: baseY + sw };
          innerCtrl = { x: W_px, y: baseY };
          outerStart = { x: sx, y: baseY - T };
          outerEnd = { x: W_px + T, y: baseY + sw };
          outerCtrl = { x: W_px + T, y: baseY - T };
        }

        // Build filled shape: outer edge forward, inner edge backward
        const segments = 12;
        let pathD = `M${outerStart.x},${outerStart.y}`;
        for (let i = 1; i <= segments; i++) {
          const p = qbez(outerStart, outerCtrl, outerEnd, i / segments);
          pathD += ` L${p.x},${p.y}`;
        }
        pathD += ` L${innerEnd.x},${innerEnd.y}`;
        for (let i = segments - 1; i >= 0; i--) {
          const p = qbez(innerStart, innerCtrl, innerEnd, i / segments);
          pathD += ` L${p.x},${p.y}`;
        }
        pathD += " Z";

        // Bar lines across the wall thickness at points along the curve
        const barLines = [];
        if (!sel) {
          const numBars = 5;
          for (let b = 1; b < numBars; b++) {
            const t = b / numBars;
            const ip = qbez(innerStart, innerCtrl, innerEnd, t);
            const op = qbez(outerStart, outerCtrl, outerEnd, t);
            barLines.push(
              <line key={`bar-${b}`} x1={ip.x} y1={ip.y} x2={op.x} y2={op.y}
                stroke="#1a3d8f" strokeWidth={Math.max(0.4, SCALE * 0.012)} opacity={0.45} />
            );
          }
        }

        // Midpoint of curve for height label
        const midInner = qbez(innerStart, innerCtrl, innerEnd, 0.5);
        const midOuter = qbez(outerStart, outerCtrl, outerEnd, 0.5);
        const labelX = (midInner.x + midOuter.x) / 2;
        const labelY = (midInner.y + midOuter.y) / 2;

        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            <path d={pathD}
              fill={sel ? SELECTED_OUTLINE : PANEL_BLUE}
              stroke={sel ? "#b45309" : PANEL_BLUE_DARK}
              strokeWidth={sel ? 2 : 0.5} />
            {barLines}
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize={Math.max(5, SCALE * 0.12)} fontWeight="700"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
              {section.height}m
            </text>
          </g>
        );
      } else if (section.type === "goal") {
        const goalT = T * 1.8;
        const goalY = flipY ? baseY - goalT : baseY;
        const archR = sw * 0.38;
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            {/* Goal frame */}
            <rect x={sx + 1} y={goalY + 1} width={sw - 2} height={goalT - 2}
              fill={sel ? SELECTED_OUTLINE : GOAL_FRAME_GREY}
              stroke={sel ? "#b45309" : POST_GREY_DARK} strokeWidth={sel ? 2 : 1} rx={2} />
            {/* Arch over goal - on inside face */}
            <path d={`M ${sx + sw * 0.08} ${goalY + (flipY ? 1 : goalT - 1)} Q ${sx + sw / 2} ${goalY + (flipY ? -archR : goalT + archR)} ${sx + sw * 0.92} ${goalY + (flipY ? 1 : goalT - 1)}`}
              fill="none" stroke={sel ? "#b45309" : POST_GREY_DARK} strokeWidth={Math.max(1.5, SCALE * 0.04)} />
            {/* Goal opening (white) */}
            <rect x={sx + sw * 0.2} y={goalY + goalT * 0.2}
              width={sw * 0.6} height={goalT * 0.6}
              fill="white" stroke="#e5e7eb" strokeWidth={0.5} rx={1} />
            {/* Crossbar */}
            <line x1={sx + sw * 0.15} y1={goalY + goalT * 0.5}
              x2={sx + sw * 0.85} y2={goalY + goalT * 0.5}
              stroke={POST_GREY_DARK} strokeWidth={Math.max(1, SCALE * 0.025)} />
            {/* Goal posts */}
            <line x1={sx + sw * 0.2} y1={goalY + goalT * 0.15}
              x2={sx + sw * 0.2} y2={goalY + goalT * 0.85}
              stroke={POST_GREY_DARK} strokeWidth={Math.max(1, SCALE * 0.025)} />
            <line x1={sx + sw * 0.8} y1={goalY + goalT * 0.15}
              x2={sx + sw * 0.8} y2={goalY + goalT * 0.85}
              stroke={POST_GREY_DARK} strokeWidth={Math.max(1, SCALE * 0.025)} />
            {/* Basketball hoop - on inside face (facing into court) */}
            <circle cx={sx + sw / 2} cy={flipY ? goalY + goalT + SCALE * 0.25 : goalY - SCALE * 0.25}
              r={SCALE * 0.13} fill="none" stroke="#f97316" strokeWidth={Math.max(1.5, SCALE * 0.035)} />
            <rect x={sx + sw * 0.32} y={flipY ? goalY + goalT + SCALE * 0.05 : goalY - SCALE * 0.55}
              width={sw * 0.36} height={SCALE * 0.32}
              fill="none" stroke="#374151" strokeWidth={Math.max(1, SCALE * 0.025)} rx={1} />
          </g>
        );
      } else if (section.type === "minigoal") {
        // Mini goal: white 2m x 1m goal replacing bar panel
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            <rect x={sx} y={sy} width={sw} height={T}
              fill={sel ? SELECTED_OUTLINE : MINIGOAL_WHITE}
              stroke={sel ? "#b45309" : "#c0c4cc"} strokeWidth={sel ? 2 : 1} rx={1} />
            {/* Goal mesh pattern */}
            {!sel && (() => {
              const lines = [];
              const gv = 8, gh = 4;
              for (let g = 1; g < gv; g++) {
                const fx = sx + (sw * g) / gv;
                lines.push(<line key={`mg-v-${g}`} x1={fx} y1={sy + 1} x2={fx} y2={sy + T - 1} stroke="#d0d4dc" strokeWidth={0.4} />);
              }
              for (let g = 1; g < gh; g++) {
                const fy = sy + (T * g) / gh;
                lines.push(<line key={`mg-h-${g}`} x1={sx + 1} y1={fy} x2={sx + sw - 1} y2={fy} stroke="#d0d4dc" strokeWidth={0.4} />);
              }
              return lines;
            })()}
            {/* Frame border */}
            <rect x={sx + sw * 0.05} y={sy + T * 0.08} width={sw * 0.9} height={T * 0.84}
              fill="none" stroke="#9ca3af" strokeWidth={Math.max(1, SCALE * 0.03)} rx={1} />
            <text x={sx + sw / 2} y={sy + T / 2} textAnchor="middle" dominantBaseline="central"
              fill="#6b7280" fontSize={Math.max(5, SCALE * 0.12)} fontWeight="600">MINI</text>
          </g>
        );
      } else if (section.type === "chicane") {
        // Chicane entrance: open frame with 2m offset rebound panels outside
        const chicH = Math.min(section.height, 2);
        const reboundOffset = CHICANE_OFFSET * SCALE;
        const reboundY = flipY ? sy - reboundOffset - T : sy + T + reboundOffset;
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            {/* Open frame (dashed border, lighter fill) */}
            <rect x={sx} y={sy} width={sw} height={T}
              fill={sel ? SELECTED_OUTLINE : "#e8ecf4"} fillOpacity={0.5}
              stroke={sel ? "#b45309" : "#7888a4"} strokeWidth={sel ? 2 : 1}
              strokeDasharray={`${Math.max(3, SCALE * 0.08)} ${Math.max(2, SCALE * 0.05)}`} rx={1} />
            <text x={sx + sw / 2} y={sy + T / 2} textAnchor="middle" dominantBaseline="central"
              fill="#5b6880" fontSize={Math.max(5, SCALE * 0.11)} fontWeight="700">CHICANE</text>
            {/* Left rebound panel (2m) - staggered left */}
            <rect x={sx - sw * 0.25} y={reboundY} width={sw} height={T}
              fill={sel ? SELECTED_OUTLINE : PANEL_BLUE} stroke={sel ? "#b45309" : PANEL_BLUE_DARK}
              strokeWidth={sel ? 1.5 : 0.5} rx={1} />
            {!sel && drawBarLines(sx - sw * 0.25, reboundY, sw, T, SCALE, "h")}
            {/* Right rebound panel (2m) - staggered right */}
            <rect x={sx + sw * 0.25} y={reboundY} width={sw} height={T}
              fill={sel ? SELECTED_OUTLINE : PANEL_BLUE} stroke={sel ? "#b45309" : PANEL_BLUE_DARK}
              strokeWidth={sel ? 1.5 : 0.5} rx={1} />
            {!sel && drawBarLines(sx + sw * 0.25, reboundY, sw, T, SCALE, "h")}
            {/* Rebound posts: 2 per panel = 4 total */}
            {[sx - sw * 0.25, sx + sw * 0.75, sx + sw * 0.25, sx + sw * 1.25].map((px, pi) => (
              <g key={`${wallId}-chic-p-${pi}`}>
                <PostCircle cx={px} cy={reboundY + T / 2} scale={SCALE} />
              </g>
            ))}
          </g>
        );
      } else {
        // Regular panel or gate
        const isMiniGoalType = false;
        const fill = sel ? SELECTED_OUTLINE : (section.type === "gate" ? GATE_GREY : PANEL_BLUE);
        const stroke = sel ? "#b45309" : PANEL_BLUE_DARK;
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            <rect x={sx} y={sy} width={sw} height={T}
              fill={fill} stroke={stroke} strokeWidth={sel ? 2 : 0.5} rx={1} />
            {!sel && section.type === "panel" && drawBarLines(sx, sy, sw, T, SCALE, "h")}
            {section.type === "gate" && (
              <>
                <rect x={sx + sw * 0.18} y={sy + T * 0.18} width={sw * 0.64} height={T * 0.64}
                  fill="none" stroke="white" strokeWidth={Math.max(0.8, SCALE * 0.02)} rx={1} />
                <text x={sx + sw / 2} y={sy + T / 2} textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize={Math.max(6, SCALE * 0.14)} fontWeight="700">GATE</text>
              </>
            )}
            {section.type === "panel" && !section.arch && (
              <text x={sx + sw / 2} y={sy + T / 2} textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize={Math.max(7, SCALE * 0.17)} fontWeight="700"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                {section.height}m
              </text>
            )}
            {section.arch && (
              <>
                {/* Arch indicator: quarter-circle curve */}
                <path d={section.arch.goalSide === "right"
                  ? `M ${sx + 2} ${sy + T / 2} Q ${sx + sw * 0.6} ${sy + T / 2} ${sx + sw - 2} ${flipY ? sy + T - 1 : sy + 1}`
                  : `M ${sx + sw - 2} ${sy + T / 2} Q ${sx + sw * 0.4} ${sy + T / 2} ${sx + 2} ${flipY ? sy + T - 1 : sy + 1}`
                } fill="none" stroke="white" strokeWidth={Math.max(1.5, SCALE * 0.03)} />
                <text x={sx + sw / 2} y={sy + T / 2} textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize={Math.max(5, SCALE * 0.11)} fontWeight="700"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                  ARCH
                </text>
              </>
            )}
          </g>
        );
      }

      // Posts
      if (idx < wall.sections.length - 1) {
        const nextSec = wall.sections[idx + 1];
        if (section.type !== "goal" && nextSec.type !== "goal") {
          const px = baseX + (pos + section.width) * SCALE;
          const py = baseY + (flipY ? -T / 2 : T / 2);
          elements.push(<g key={`${wallId}-p-${idx}`}><PostCircle cx={px} cy={py} scale={SCALE} /></g>);
        }
      }
      pos += section.width;
    });
    return elements;
  };

  // Render vertical wall (side walls)
  const renderVWall = (wallId, baseX, baseY, flipX = false) => {
    const wall = court.walls[wallId]; if (!wall) return null;
    const elements = []; let pos = 0;
    const xOff = flipX ? 0 : -T;

    wall.sections.forEach((section, idx) => {
      const sel = isSel(wallId, idx);
      const sx = baseX + xOff;
      const sy = baseY + pos * SCALE;
      const sh = section.width * SCALE;

      if (section.type === "minigoal") {
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            <rect x={sx} y={sy} width={T} height={sh}
              fill={sel ? SELECTED_OUTLINE : MINIGOAL_WHITE}
              stroke={sel ? "#b45309" : "#c0c4cc"} strokeWidth={sel ? 2 : 1} rx={1} />
            {!sel && (() => {
              const lines = [];
              const gv = 4, gh = 8;
              for (let g = 1; g < gv; g++) {
                const fx = sx + (T * g) / gv;
                lines.push(<line key={`mg-v-${g}`} x1={fx} y1={sy + 1} x2={fx} y2={sy + sh - 1} stroke="#d0d4dc" strokeWidth={0.4} />);
              }
              for (let g = 1; g < gh; g++) {
                const fy = sy + (sh * g) / gh;
                lines.push(<line key={`mg-h-${g}`} x1={sx + 1} y1={fy} x2={sx + T - 1} y2={fy} stroke="#d0d4dc" strokeWidth={0.4} />);
              }
              return lines;
            })()}
            <text x={sx + T / 2} y={sy + sh / 2} textAnchor="middle" dominantBaseline="central"
              fill="#6b7280" fontSize={Math.max(5, SCALE * 0.12)} fontWeight="600"
              transform={`rotate(-90, ${sx + T / 2}, ${sy + sh / 2})`}>MINI</text>
          </g>
        );
      } else if (section.type === "chicane") {
        const reboundOffset = CHICANE_OFFSET * SCALE;
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            <rect x={sx} y={sy} width={T} height={sh}
              fill={sel ? SELECTED_OUTLINE : "#e8ecf4"} fillOpacity={0.5}
              stroke={sel ? "#b45309" : "#7888a4"} strokeWidth={sel ? 2 : 1}
              strokeDasharray={`${Math.max(3, SCALE * 0.08)} ${Math.max(2, SCALE * 0.05)}`} rx={1} />
            {/* Top rebound (2m) - staggered up */}
            <rect x={flipX ? sx + T + reboundOffset : sx - reboundOffset - T}
              y={sy - sh * 0.25} width={T} height={sh}
              fill={sel ? SELECTED_OUTLINE : PANEL_BLUE} stroke={sel ? "#b45309" : PANEL_BLUE_DARK}
              strokeWidth={sel ? 1.5 : 0.5} rx={1} />
            {!sel && drawBarLines(flipX ? sx + T + reboundOffset : sx - reboundOffset - T, sy - sh * 0.25, T, sh, SCALE, "v")}
            {/* Bottom rebound (2m) - staggered down */}
            <rect x={flipX ? sx + T + reboundOffset : sx - reboundOffset - T}
              y={sy + sh * 0.25} width={T} height={sh}
              fill={sel ? SELECTED_OUTLINE : PANEL_BLUE} stroke={sel ? "#b45309" : PANEL_BLUE_DARK}
              strokeWidth={sel ? 1.5 : 0.5} rx={1} />
            {!sel && drawBarLines(flipX ? sx + T + reboundOffset : sx - reboundOffset - T, sy + sh * 0.25, T, sh, SCALE, "v")}
            {/* Rebound posts: ends of each 2m panel */}
            {[sy - sh * 0.25, sy + sh * 0.75, sy + sh * 0.25, sy + sh * 1.25].map((py, pi) => (
              <g key={`${wallId}-chic-p-${pi}`}>
                <PostCircle cx={flipX ? sx + T + reboundOffset + T / 2 : sx - reboundOffset - T / 2} cy={py} scale={SCALE} />
              </g>
            ))}
            <text x={sx + T / 2} y={sy + sh / 2} textAnchor="middle" dominantBaseline="central"
              fill="#5b6880" fontSize={Math.max(5, SCALE * 0.10)} fontWeight="700"
              transform={`rotate(-90, ${sx + T / 2}, ${sy + sh / 2})`}>CHICANE</text>
          </g>
        );
      } else {
        const fill = sel ? SELECTED_OUTLINE : (section.type === "gate" ? GATE_GREY : PANEL_BLUE);
        const stroke = sel ? "#b45309" : PANEL_BLUE_DARK;
        elements.push(
          <g key={`${wallId}-${idx}`} data-section="true" className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wallId, idx); }}>
            <rect x={sx} y={sy} width={T} height={sh}
              fill={fill} stroke={stroke} strokeWidth={sel ? 2 : 0.5} rx={1} />
            {!sel && section.type === "panel" && drawBarLines(sx, sy, T, sh, SCALE, "v")}
            {section.type === "gate" && (
              <rect x={sx + T * 0.18} y={sy + sh * 0.18} width={T * 0.64} height={sh * 0.64}
                fill="none" stroke="white" strokeWidth={Math.max(0.8, SCALE * 0.02)} rx={1} />
            )}
            <text x={sx + T / 2} y={sy + sh / 2} textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize={Math.max(7, SCALE * 0.17)} fontWeight="700"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
              transform={`rotate(-90, ${sx + T / 2}, ${sy + sh / 2})`}>
              {section.type === "gate" ? "GATE" : `${section.height}m`}
            </text>
          </g>
        );
      }

      if (idx < wall.sections.length - 1) {
        const px = baseX + (flipX ? T / 2 : -T / 2);
        const py = baseY + (pos + section.width) * SCALE;
        elements.push(<g key={`${wallId}-p-${idx}`}><PostCircle cx={px} cy={py} scale={SCALE} /></g>);
      }
      pos += section.width;
    });
    return elements;
  };

  if (court.isEndWallOnly) {
    const totalW = court.walls.end1.sections.reduce((s, sec) => s + sec.width, 0);
    return (
      <svg ref={svgRef} className="w-full h-full select-none"
        style={{ background: "#f8fafc", touchAction: "none", cursor: isPanning ? "grabbing" : "default" }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <text x={totalW * SCALE / 2} y={SCALE * 0.5 - SCALE * 1.8} textAnchor="middle" fill="#6b7280"
          fontSize={SCALE * 0.35} fontWeight="700" className="cursor-pointer" onClick={() => onSelectWall("end1")}>
          End Wall · {totalW}m
        </text>
        {renderHWall("end1", 0, SCALE * 0.5)}
      </svg>
    );
  }

  const W = court.width;
  const L = court.length;
  const cornerOff = court.cornerType === "curved" ? CURVED_CORNER_SIZE * SCALE : 0;

  return (
    <svg ref={svgRef} className="w-full h-full select-none"
      style={{ background: "#f8fafc", touchAction: "none", cursor: isPanning ? "grabbing" : "default" }}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>

      {/* Court surface */}
      <rect x={-T * 0.5} y={-T * 0.5} width={W * SCALE + T} height={L * SCALE + T}
        fill={COURT_SURFACE} rx={court.cornerType === "curved" ? SCALE * 0.25 : 2} />
      {/* Court markings */}
      <line x1={T * 0.5} y1={L * SCALE / 2} x2={W * SCALE - T * 0.5} y2={L * SCALE / 2}
        stroke={COURT_LINES} strokeWidth={Math.max(0.8, SCALE * 0.025)} opacity={0.5} />
      <circle cx={W * SCALE / 2} cy={L * SCALE / 2} r={Math.min(SCALE * 2, W * SCALE * 0.15)}
        fill="none" stroke={COURT_LINES} strokeWidth={Math.max(0.8, SCALE * 0.025)} opacity={0.5} />
      <path d={`M ${W * SCALE * 0.28} ${T * 0.5} Q ${W * SCALE / 2} ${SCALE * 2.5} ${W * SCALE * 0.72} ${T * 0.5}`}
        fill="none" stroke={COURT_LINES} strokeWidth={Math.max(0.8, SCALE * 0.025)} opacity={0.4} />
      <path d={`M ${W * SCALE * 0.28} ${L * SCALE - T * 0.5} Q ${W * SCALE / 2} ${L * SCALE - SCALE * 2.5} ${W * SCALE * 0.72} ${L * SCALE - T * 0.5}`}
        fill="none" stroke={COURT_LINES} strokeWidth={Math.max(0.8, SCALE * 0.025)} opacity={0.4} />

      {/* Wall labels */}
      <text x={W * SCALE / 2} y={-T - SCALE * 1.2} textAnchor="middle" fill="#94a3b8"
        fontSize={SCALE * 0.28} fontWeight="600" className="cursor-pointer" onClick={() => onSelectWall("end2")}>
        End 2 — click to select
      </text>
      <text x={W * SCALE / 2} y={L * SCALE + T + SCALE * 1.5} textAnchor="middle" fill="#94a3b8"
        fontSize={SCALE * 0.28} fontWeight="600" className="cursor-pointer" onClick={() => onSelectWall("end1")}>
        End 1 — click to select
      </text>
      <text x={-T - SCALE * 0.8} y={L * SCALE / 2} textAnchor="middle" fill="#94a3b8"
        fontSize={SCALE * 0.28} fontWeight="600" className="cursor-pointer"
        transform={`rotate(-90, ${-T - SCALE * 0.8}, ${L * SCALE / 2})`}
        onClick={() => onSelectWall("side1")}>Side 1</text>
      <text x={W * SCALE + T + SCALE * 0.8} y={L * SCALE / 2} textAnchor="middle" fill="#94a3b8"
        fontSize={SCALE * 0.28} fontWeight="600" className="cursor-pointer"
        transform={`rotate(90, ${W * SCALE + T + SCALE * 0.8}, ${L * SCALE / 2})`}
        onClick={() => onSelectWall("side2")}>Side 2</text>

      {/* Dims */}
      <text x={W * SCALE / 2} y={-T - SCALE * 2} textAnchor="middle" fill="#cbd5e1" fontSize={SCALE * 0.23}>{W}m</text>
      <text x={W * SCALE + T + SCALE * 1.8} y={L * SCALE / 2} textAnchor="middle" fill="#cbd5e1"
        fontSize={SCALE * 0.23} transform={`rotate(90, ${W * SCALE + T + SCALE * 1.8}, ${L * SCALE / 2})`}>{L}m</text>

      {/* Walls */}
      {renderHWall("end1", 0, L * SCALE, false)}
      {renderHWall("end2", 0, 0, true)}
      {renderVWall("side1", 0, cornerOff, false)}
      {renderVWall("side2", W * SCALE, cornerOff, true)}

      {/* Corner posts */}
      {court.cornerType === "90deg" && (
        <>
          <PostCircle cx={0} cy={0} scale={SCALE} isCorner={true} />
          <PostCircle cx={W * SCALE} cy={0} scale={SCALE} isCorner={true} />
          <PostCircle cx={0} cy={L * SCALE} scale={SCALE} isCorner={true} />
          <PostCircle cx={W * SCALE} cy={L * SCALE} scale={SCALE} isCorner={true} />
        </>
      )}
      {/* Posts at curved corner / side wall junctions */}
      {court.cornerType === "curved" && (
        <>
          <PostCircle cx={-T / 2} cy={cornerOff} scale={SCALE} />
          <PostCircle cx={W * SCALE + T / 2} cy={cornerOff} scale={SCALE} />
          <PostCircle cx={-T / 2} cy={L * SCALE - cornerOff} scale={SCALE} />
          <PostCircle cx={W * SCALE + T / 2} cy={L * SCALE - cornerOff} scale={SCALE} />
        </>
      )}
    </svg>
  );
}

// ─── 3D Isometric View ──────────────────────────────────────────────────────
function IsometricView({ court, selection, onSelectSection, onSelectWall }) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const isSel = (wId, idx) =>
    (selection?.type === "section" && selection.wall === wId && selection.index === idx) ||
    (selection?.type === "wall" && selection.wall === wId);

  if (court.isEndWallOnly) {
    // End wall 3D view - front-facing isometric of just the end wall
    const W = court.width;
    const maxH = Math.max(...court.walls.end1.sections.map(s => s.height));
    const baseISO = Math.min(14, 380 / Math.max(W, maxH * 2));
    const ISO = baseISO * zoom;
    const HH = ISO * 0.7;
    const cx = 450, cy = 420;

    const toIso = (x, y, z = 0) => {
      const a = [{ ax: 1, ay: 1 }, { ax: -1, ay: 1 }, { ax: -1, ay: -1 }, { ax: 1, ay: -1 }][rotation];
      return { x: (x * a.ax - y * a.ay) * ISO * 0.866 + cx, y: (x * a.ax + y * a.ay) * ISO * 0.5 - z * HH + cy };
    };
    const quad = (x1, y1, x2, y2, z1, z2) => {
      const pts = [toIso(x1, y1, z1), toIso(x2, y2, z1), toIso(x2, y2, z2), toIso(x1, y1, z2)];
      return pts.map(p => `${p.x},${p.y}`).join(" ");
    };
    const elems = [];

    // Small ground strip
    const depth = 1.5;
    const fc = [toIso(0, 0), toIso(W, 0), toIso(W, depth), toIso(0, depth)].map(p => `${p.x},${p.y}`).join(" ");
    elems.push(<polygon key="floor" points={fc} fill={COURT_SURFACE} stroke="#3a3e44" strokeWidth={1} />);

    // Render end1 wall sections
    const wall = court.walls.end1;
    let offset = 0;
    const shade = false;
    wall.sections.forEach((section, idx) => {
      const x1 = offset, x2 = offset + section.width;
      const y1 = 0, y2 = 0; // flat along x-axis
      const h = section.height;
      const sel = isSel("end1", idx);

      if (section.type === "curvedCorner") {
        // Simplified curved corner in 3D
        for (let level = 0; level < h; level++) {
          const isBar = level === 0;
          let fillColor;
          if (sel) fillColor = SELECTED_OUTLINE;
          else if (isBar) fillColor = PANEL_BLUE;
          else fillColor = MESH_BLUE;
          const pts = quad(x1, y1, x2, y2, level, level + 1);
          elems.push(
            <polygon key={`end1-${idx}-${level}`} points={pts} data-section="true"
              fill={fillColor} stroke={sel ? "#b45309" : (isBar ? PANEL_BLUE_DARK : "#3555b8")}
              strokeWidth={sel ? 2 : 0.5} opacity={0.88} className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onSelectSection("end1", idx); }} />
          );
        }
      } else if (section.type === "goal") {
        const pts = quad(x1, y1, x2, y2, 0, h);
        elems.push(
          <polygon key={`end1-${idx}`} points={pts} data-section="true"
            fill={sel ? SELECTED_OUTLINE : GOAL_FRAME_GREY} stroke={sel ? "#b45309" : "#9ca3af"}
            strokeWidth={sel ? 2 : 0.5} className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection("end1", idx); }} />
        );
        // Goal opening
        const openPts = quad(x1 + (x2 - x1) * 0.12, y1, x1 + (x2 - x1) * 0.88, y2, 0.05, h * 0.65);
        elems.push(<polygon key={`end1-${idx}-o`} points={openPts} fill="#2a2e34" stroke="#6b7280" strokeWidth={0.3} opacity={0.6} />);
        // Basketball hoop
        const isEnd1_3d = true;
        const bbOffsetY = -0.5;
        const bbCenter = toIso((x1 + x2) / 2, (y1 + y2) / 2 + bbOffsetY, h + 0.8);
        elems.push(
          <rect key={`end1-${idx}-bb`} x={bbCenter.x - ISO * 0.45} y={bbCenter.y - ISO * 0.4}
            width={ISO * 0.9} height={ISO * 0.7}
            fill="white" stroke="#374151" strokeWidth={1} rx={1} />
        );
        const hoopCenter = toIso((x1 + x2) / 2, (y1 + y2) / 2 + bbOffsetY, h + 0.3);
        elems.push(
          <circle key={`end1-${idx}-hoop`} cx={hoopCenter.x} cy={hoopCenter.y}
            r={ISO * 0.15} fill="none" stroke="#f97316" strokeWidth={Math.max(1, ISO * 0.08)} />
        );
      } else if (section.type === "minigoal") {
        const pts = quad(x1, y1, x2, y2, 0, 1);
        elems.push(
          <polygon key={`end1-${idx}-mg`} points={pts} data-section="true"
            fill={sel ? SELECTED_OUTLINE : "#e8eaee"} stroke={sel ? "#b45309" : "#9ca3af"}
            strokeWidth={sel ? 2 : 0.5} opacity={0.9} className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection("end1", idx); }} />
        );
      } else {
        for (let level = 0; level < h; level++) {
          const isBar = level === 0;
          const isGate = section.type === "gate" && level < 2;
          const isArch = section.arch && level === section.arch.baseLevel;
          if (section.arch && level > section.arch.baseLevel) continue;
          let fillColor;
          if (sel) fillColor = SELECTED_OUTLINE;
          else if (isGate) fillColor = GATE_GREY;
          else if (isBar) fillColor = PANEL_BLUE;
          else fillColor = MESH_BLUE;

          if (isArch && !sel) {
            const arch = section.arch;
            const segs = 8;
            let archPoly = "";
            const bl = toIso(x1, y1, level);
            const br = toIso(x2, y2, level);
            archPoly += `${bl.x},${bl.y} ${br.x},${br.y} `;
            const rightH = arch.goalSide === "right" ? arch.goalHeight : arch.outerHeight;
            const leftH = arch.goalSide === "left" ? arch.goalHeight : arch.outerHeight;
            for (let s = 0; s <= segs; s++) {
              const t = 1 - s / segs;
              const fx = x1 + (x2 - x1) * t, fy = y1 + (y2 - y1) * t;
              let curveH;
              if (rightH >= leftH) curveH = leftH + (rightH - leftH) * Math.sin(t * Math.PI / 2);
              else curveH = rightH + (leftH - rightH) * Math.cos(t * Math.PI / 2);
              const p = toIso(fx, fy, level + curveH);
              archPoly += `${p.x},${p.y} `;
            }
            elems.push(
              <polygon key={`end1-${idx}-${level}`} points={archPoly.trim()} data-section="true"
                fill={MESH_BLUE} stroke="#3555b8" strokeWidth={0.5} opacity={0.88}
                className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectSection("end1", idx); }} />
            );
          } else {
            const pts = quad(x1, y1, x2, y2, level, level + 1);
            elems.push(
              <polygon key={`end1-${idx}-${level}`} points={pts} data-section="true"
                fill={fillColor} stroke={sel ? "#b45309" : (isBar ? PANEL_BLUE_DARK : "#3555b8")}
                strokeWidth={sel ? 2 : 0.5} opacity={0.88} className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectSection("end1", idx); }} />
            );
          }
          if (isBar && !sel && !isGate) {
            const nb = Math.max(3, Math.round(section.width * 5));
            for (let b = 1; b < nb; b++) {
              const frac = b / nb;
              const bx = x1 + (x2 - x1) * frac, by = y1;
              const bp = toIso(bx, by, level); const tp = toIso(bx, by, level + 1);
              elems.push(<line key={`end1-${idx}-bl-${b}`} x1={bp.x} y1={bp.y} x2={tp.x} y2={tp.y} stroke="#1a3d8f" strokeWidth={0.4} opacity={0.35} />);
            }
          }
          if (!isBar && !isGate && !sel && !isArch) {
            const gv = Math.max(2, Math.round(section.width * 4)), gh = 3;
            for (let g = 1; g < gh; g++) {
              const f = g / gh;
              const lp = toIso(x1, y1, level + f); const rp = toIso(x2, y2, level + f);
              elems.push(<line key={`end1-${idx}-${level}-mh-${g}`} x1={lp.x} y1={lp.y} x2={rp.x} y2={rp.y} stroke="#3555b8" strokeWidth={0.25} opacity={0.25} />);
            }
            for (let g = 1; g < gv; g++) {
              const f = g / gv;
              const bx = x1 + (x2 - x1) * f, by = y1;
              const bp = toIso(bx, by, level); const tp = toIso(bx, by, level + 1);
              elems.push(<line key={`end1-${idx}-${level}-mv-${g}`} x1={bp.x} y1={bp.y} x2={tp.x} y2={tp.y} stroke="#3555b8" strokeWidth={0.25} opacity={0.25} />);
            }
          }
        }
      }
      // Posts
      if (idx < wall.sections.length - 1 && section.type !== "goal" && wall.sections[idx + 1].type !== "goal") {
        const pH = Math.max(section.height, wall.sections[idx + 1].height);
        const pb = toIso(x2, y2, 0); const pt = toIso(x2, y2, pH);
        elems.push(<line key={`end1-${idx}-3dp`} x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y} stroke={POST_GREY} strokeWidth={Math.max(2.5, ISO * 0.16)} strokeLinecap="round" />);
        elems.push(<circle key={`end1-${idx}-3dpt`} cx={pt.x} cy={pt.y} r={Math.max(2, ISO * 0.09)} fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={0.5} />);
      }
      offset += section.width;
    });
    // End posts
    const firstSec = wall.sections[0], lastSec = wall.sections[wall.sections.length - 1];
    if (firstSec.type !== "curvedCorner") {
      const pb = toIso(0, 0, 0); const pt = toIso(0, 0, firstSec.height);
      elems.push(<line key="end1-lp" x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y} stroke={POST_GREY} strokeWidth={Math.max(2.5, ISO * 0.16)} strokeLinecap="round" />);
      elems.push(<circle key="end1-lpt" cx={pt.x} cy={pt.y} r={Math.max(2, ISO * 0.09)} fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={0.5} />);
    }
    if (lastSec.type !== "curvedCorner") {
      const pb = toIso(W, 0, 0); const pt = toIso(W, 0, lastSec.height);
      elems.push(<line key="end1-rp" x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y} stroke={POST_GREY} strokeWidth={Math.max(2.5, ISO * 0.16)} strokeLinecap="round" />);
      elems.push(<circle key="end1-rpt" cx={pt.x} cy={pt.y} r={Math.max(2, ISO * 0.09)} fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={0.5} />);
    }

    return (
      <div className="w-full h-full relative" style={{ background: "#f1f5f9" }}>
        <svg className="w-full h-full" viewBox="0 0 900 640">{elems}</svg>
        <div className="absolute top-3 right-3 flex gap-1">
          {["↗ NE", "↘ SE", "↙ SW", "↖ NW"].map((label, i) => (
            <button key={label} onClick={() => setRotation(i)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                rotation === i ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
              }`}>{label}</button>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
            className="w-8 h-8 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold text-lg flex items-center justify-center hover:border-gray-400 shadow-sm">+</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}
            className="w-8 h-8 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold text-lg flex items-center justify-center hover:border-gray-400 shadow-sm">−</button>
        </div>
      </div>
    );
  }

  const W = court.width;
  const L = court.length;
  const baseISO = Math.min(14, 380 / Math.max(W, L));
  const ISO = baseISO * zoom;
  const HH = ISO * 0.7;
  const cx = 450, cy = 320;

  const toIso = (x, y, z = 0) => {
    const a = [{ ax: 1, ay: 1 }, { ax: -1, ay: 1 }, { ax: -1, ay: -1 }, { ax: 1, ay: -1 }][rotation];
    return { x: (x * a.ax - y * a.ay) * ISO * 0.866 + cx, y: (x * a.ax + y * a.ay) * ISO * 0.5 - z * HH + cy };
  };

  const quad = (x1, y1, x2, y2, z1, z2) => {
    const pts = [toIso(x1, y1, z1), toIso(x2, y2, z1), toIso(x2, y2, z2), toIso(x1, y1, z2)];
    return pts.map(p => `${p.x},${p.y}`).join(" ");
  };

  const elems = [];

  // Floor
  const fc = [toIso(0, 0), toIso(W, 0), toIso(W, L), toIso(0, L)].map(p => `${p.x},${p.y}`).join(" ");
  elems.push(<polygon key="floor" points={fc} fill={COURT_SURFACE} stroke="#3a3e44" strokeWidth={1} />);
  const cl1 = toIso(0, L / 2), cl2 = toIso(W, L / 2);
  elems.push(<line key="cl" x1={cl1.x} y1={cl1.y} x2={cl2.x} y2={cl2.y} stroke={COURT_LINES} strokeWidth={0.8} opacity={0.4} />);

  const renderIso3DWall = (wId, getCoords, shade) => {
    const wall = court.walls[wId]; if (!wall) return;
    let offset = 0;
    wall.sections.forEach((section, idx) => {
      const { x1, y1, x2, y2 } = getCoords(offset, offset + section.width);
      const h = section.height;
      const sel = isSel(wId, idx);

      if (section.type === "curvedCorner") {
        const isLeft = idx === 0;
        const isEnd1 = wId === "end1";
        const isEnd2 = wId === "end2";
        const curveSegs = 8;
        const cSize = section.width; // 0.5

        // Quadratic bezier with control at the court corner → bows outward
        const qbez3 = (a, ctrl, b, t) => {
          const u = 1 - t;
          return { x: u*u*a.x + 2*u*t*ctrl.x + t*t*b.x, y: u*u*a.y + 2*u*t*ctrl.y + t*t*b.y };
        };

        let cStart, cEnd, cCtrl;
        if (isEnd1 && isLeft) {
          cStart = { x: cSize, y: L }; cEnd = { x: 0, y: L - cSize }; cCtrl = { x: 0, y: L };
        } else if (isEnd1 && !isLeft) {
          cStart = { x: W - cSize, y: L }; cEnd = { x: W, y: L - cSize }; cCtrl = { x: W, y: L };
        } else if (isEnd2 && isLeft) {
          cStart = { x: cSize, y: 0 }; cEnd = { x: 0, y: cSize }; cCtrl = { x: 0, y: 0 };
        } else {
          cStart = { x: W - cSize, y: 0 }; cEnd = { x: W, y: cSize }; cCtrl = { x: W, y: 0 };
        }

        const getCurvePoint = (t) => qbez3(cStart, cCtrl, cEnd, t);

        for (let level = 0; level < h; level++) {
          const isBar = level === 0;
          let fillColor;
          if (sel) fillColor = SELECTED_OUTLINE;
          else if (isBar) fillColor = shade ? PANEL_BLUE_DARK : PANEL_BLUE;
          else fillColor = shade ? PANEL_BLUE : MESH_BLUE;

          for (let s = 0; s < curveSegs; s++) {
            const t1 = s / curveSegs;
            const t2 = (s + 1) / curveSegs;
            const cp1 = getCurvePoint(t1);
            const cp2 = getCurvePoint(t2);
            const segPts = quad(cp1.x, cp1.y, cp2.x, cp2.y, level, level + 1);
            elems.push(
              <polygon key={`${wId}-${idx}-${level}-cs${s}`} points={segPts} data-section="true"
                fill={fillColor} stroke={sel ? "#b45309" : (isBar ? PANEL_BLUE_DARK : "#3555b8")}
                strokeWidth={sel ? 1.5 : 0.3} opacity={0.88}
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectSection(wId, idx); }} />
            );
          }

          if (isBar && !sel) {
            const numBars = 4;
            for (let b = 1; b < numBars; b++) {
              const t = b / numBars;
              const p = getCurvePoint(t);
              const bpp = toIso(p.x, p.y, level);
              const tpp = toIso(p.x, p.y, level + 1);
              elems.push(
                <line key={`${wId}-${idx}-cbl-${b}`} x1={bpp.x} y1={bpp.y} x2={tpp.x} y2={tpp.y}
                  stroke="#1a3d8f" strokeWidth={0.4} opacity={0.35} />
              );
            }
          }

          if (!isBar && !sel) {
            for (let g = 1; g < 3; g++) {
              const f = g / 3;
              let meshPath = "";
              for (let ms = 0; ms <= curveSegs; ms++) {
                const t = ms / curveSegs;
                const p = getCurvePoint(t);
                const mp = toIso(p.x, p.y, level + f);
                meshPath += (ms === 0 ? "M" : "L") + `${mp.x},${mp.y}`;
              }
              elems.push(
                <path key={`${wId}-${idx}-${level}-cmh-${g}`} d={meshPath}
                  fill="none" stroke="#3555b8" strokeWidth={0.25} opacity={0.25} />
              );
            }
            for (let g = 1; g < 4; g++) {
              const t = g / 4;
              const p = getCurvePoint(t);
              const bpp = toIso(p.x, p.y, level);
              const tpp = toIso(p.x, p.y, level + 1);
              elems.push(
                <line key={`${wId}-${idx}-${level}-cmv-${g}`} x1={bpp.x} y1={bpp.y} x2={tpp.x} y2={tpp.y}
                  stroke="#3555b8" strokeWidth={0.25} opacity={0.25} />
              );
            }
          }
        }
      } else if (section.type === "goal") {
        const pts = quad(x1, y1, x2, y2, 0, h);
        elems.push(
          <polygon key={`${wId}-${idx}`} points={pts} data-section="true"
            fill={sel ? SELECTED_OUTLINE : GOAL_FRAME_GREY} stroke={sel ? "#b45309" : "#9ca3af"} strokeWidth={sel ? 2 : 0.5}
            className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelectSection(wId, idx); }} />
        );
        // Goal opening
        const openPts = quad(
          x1 + (x2 - x1) * 0.12, y1 + (y2 - y1) * 0.12,
          x1 + (x2 - x1) * 0.88, y1 + (y2 - y1) * 0.88,
          0.05, h * 0.65
        );
        elems.push(<polygon key={`${wId}-${idx}-o`} points={openPts} fill="#2a2e34" stroke="#6b7280" strokeWidth={0.3} opacity={0.6} />);
        // Arch
        const archPts = 8;
        let archPath = "";
        for (let i = 0; i <= archPts; i++) {
          const t = i / archPts;
          const ax = x1 + (x2 - x1) * (0.08 + t * 0.84);
          const ay = y1 + (y2 - y1) * (0.08 + t * 0.84);
          const az = h + Math.sin(t * Math.PI) * 0.6;
          const p = toIso(ax, ay, az);
          archPath += (i === 0 ? "M" : "L") + `${p.x},${p.y}`;
        }
        elems.push(<path key={`${wId}-${idx}-arch`} d={archPath} fill="none" stroke={POST_GREY_DARK} strokeWidth={Math.max(1.5, ISO * 0.1)} />);

        // Basketball backboard - offset inward (into the court)
        const isEnd1_3d = wId === "end1";
        const bbOffsetY = isEnd1_3d ? -0.5 : 0.5; // toward court center
        const bbCenter = toIso((x1 + x2) / 2, (y1 + y2) / 2 + bbOffsetY, h + 0.8);
        elems.push(
          <rect key={`${wId}-${idx}-bb`} x={bbCenter.x - ISO * 0.5} y={bbCenter.y - ISO * 0.4}
            width={ISO} height={ISO * 0.8} fill="white" stroke="#374151" strokeWidth={1} rx={1} />
        );
        elems.push(
          <circle key={`${wId}-${idx}-hoop`} cx={bbCenter.x} cy={bbCenter.y + ISO * 0.5}
            r={ISO * 0.15} fill="none" stroke="#f97316" strokeWidth={Math.max(1, ISO * 0.08)} />
        );
      } else if (section.type === "minigoal") {
        // 3D Mini goal: white panel at ground level
        const pts = quad(x1, y1, x2, y2, 0, 1);
        elems.push(
          <polygon key={`${wId}-${idx}-mg`} points={pts} data-section="true"
            fill={sel ? SELECTED_OUTLINE : "#e8eaee"} stroke={sel ? "#b45309" : "#9ca3af"}
            strokeWidth={sel ? 2 : 0.5} opacity={0.9}
            className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelectSection(wId, idx); }} />
        );
        // Mini goal mesh grid
        if (!sel) {
          const gv = 6, gh = 3;
          for (let g = 1; g < gh; g++) {
            const f = g / gh;
            const lp = toIso(x1, y1, f);
            const rp = toIso(x2, y2, f);
            elems.push(<line key={`${wId}-${idx}-mgh-${g}`} x1={lp.x} y1={lp.y} x2={rp.x} y2={rp.y} stroke="#b0b4bc" strokeWidth={0.3} opacity={0.4} />);
          }
          for (let g = 1; g < gv; g++) {
            const f = g / gv;
            const bx = x1 + (x2 - x1) * f, by = y1 + (y2 - y1) * f;
            const bp = toIso(bx, by, 0);
            const tp = toIso(bx, by, 1);
            elems.push(<line key={`${wId}-${idx}-mgv-${g}`} x1={bp.x} y1={bp.y} x2={tp.x} y2={tp.y} stroke="#b0b4bc" strokeWidth={0.3} opacity={0.4} />);
          }
        }
      } else if (section.type === "chicane") {
        // 3D Chicane: open frame with offset rebound panels
        const chicH = Math.min(h, 2);
        // Open frame (translucent)
        for (let level = 0; level < h; level++) {
          const pts = quad(x1, y1, x2, y2, level, level + 1);
          const isFrame = level < chicH;
          elems.push(
            <polygon key={`${wId}-${idx}-${level}`} points={pts} data-section="true"
              fill={sel ? SELECTED_OUTLINE : (isFrame ? "#c8d0e0" : (shade ? PANEL_BLUE : MESH_BLUE))}
              stroke={sel ? "#b45309" : "#7888a4"}
              strokeWidth={sel ? 2 : 0.5} opacity={isFrame ? 0.4 : 0.88}
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onSelectSection(wId, idx); }} />
          );
        }
        // Rebound panels offset outside - two 2m panels, staggered
        const isEndWall = wId === "end1" || wId === "end2";
        const dx = x2 - x1, dy = y2 - y1;
        // Normal direction (outward from court)
        let nx, ny;
        if (isEndWall) {
          ny = wId === "end1" ? CHICANE_OFFSET : -CHICANE_OFFSET;
          nx = 0;
        } else {
          nx = wId === "side2" ? CHICANE_OFFSET : -CHICANE_OFFSET;
          ny = 0;
        }
        // Two 2m rebound panels, staggered by 0.5m each side
        const qDx = dx * 0.25, qDy = dy * 0.25; // quarter of section width offset
        const r1 = { x1: x1 - qDx + nx, y1: y1 - qDy + ny, x2: x2 - qDx + nx, y2: y2 - qDy + ny };
        const r2 = { x1: x1 + qDx + nx, y1: y1 + qDy + ny, x2: x2 + qDx + nx, y2: y2 + qDy + ny };
        [r1, r2].forEach((r, ri) => {
          for (let level = 0; level < chicH; level++) {
            const rpts = quad(r.x1, r.y1, r.x2, r.y2, level, level + 1);
            elems.push(
              <polygon key={`${wId}-${idx}-reb-${ri}-${level}`} points={rpts}
                fill={shade ? PANEL_BLUE_DARK : PANEL_BLUE} stroke={PANEL_BLUE_DARK}
                strokeWidth={0.5} opacity={0.88} />
            );
            if (level === 0 && !sel) {
              const nb = Math.max(3, Math.round(section.width * 5));
              for (let b = 1; b < nb; b++) {
                const frac = b / nb;
                const bx = r.x1 + (r.x2 - r.x1) * frac, by = r.y1 + (r.y2 - r.y1) * frac;
                const bp = toIso(bx, by, 0);
                const tp = toIso(bx, by, 1);
                elems.push(<line key={`${wId}-${idx}-reb-${ri}-bl-${b}`} x1={bp.x} y1={bp.y} x2={tp.x} y2={tp.y} stroke="#1a3d8f" strokeWidth={0.3} opacity={0.3} />);
              }
            }
          }
          // Rebound posts at each end
          [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 }].forEach((pp, pi) => {
            const rpb = toIso(pp.x, pp.y, 0);
            const rpt = toIso(pp.x, pp.y, chicH);
            elems.push(<line key={`${wId}-${idx}-reb-${ri}-p${pi}`} x1={rpb.x} y1={rpb.y} x2={rpt.x} y2={rpt.y} stroke={POST_GREY} strokeWidth={Math.max(1.5, ISO * 0.1)} strokeLinecap="round" />);
            elems.push(<circle key={`${wId}-${idx}-reb-${ri}-pt${pi}`} cx={rpt.x} cy={rpt.y} r={Math.max(1.5, ISO * 0.06)} fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={0.3} />);
          });
        });
      } else {
        for (let level = 0; level < h; level++) {
          const isBar = level === 0;
          const isGate = section.type === "gate" && level < 2;
          const isChicane = false;
          const isArch = section.arch && level === section.arch.baseLevel;
          // Skip levels above arch - the arch polygon covers them
          if (section.arch && level > section.arch.baseLevel) continue;
          let fillColor;
          if (sel) fillColor = SELECTED_OUTLINE;
          else if (isGate) fillColor = shade ? "#8a929e" : GATE_GREY;
          else if (isBar) fillColor = shade ? PANEL_BLUE_DARK : PANEL_BLUE;
          else fillColor = shade ? PANEL_BLUE : MESH_BLUE;

          if (isArch && !sel) {
            // Draw arch panel with curved top edge
            const arch = section.arch;
            const goalH = arch.goalHeight; // height on goal side
            const outerH = arch.outerHeight; // height on outer side
            const segs = 8;
            // Build polygon with curved top edge
            let archPoly = "";
            // Bottom edge
            const bl = toIso(x1, y1, level);
            const br = toIso(x2, y2, level);
            archPoly += `${bl.x},${bl.y} ${br.x},${br.y} `;
            // Determine height at right vs left side
            const rightH = arch.goalSide === "right" ? goalH : outerH;
            const leftH = arch.goalSide === "left" ? goalH : outerH;
            // Top edge: curved from right to left with quarter-circle bulge upward
            for (let s = 0; s <= segs; s++) {
              const t = 1 - s / segs; // right (t=1) to left (t=0)
              const fx = x1 + (x2 - x1) * t;
              const fy = y1 + (y2 - y1) * t;
              // Quarter-circle interpolation - always bulges upward
              let curveH;
              if (rightH >= leftH) {
                curveH = leftH + (rightH - leftH) * Math.sin(t * Math.PI / 2);
              } else {
                curveH = rightH + (leftH - rightH) * Math.cos(t * Math.PI / 2);
              }
              const p = toIso(fx, fy, level + curveH);
              archPoly += `${p.x},${p.y} `;
            }
            elems.push(
              <polygon key={`${wId}-${idx}-${level}`} points={archPoly.trim()} data-section="true"
                fill={shade ? PANEL_BLUE : MESH_BLUE} stroke="#3555b8"
                strokeWidth={0.5} opacity={0.88}
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectSection(wId, idx); }} />
            );
          } else {
            const pts = quad(x1, y1, x2, y2, level, level + 1);
            elems.push(
              <polygon key={`${wId}-${idx}-${level}`} points={pts} data-section="true"
                fill={fillColor} stroke={sel ? "#b45309" : (isBar ? PANEL_BLUE_DARK : "#3555b8")}
                strokeWidth={sel ? 2 : 0.5} opacity={0.88}
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectSection(wId, idx); }} />
            );
          }

          // Bar lines
          if (isBar && !sel && !isGate) {
            const nb = Math.max(3, Math.round(section.width * 5));
            for (let b = 1; b < nb; b++) {
              const frac = b / nb;
              const bx = x1 + (x2 - x1) * frac, by = y1 + (y2 - y1) * frac;
              const bp = toIso(bx, by, level);
              const tp = toIso(bx, by, level + 1);
              elems.push(
                <line key={`${wId}-${idx}-bl-${b}`} x1={bp.x} y1={bp.y} x2={tp.x} y2={tp.y}
                  stroke="#1a3d8f" strokeWidth={0.4} opacity={0.35} />
              );
            }
          }
          // Mesh grid (skip arch level - it has its own shape)
          if (!isBar && !isGate && !sel && !isArch) {
            const gv = Math.max(2, Math.round(section.width * 4));
            const gh = 3;
            for (let g = 1; g < gh; g++) {
              const f = g / gh;
              const lp = toIso(x1, y1, level + f);
              const rp = toIso(x2, y2, level + f);
              elems.push(<line key={`${wId}-${idx}-${level}-mh-${g}`} x1={lp.x} y1={lp.y} x2={rp.x} y2={rp.y} stroke="#3555b8" strokeWidth={0.25} opacity={0.25} />);
            }
            for (let g = 1; g < gv; g++) {
              const f = g / gv;
              const bx = x1 + (x2 - x1) * f, by = y1 + (y2 - y1) * f;
              const bp = toIso(bx, by, level);
              const tp = toIso(bx, by, level + 1);
              elems.push(<line key={`${wId}-${idx}-${level}-mv-${g}`} x1={bp.x} y1={bp.y} x2={tp.x} y2={tp.y} stroke="#3555b8" strokeWidth={0.25} opacity={0.25} />);
            }
          }
        }
      }

      // 3D Posts
      if (idx < wall.sections.length - 1 && section.type !== "goal" && wall.sections[idx + 1].type !== "goal") {
        const pH = Math.max(section.height, wall.sections[idx + 1].height);
        const pb = toIso(x2, y2, 0);
        const pt = toIso(x2, y2, pH);
        elems.push(
          <line key={`${wId}-${idx}-3dp`} x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y}
            stroke={POST_GREY} strokeWidth={Math.max(2.5, ISO * 0.16)} strokeLinecap="round" />
        );
        elems.push(
          <circle key={`${wId}-${idx}-3dpt`} cx={pt.x} cy={pt.y} r={Math.max(2, ISO * 0.09)}
            fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={0.5} />
        );
      }
      offset += section.width;
    });
  };

  const cornerOff = court.cornerType === "curved" ? CURVED_CORNER_SIZE : 0;
  const wallOrder = [
    ["end2", "side1", "side2", "end1"],
    ["side2", "end2", "end1", "side1"],
    ["end1", "side2", "side1", "end2"],
    ["side1", "end1", "end2", "side2"],
  ][rotation];

  const wallConfigs = {
    end1: { fn: (s, e) => ({ x1: s, y1: L, x2: e, y2: L }), shade: rotation === 0 || rotation === 3 ? 0 : 1 },
    end2: { fn: (s, e) => ({ x1: s, y1: 0, x2: e, y2: 0 }), shade: rotation === 1 || rotation === 2 ? 0 : 1 },
    side1: { fn: (s, e) => ({ x1: 0, y1: cornerOff + s, x2: 0, y2: cornerOff + e }), shade: rotation === 2 || rotation === 3 ? 0 : 1 },
    side2: { fn: (s, e) => ({ x1: W, y1: cornerOff + s, x2: W, y2: cornerOff + e }), shade: rotation === 0 || rotation === 1 ? 0 : 1 },
  };

  wallOrder.forEach(wId => {
    const cfg = wallConfigs[wId];
    renderIso3DWall(wId, cfg.fn, cfg.shade);
  });

  // 3D Posts at curved corner / side wall junctions
  if (court.cornerType === "curved") {
    const junctions = [
      { x: 0, y: cornerOff }, { x: W, y: cornerOff },
      { x: 0, y: L - cornerOff }, { x: W, y: L - cornerOff },
    ];
    const sideH1 = court.walls.side1?.sections[0]?.height || 3;
    const sideH2 = court.walls.side2?.sections[0]?.height || 3;
    const endCurveH = court.walls.end1?.sections[0]?.height || 3;
    const junctionHeights = [
      Math.max(sideH1, endCurveH), Math.max(sideH2, endCurveH),
      Math.max(sideH1, endCurveH), Math.max(sideH2, endCurveH),
    ];
    junctions.forEach((j, i) => {
      const pb = toIso(j.x, j.y, 0);
      const pt = toIso(j.x, j.y, junctionHeights[i]);
      elems.push(
        <line key={`cj-post-${i}`} x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y}
          stroke={POST_GREY} strokeWidth={Math.max(2.5, ISO * 0.16)} strokeLinecap="round" />
      );
      elems.push(
        <circle key={`cj-post-${i}-t`} cx={pt.x} cy={pt.y} r={Math.max(2, ISO * 0.09)}
          fill={POST_GREY} stroke={POST_GREY_DARK} strokeWidth={0.5} />
      );
    });
  }

  return (
    <div className="w-full h-full relative" style={{ background: "#f1f5f9" }}>
      <svg className="w-full h-full" viewBox="0 0 900 640">{elems}</svg>
      <div className="absolute top-3 right-3 flex gap-1">
        {["↗ NE", "↘ SE", "↙ SW", "↖ NW"].map((label, i) => (
          <button key={label} onClick={() => setRotation(i)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              rotation === i ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
            }`}>{label}</button>
        ))}
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
          className="w-8 h-8 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold text-lg flex items-center justify-center hover:border-gray-400 shadow-sm">+</button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}
          className="w-8 h-8 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold text-lg flex items-center justify-center hover:border-gray-400 shadow-sm">−</button>
      </div>
    </div>
  );
}

// ─── BOM View ────────────────────────────────────────────────────────────────
function BOMView({ court }) {
  const bom = useMemo(() => calculateBOM(court), [court]);
  const totalItems = bom.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="w-full h-full overflow-auto p-4" style={{ background: "#f8fafc" }}>
      <div className="max-w-lg mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Bill of Materials</h3>
        <p className="text-sm text-gray-500 mb-4">{totalItems} total components</p>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Component</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Qty</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((row, i) => (
                <tr key={row.name} className={`${i < bom.length - 1 ? "border-b border-gray-100" : ""} hover:bg-gray-50`}>
                  <td className="px-5 py-3 text-gray-900">{row.name}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-700">{row.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── End Wall Add Panel ──────────────────────────────────────────────────────
function EndWallAddPanel({ side, onAdd, onAddCorner, adjacentToGoal }) {
  const [show, setShow] = useState(false);
  const maxH = adjacentToGoal ? 3 : 4;
  const heights = adjacentToGoal ? [1, 2, 3] : [1, 2, 3, 4];
  return (
    <div className="relative">
      <button onClick={() => setShow(!show)}
        className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 flex items-center justify-center text-lg font-bold transition-all shadow-sm">
        +
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className={`absolute z-50 bottom-0 ${side === "left" ? "left-12" : "right-12"} bg-white rounded-xl border border-gray-200 shadow-xl p-4 w-52`}>
            <p className="text-xs font-semibold text-gray-700 mb-3">Add section ({side})</p>
            {[2, 1].map(w => (
              <div key={w} className="mb-3">
                <p className="text-xs text-gray-400 mb-1.5">{w}m panel</p>
                <div className="flex gap-1.5">
                  {heights.map(h => (
                    <button key={h} onClick={() => { onAdd(w, h); setShow(false); }}
                      className="flex-1 py-1.5 text-xs font-medium rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                      {h}m
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!adjacentToGoal && (
              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs text-gray-400 mb-1.5">Curved corner</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(h => (
                    <button key={h} onClick={() => { onAddCorner(h); setShow(false); }}
                      className="flex-1 py-1.5 text-xs font-medium rounded-lg border-2 border-blue-200 bg-blue-50 hover:border-blue-400 text-blue-600 transition-all">
                      {h}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Configurator ───────────────────────────────────────────────────────
function Configurator({ court, setCourt, onBack }) {
  const [activeTab, setActiveTab] = useState("2d");
  const [selection, setSelection] = useState(null);

  const onSelectSection = useCallback((wall, index) => setSelection({ type: "section", wall, index }), []);
  const onSelectWall = useCallback((wall) => setSelection({ type: "wall", wall }), []);

  const updateSectionHeight = useCallback((wallId, index, newHeight) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      c.walls[wallId].sections[index].height = newHeight;
      return c;
    });
  }, [setCourt]);

  const toggleGate = useCallback((wallId, index) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      const s = c.walls[wallId].sections[index];
      if (s.width !== 2) return prev;
      s.type = s.type === "gate" ? "panel" : "gate";
      return c;
    });
  }, [setCourt]);

  const toggleChicane = useCallback((wallId, index) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      const s = c.walls[wallId].sections[index];
      if (s.width !== 2) return prev;
      s.type = s.type === "chicane" ? "panel" : "chicane";
      return c;
    });
  }, [setCourt]);

  const toggleMiniGoal = useCallback((wallId, index) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      const s = c.walls[wallId].sections[index];
      if (s.width !== 2) return prev;
      if (s.type === "minigoal") {
        s.type = "panel";
      } else {
        s.type = "minigoal";
        s.height = Math.max(s.height, 1);
      }
      return c;
    });
  }, [setCourt]);

  const updateWallHeight = useCallback((wallId, newHeight) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      c.walls[wallId].sections.forEach((s, idx) => {
        if (s.type === "goal") return;
        if (s.type === "curvedCorner") { s.height = newHeight; return; }
        const secs = c.walls[wallId].sections;
        const p = idx > 0 ? secs[idx - 1] : null;
        const n = idx < secs.length - 1 ? secs[idx + 1] : null;
        s.height = (p?.type === "goal" || n?.type === "goal") ? Math.min(newHeight, 3) : newHeight;
      });
      return c;
    });
  }, [setCourt]);

  const addPanel = useCallback((side, width, height) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      const wall = c.walls.end1;
      if (side === "left") wall.sections.unshift({ type: "panel", width, height });
      else wall.sections.push({ type: "panel", width, height });
      c.width = wall.sections.reduce((s, sec) => s + sec.width, 0);
      return c;
    });
  }, [setCourt]);

  const addCurvedCorner = useCallback((side, height) => {
    setCourt(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      const wall = c.walls.end1;
      const corner = { type: "curvedCorner", width: CURVED_CORNER_SIZE, height };
      if (side === "left") wall.sections.unshift(corner);
      else wall.sections.push(corner);
      c.width = wall.sections.reduce((s, sec) => s + sec.width, 0);
      return c;
    });
  }, [setCourt]);

  // Determine if next panel added would be adjacent to goal
  const isLeftAdjacentToGoal = useMemo(() => {
    if (!court.isEndWallOnly) return true;
    const secs = court.walls.end1.sections;
    return secs[0]?.type === "goal";
  }, [court]);
  const isRightAdjacentToGoal = useMemo(() => {
    if (!court.isEndWallOnly) return true;
    const secs = court.walls.end1.sections;
    return secs[secs.length - 1]?.type === "goal";
  }, [court]);
  const leftHasCorner = useMemo(() => {
    if (!court.isEndWallOnly) return false;
    return court.walls.end1.sections[0]?.type === "curvedCorner";
  }, [court]);
  const rightHasCorner = useMemo(() => {
    if (!court.isEndWallOnly) return false;
    const secs = court.walls.end1.sections;
    return secs[secs.length - 1]?.type === "curvedCorner";
  }, [court]);

  const clearSelection = useCallback(() => setSelection(null), []);

  const tabs = [{ id: "2d", label: "2D Plan" }, { id: "3d", label: "3D View" }, { id: "bom", label: "BOM" }];

  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
      {/* Header - always visible */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M12 5L7 10l5 5" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">Arena Configurator</h1>
            <p className="text-xs text-gray-400 truncate">
              {court.isEndWallOnly ? `End wall · ${court.width}m wide` : `${court.width}m × ${court.length}m · ${court.cornerType === "curved" ? "curved" : "90°"} corners`}
            </p>
          </div>
        </div>
        <div className="flex gap-0.5 bg-gray-100 rounded-xl p-0.5 flex-shrink-0 ml-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content - fills remaining space */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <div className="flex-1 overflow-hidden" onClick={clearSelection}>
          {activeTab === "2d" && <PlanView2D court={court} selection={selection} onSelectSection={onSelectSection} onSelectWall={onSelectWall} />}
          {activeTab === "3d" && <IsometricView court={court} selection={selection} onSelectSection={onSelectSection} onSelectWall={onSelectWall} />}
          {activeTab === "bom" && <BOMView court={court} />}
        </div>

        {selection && activeTab !== "bom" && (
          <div className="absolute bottom-3 right-3 left-3 sm:left-auto z-20 flex justify-center sm:justify-end">
            <SectionEditor court={court} selection={selection}
              onUpdateHeight={updateSectionHeight} onToggleGate={toggleGate}
              onToggleChicane={toggleChicane} onToggleMiniGoal={toggleMiniGoal}
              onUpdateWallHeight={updateWallHeight} onClose={clearSelection} />
          </div>
        )}

        {court.isEndWallOnly && activeTab === "2d" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 sm:gap-8 bg-white rounded-2xl border border-gray-200 shadow-xl px-4 sm:px-6 py-2.5">
            {!leftHasCorner ? (
              <EndWallAddPanel side="left" adjacentToGoal={isLeftAdjacentToGoal}
                onAdd={(w, h) => addPanel("left", w, h)} onAddCorner={(h) => addCurvedCorner("left", h)} />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7 Q 2 2, 7 2" stroke="#94a3b8" strokeWidth="2" fill="none" /></svg>
              </div>
            )}
            <span className="text-xs text-gray-400 font-medium">← Add sections →</span>
            {!rightHasCorner ? (
              <EndWallAddPanel side="right" adjacentToGoal={isRightAdjacentToGoal}
                onAdd={(w, h) => addPanel("right", w, h)} onAddCorner={(h) => addCurvedCorner("right", h)} />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2 Q 12 2, 12 7" stroke="#94a3b8" strokeWidth="2" fill="none" /></svg>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab !== "bom" && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 py-1.5 border-t border-gray-100 bg-white flex-shrink-0">
          <span className="text-xs text-gray-400 font-medium">Panels:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PANEL_BLUE }} />
            <span className="text-xs text-gray-500">Bar/Mesh</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: GOAL_FRAME_GREY, border: "1px solid #9ca3af" }} />
            <span className="text-xs text-gray-500">Goal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: GATE_GREY }} />
            <span className="text-xs text-gray-500">Gate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: MINIGOAL_WHITE, border: "1px solid #c0c4cc" }} />
            <span className="text-xs text-gray-500">Mini Goal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#e8ecf4", border: "1px dashed #7888a4" }} />
            <span className="text-xs text-gray-500">Chicane</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: POST_GREY, border: "1px solid #8a929e" }} />
            <span className="text-xs text-gray-500">Post</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
export default function ArenaApp() {
  const [screen, setScreen] = useState("landing");
  const [court, setCourt] = useState(null);

  const handleChoice = (choice) => {
    if (choice === "endwall") { setCourt(generateEndWallOnly()); setScreen("configurator"); }
    else setScreen("setup");
  };
  const handleGenerate = (form) => { setCourt(generateCourt(form.width, form.length, form.endHeight, form.sideHeight)); setScreen("configurator"); };
  const handleBack = () => { setCourt(null); setScreen("landing"); };

  if (screen === "landing") return <LandingScreen onChoice={handleChoice} />;
  if (screen === "setup") return <SetupForm onGenerate={handleGenerate} onBack={handleBack} />;
  if (screen === "configurator" && court) return <Configurator court={court} setCourt={setCourt} onBack={handleBack} />;
  return <LandingScreen onChoice={handleChoice} />;
}