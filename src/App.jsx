import { useState, useEffect, useRef } from "react";
import { CHECKLISTS, STATUS_OPTIONS, SERVIDORES } from "./data";
import { DISPATCH_TEMPLATES } from "./dispatchTemplates";
import { I } from "./icons";
import { Background } from "./Background";
import { HoverBorderGradient } from "./HoverBorderGradient";

const generateId = () => Math.random().toString(36).substr(2, 9);
const today = () => new Date().toISOString().split("T")[0];

// ============================================================
// AI ANALYSIS ENGINE
// ============================================================
const AI_CONFIG = {
  AI_ENABLED: false, // ← Mude para true quando backend + .env estiverem prontos
  API_ENDPOINT: "/api/analyze-document", // ← URL do backend proxy
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result.split(",")[1]);
  r.onerror = () => reject(new Error("Erro ao ler arquivo"));
  r.readAsDataURL(file);
});

const buildAnalysisPrompt = (checklistType, checklistData) => {
  const allItems = [];
  let idx = 0;
  checklistData.sections.forEach((section) => {
    section.items.forEach((item) => { allItems.push({ index: idx, section: section.title, item }); idx++; });
  });
  return `Você é um analista especializado em licitações e compras públicas da Prefeitura de Boituva, com base na Lei Federal 14.133/21 e Decreto Municipal.\n\nAnalise o documento enviado e verifique cada item do checklist abaixo.\nPara cada item, responda APENAS com um JSON no formato:\n\n{"results":[{"index":0,"found":true,"confidence":"alta","evidence":"Trecho encontrado","observation":"Obs"}],"summary":"Resumo","missing_critical":["Itens críticos faltando"],"recommendations":["Recomendações"]}\n\nOnde:\n- "found": true/false\n- "confidence": "alta", "media" ou "baixa"\n- "evidence": trecho relevante ou null\n- "observation": nota adicional ou null\n\nCHECKLIST TIPO ${checklistType.toUpperCase()} - ${checklistData.title}:\n\n${allItems.map((i) => `[${i.index}] (${i.section}) ${i.item}`).join("\n")}\n\nIMPORTANTE: Seja rigoroso. Prefira falso negativo. Responda SOMENTE JSON.`;
};

const analyzeDocumentWithAI = async (file, checklistType, checklistData) => {
  if (!AI_CONFIG.AI_ENABLED) {
    return { success: false, reason: "AI_NOT_CONFIGURED", message: "Configure a API key no .env do backend para ativar." };
  }
  try {
    const base64 = await fileToBase64(file);
    const prompt = buildAnalysisPrompt(checklistType, checklistData);
    const response = await fetch(AI_CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: base64, fileType: file.type, fileName: file.name, checklistType, prompt }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { success: true, data: await response.json() };
  } catch (error) {
    return { success: false, reason: "API_ERROR", message: error.message };
  }
};

const applyAIResults = (aiData, currentChecked) => {
  const newChecked = { ...currentChecked };
  const annotations = {};
  if (aiData?.results) {
    aiData.results.forEach((r) => {
      if (r.found && r.confidence === "alta") newChecked[r.index] = true;
      annotations[r.index] = { found: r.found, confidence: r.confidence, evidence: r.evidence, observation: r.observation, autoChecked: r.found && r.confidence === "alta" };
    });
  }
  return { newChecked, annotations, summary: aiData?.summary, missingCritical: aiData?.missing_critical, recommendations: aiData?.recommendations };
};

function StatusBadge({ status }) {
  const o = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: o.color + "18", color: o.color, fontFamily: "'DM Sans', sans-serif" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: o.color }} />{o.label}</span>;
}

function ProgressRing({ percent, size = 48, stroke = 4, color = "#2563eb" }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c - (percent / 100) * c;
  return <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} /></svg>;
}

function AIBadge({ annotation }) {
  if (!annotation) return null;
  const colors = { alta: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", dot: "#22c55e" }, media: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#f59e0b" }, baixa: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#ef4444" } };
  const cc = colors[annotation.confidence] || colors.baixa;
  return (
    <div style={{ marginTop: 4, marginLeft: 34 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 6, background: cc.bg, border: `1px solid \${cc.border}`, fontSize: 11, color: cc.text, fontFamily: "'DM Sans', sans-serif" }}>
        {I.bot}<span style={{ width: 6, height: 6, borderRadius: "50%", background: cc.dot }} /><span style={{ fontWeight: 600 }}>{annotation.found ? "Encontrado" : "Não encontrado"} · {annotation.confidence}</span>
        {annotation.autoChecked && <span style={{ background: "#059669", color: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>AUTO</span>}
      </div>
      {annotation.evidence && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", fontStyle: "italic", lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>"{annotation.evidence}"</p>}
      {annotation.observation && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#f59e0b", fontFamily: "'DM Sans', sans-serif" }}>Obs: {annotation.observation}</p>}
    </div >
  );
}

function AIPanel({ processo, checklist, onApplyResults, onUpdate }) {
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const ref = useRef(null);

  const start = async () => {
    if (!file) return;
    setState("uploading");
    const nf = { id: generateId(), name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString(), analyzedByAI: true };
    onUpdate(processo.id, { arquivos: [...(processo.arquivos || []), nf] });
    setState("analyzing");
    const res = await analyzeDocumentWithAI(file, processo.tipo, checklist);
    if (res.success) { setResult(res.data); setState("done"); }
    else if (res.reason === "AI_NOT_CONFIGURED") { setState("not_configured"); }
    else { setState("error"); setResult({ error: res.message }); }
  };

  const apply = () => {
    if (result) {
      const r = applyAIResults(result, processo.checked || {});
      onApplyResults(r.newChecked, r.annotations, r.summary, r.missingCritical, r.recommendations);
    }
  };

  const bg = { idle: "#f8fafc", uploading: "#eff6ff", analyzing: "#f5f3ff", done: "#f0fdf4", error: "#fef2f2", not_configured: "#fffbeb" };
  const bd = { idle: "#e2e8f0", uploading: "#bfdbfe", analyzing: "#c4b5fd", done: "#bbf7d0", error: "#fecaca", not_configured: "#fed7aa" };

  return (
    <div style={{ background: bg[state], border: `2px solid \${bd[state]}`, borderRadius: 16, padding: 24, marginBottom: 24, transition: "all 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{I.brain}</div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif" }}>Análise Inteligente de Documentos</h3>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>{AI_CONFIG.AI_ENABLED ? "Envie um documento para análise automática" : "Configure a API key no .env para ativar a IA"}</p>
        </div>
      </div>

      {(state === "idle" || state === "not_configured") && (
        <div>
          <div onClick={() => ref.current?.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", border: "2px dashed #c4b5fd", borderRadius: 14, cursor: "pointer", background: "#faf5ff", marginBottom: 16 }}>
            <span style={{ color: "#8b5cf6" }}>{I.up}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#6d28d9", fontFamily: "'DM Sans', sans-serif" }}>{file ? file.name : "Selecione o documento para análise"}</span>
            <span style={{ fontSize: 12, color: "#a78bfa", fontFamily: "'DM Sans', sans-serif" }}>PDF, imagem ou documento de texto</span>
            <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
          </div>
          {file && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={start} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 24px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                {I.brain} {AI_CONFIG.AI_ENABLED ? "Analisar com IA" : "Enviar Documento"}
              </button>
              <button onClick={() => setFile(null)} style={{ padding: "14px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", color: "#64748b" }}>{I.cls}</button>
            </div>
          )}
          {state === "not_configured" && (
            <div style={{ marginTop: 16, padding: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#f59e0b", flexShrink: 0 }}>{I.wrn}</span>
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#92400e", fontFamily: "'DM Sans', sans-serif" }}>IA não configurada — Documento salvo com sucesso</p>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#a16207", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>Para ativar a análise automática:</p>
                  <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", lineHeight: 1.8 }}>
                    <div style={{ color: "#94a3b8" }}># 1. Backend → .env:</div>
                    <div>ANTHROPIC_API_KEY=sk-ant-xxxxxxxx</div>
                    <br />
                    <div style={{ color: "#94a3b8" }}># 2. Crie POST /api/analyze-document</div>
                    <div style={{ color: "#94a3b8" }}># (recebe arquivo + prompt, chama API Anthropic)</div>
                    <br />
                    <div style={{ color: "#94a3b8" }}># 3. No código, mude:</div>
                    <div>AI_ENABLED: <span style={{ color: "#4ade80" }}>true</span></div>
                  </div>
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "#a16207", fontFamily: "'DM Sans', sans-serif" }}>Enquanto isso, preencha o checklist manualmente.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {state === "analyzing" && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ display: "inline-flex", gap: 6, marginBottom: 16 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#8b5cf6", animation: `pulse 1.2s ease-in-out \${i*0.2}s infinite` }} />)}</div>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#5b21b6", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>IA analisando o documento...</p>
          <style>{`@keyframes pulse { 0%,80%,100%{opacity:.3;transform:scale(.8)} 40%{opacity:1;transform:scale(1.2)} }`}</style>
        </div>
      )}

      {state === "done" && result && (
        <div>
          {result.summary && (
            <div style={{ padding: 16, background: "#ecfdf5", borderRadius: 12, marginBottom: 16, border: "1px solid #a7f3d0" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#065f46", fontFamily: "'DM Sans', sans-serif" }}>Resumo da Análise</p>
              <p style={{ margin: 0, fontSize: 13, color: "#047857", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>{result.summary}</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={apply} style={{ flex: 1, padding: "12px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{I.chk} Aplicar no Checklist</button>
            <button onClick={() => { setState("idle"); setFile(null); setResult(null); }} style={{ padding: "12px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Nova Análise</button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div style={{ padding: 16, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#991b1b", fontFamily: "'DM Sans', sans-serif" }}>Erro: {result?.error || "Desconhecido"}</p>
          <button onClick={() => { setState("idle"); setResult(null); }} style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Tentar Novamente</button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ currentView, setCurrentView, sidebarOpen, setSidebarOpen }) {
  const isCollapsed = sidebarOpen;
  const setCollapsed = setSidebarOpen;

  const nav = [
    { id: "dashboard", label: "Painel de Gestão", icon: I.dash },
    { id: "novo_processo", label: "Novo Processo", icon: I.plus },
    { id: "checklists", label: "Checklists", icon: I.clip },
    { id: "despachos", label: "Despachos", icon: I.doc },
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? 88 : 280,
        background: "transparent",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        color: "#1e293b",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        flexShrink: 0,
        transition: "width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
        overflow: "hidden"
      }}
    >
      <div style={{ padding: isCollapsed ? "24px 0" : "28px 24px", display: "flex", flexDirection: isCollapsed ? "column" : "row", alignItems: "center", gap: isCollapsed ? 16 : 0, justifyContent: isCollapsed ? "center" : "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)", transition: "all 0.4s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/brasao_user.png"
            alt="Brasão de Boituva"
            style={{ height: isCollapsed ? 36 : 46, width: "auto", transition: "height 0.3s", filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}
          />
          {!isCollapsed && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "0.5px", lineHeight: 1 }}>Compras</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "2.5px", lineHeight: 1 }}>Boituva</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 10, transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {isCollapsed ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          )}
        </button>
      </div>

      <nav style={{ flex: 1, padding: isCollapsed ? "24px 12px" : "24px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {nav.map((n) => {
          const active = currentView === n.id;
          const content = (
            <div
              onClick={() => setCurrentView(n.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: 14, width: "100%", padding: isCollapsed ? "14px 0" : "14px 18px", background: "transparent", color: active ? "#ffffff" : "#94a3b8", cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 500, transition: "all 0.3s" }}
            >
              <div style={{ flexShrink: 0, opacity: active ? 1 : 0.8, transform: active ? "scale(1.05)" : "scale(1)", transition: "all 0.3s" }}>{n.icon}</div>
              {!isCollapsed && <span style={{ whiteSpace: "nowrap" }}>{n.label}</span>}
            </div>
          );

          if (active) {
            return (
              <HoverBorderGradient key={n.id} as="button" containerClassName="w-full" className="w-full rounded-xl !bg-[#0a0f1e] !p-0" duration={1.5}>
                {content}
              </HoverBorderGradient>
            );
          }
          return (
            <button
              key={n.id}
              style={{ width: "100%", borderRadius: 12, border: "none", background: "transparent", padding: 0 }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
            >
              {content}
            </button>
          );
        })}
      </nav>

      <div style={{ margin: isCollapsed ? "0 12px 24px" : "0 16px 16px", padding: isCollapsed ? "14px 0" : "16px", background: "rgba(0,0,0,0.2)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: AI_CONFIG.AI_ENABLED ? "#10b981" : "#f59e0b", boxShadow: AI_CONFIG.AI_ENABLED ? "0 0 12px rgba(16,185,129,0.5)" : "0 0 12px rgba(245,158,11,0.3)" }} />
          {!isCollapsed && <span style={{ fontSize: 13, fontWeight: 600, color: AI_CONFIG.AI_ENABLED ? "#34d399" : "#fbbf24", fontFamily: "'DM Sans', sans-serif" }}>{AI_CONFIG.AI_ENABLED ? "IA Ativa" : "IA Pendente"}</span>}
        </div>
        {!isCollapsed && <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Sans', sans-serif", marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>{AI_CONFIG.AI_ENABLED ? "Análise automática habilitada" : "Falta configuração"}</span>}
      </div>
      {!isCollapsed && <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#475569", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", letterSpacing: "0.5px", fontWeight: 500 }}>Fase Interna · 14.133/21</div>}
    </aside>
  );
}

function Dashboard({ processos, setCurrentView, setSelectedProcesso }) {
  const stats = { total: processos.length, em: processos.filter(p => !["concluido", "suspenso"].includes(p.status)).length, ok: processos.filter(p => p.status === "concluido").length, sus: processos.filter(p => p.status === "suspenso").length };
  const byStatus = STATUS_OPTIONS.map(s => ({ ...s, count: processos.filter(p => p.status === s.value).length })).filter(s => s.count > 0);
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: 0 }}>Painel de Gestão</h1>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Visão geral dos processos · Fase interna</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[{ l: "Total", v: stats.total, c: "#2563eb" }, { l: "Em Andamento", v: stats.em, c: "#f59e0b" }, { l: "Concluídos", v: stats.ok, c: "#22c55e" }, { l: "Suspensos", v: stats.sus, c: "#ef4444" }].map(d => (
          <div key={d.l} style={{ background: "#fff", borderRadius: 16, padding: "24px 20px", border: "1px solid #e2e8f0", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: d.c }} />
            <div style={{ fontSize: 32, fontWeight: 800, color: d.c, fontFamily: "'DM Sans', sans-serif" }}>{d.v}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{d.l}</div>
          </div>
        ))}
      </div>
      {byStatus.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Distribuição por Status</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {byStatus.map(s => <div key={s.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: s.color + "10", borderRadius: 10, border: `1px solid \${s.color}30` }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} /><span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.count}</span><span style={{ fontSize: 12, color: "#64748b" }}>{s.label}</span></div>)}
          </div>
        </div>
      )}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Processos</h3>
          <button onClick={() => setCurrentView("novo_processo")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{I.plus} Novo</button>
        </div>
        {processos.length === 0 ? <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><div style={{ fontSize: 15, fontWeight: 500 }}>Nenhum processo</div><div style={{ fontSize: 13, marginTop: 4 }}>Clique em "Novo" para começar</div></div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif" }}>
              <thead><tr style={{ borderBottom: "1px solid #e2e8f0" }}>{["Processo", "Secretaria", "Tipo", "Responsável", "Status", "Progresso"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}</tr></thead>
              <tbody>
                {processos.map(p => {
                  const cl = CHECKLISTS[p.tipo];
                  const tot = cl ? cl.sections.reduce((s, sec) => s + sec.items.length, 0) : 0;
                  const chk = p.checked ? Object.values(p.checked).filter(Boolean).length : 0;
                  const pct = tot > 0 ? Math.round((chk / tot) * 100) : 0;
                  return (
                    <tr key={p.id} onClick={() => { setSelectedProcesso(p); setCurrentView("checklists"); }} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>{p.numero || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#475569" }}>{p.secretaria || "—"}</td>
                      <td style={{ padding: "14px 16px" }}><span style={{ fontSize: 12, fontWeight: 600, color: cl?.color, background: (cl?.color || "#64748b") + "15", padding: "3px 10px", borderRadius: 6 }}>{p.tipo?.toUpperCase()}</span></td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#475569" }}>{p.responsavel || "—"}</td>
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={p.status} /></td>
                      <td style={{ padding: "14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProgressRing percent={pct} size={32} stroke={3} color={cl?.color} /><span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{pct}%</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function NovoProcesso({ onSave, onCancel }) {
  const [f, setF] = useState({ numero: "", secretaria: "", objeto: "", tipo: "a", responsavel: SERVIDORES[0], status: "aguardando_dfd", dataCriacao: today(), prazo: "" });
  const save = () => { if (!f.secretaria) { alert("Preencha a secretaria."); return; } onSave({ ...f, id: generateId(), checked: {}, arquivos: [], observacoes: "", aiAnnotations: {} }); };
  const fs = { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
  const ls = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" };
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Novo Processo</h1>
      <p style={{ color: "#64748b", margin: "0 0 32px", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Preencha os dados iniciais</p>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, maxWidth: 700 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div><label style={ls}>Nº Processo</label><input style={fs} value={f.numero} onChange={e => setF({ ...f, numero: e.target.value })} placeholder="Ex: 001/2026" /></div>
          <div><label style={ls}>Secretaria *</label><input style={fs} value={f.secretaria} onChange={e => setF({ ...f, secretaria: e.target.value })} placeholder="Ex: Educação" /></div>
        </div>
        <div style={{ marginBottom: 20 }}><label style={ls}>Objeto</label><input style={fs} value={f.objeto} onChange={e => setF({ ...f, objeto: e.target.value })} placeholder="Descrição do objeto" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div><label style={ls}>Tipo de Checklist</label><select style={{ ...fs, background: "#fff" }} value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>{Object.entries(CHECKLISTS).map(([k, v]) => <option key={k} value={k}>{k.toUpperCase()}) {v.title}</option>)}</select></div>
          <div><label style={ls}>Responsável</label><select style={{ ...fs, background: "#fff" }} value={f.responsavel} onChange={e => setF({ ...f, responsavel: e.target.value })}>{SERVIDORES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div><label style={ls}>Status</label><select style={{ ...fs, background: "#fff" }} value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div><label style={ls}>Prazo</label><input type="date" style={fs} value={f.prazo} onChange={e => setF({ ...f, prazo: e.target.value })} /></div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button onClick={save} style={{ padding: "12px 32px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Criar Processo</button>
          <button onClick={onCancel} style={{ padding: "12px 24px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function ChecklistView({ processo, onUpdate, processos, setSelectedProcesso }) {
  const [expanded, setExpanded] = useState({});
  const [selId, setSelId] = useState(processo?.id || "");
  const [showAI, setShowAI] = useState(true);
  useEffect(() => { if (processo) setSelId(processo.id); }, [processo]);
  const cur = processos.find(p => p.id === selId) || processo;
  if (!cur) return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontFamily: "'DM Sans', sans-serif" }}><div style={{ fontSize: 48, marginBottom: 16 }}>📋</div><div style={{ fontSize: 16, fontWeight: 500 }}>Selecione um processo no painel</div></div>;
  const cl = CHECKLISTS[cur.tipo]; if (!cl) return null;
  const chkd = cur.checked || {}, ann = cur.aiAnnotations || {};
  const tot = cl.sections.reduce((s, sec) => s + sec.items.length, 0);
  const cnt = Object.values(chkd).filter(Boolean).length;
  const pct = tot > 0 ? Math.round((cnt / tot) * 100) : 0;
  const hasAnn = Object.keys(ann).length > 0;
  const toggle = k => { onUpdate(cur.id, { checked: { ...chkd, [k]: !chkd[k] } }); };
  const toggleSec = i => setExpanded(p => ({ ...p, [i]: !p[i] }));
  const handleUpload = e => {
    const files = Array.from(e.target.files || []).map(f => ({ id: generateId(), name: f.name, size: f.size, type: f.type, uploadedAt: new Date().toISOString() }));
    onUpdate(cur.id, { arquivos: [...(cur.arquivos || []), ...files] });
  };
  const handleAI = (nc, na, sum, mc, rec) => onUpdate(cur.id, { checked: nc, aiAnnotations: na, aiSummary: sum, aiMissingCritical: mc, aiRecommendations: rec, status: "revisao_servidor" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: 0 }}>{cl.title}</h1><p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{cur.numero ? `Processo \${cur.numero} · ` : ""}{cur.secretaria || ""}</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {processos.length > 1 && <select value={selId} onChange={e => { setSelId(e.target.value); const p = processos.find(pp => pp.id === e.target.value); if (p) setSelectedProcesso(p); }} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff" }}>{processos.map(p => <option key={p.id} value={p.id}>{p.numero || "Sem nº"} – {p.secretaria || "—"}</option>)}</select>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><ProgressRing percent={pct} size={48} stroke={4} color={cl.color} /><div><div style={{ fontSize: 20, fontWeight: 800, color: cl.color, fontFamily: "'DM Sans', sans-serif" }}>{pct}%</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{cnt}/{tot}</div></div></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select value={cur.status} onChange={e => onUpdate(cur.id, { status: e.target.value })} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff" }}>{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select value={cur.responsavel} onChange={e => onUpdate(cur.id, { responsavel: e.target.value })} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: "#fff" }}>{SERVIDORES.map(s => <option key={s} value={s}>{s}</option>)}</select>
        {hasAnn && <button onClick={() => setShowAI(!showAI)} style={{ padding: "8px 16px", background: showAI ? "#8b5cf620" : "#f1f5f9", border: `1px solid \${showAI ? "#8b5cf6" : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: showAI ? "#6d28d9" : "#475569", display: "flex", alignItems: "center", gap: 6 }}>{I.bot} {showAI ? "Ocultar IA" : "Mostrar IA"}</button>}
      </div>

      <AIPanel processo={cur} checklist={cl} onApplyResults={handleAI} onUpdate={onUpdate} />

      {cur.aiSummary && (
        <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ color: "#7c3aed" }}>{I.brain}</span><span style={{ fontSize: 14, fontWeight: 700, color: "#5b21b6", fontFamily: "'DM Sans', sans-serif" }}>Diagnóstico da IA</span><span style={{ fontSize: 10, padding: "2px 8px", background: "#7c3aed", color: "#fff", borderRadius: 4, fontWeight: 700 }}>Revisar</span></div>
          <p style={{ fontSize: 13, color: "#4c1d95", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: 0 }}>{cur.aiSummary}</p>
          {cur.aiRecommendations?.length > 0 && <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #ddd6fe" }}><p style={{ fontSize: 12, fontWeight: 600, color: "#6d28d9", marginBottom: 6 }}>Recomendações:</p>{cur.aiRecommendations.map((r, i) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}><span style={{ color: "#8b5cf6", fontSize: 11 }}>→</span><span style={{ fontSize: 12, color: "#5b21b6" }}>{r}</span></div>)}</div>}
        </div>
      )}

      {(() => {
        let gi = 0; return cl.sections.map((sec, si) => {
          const items = sec.items.map(item => ({ item, idx: gi++ }));
          const sc = items.filter(i => chkd[i.idx]).length, st = items.length;
          const isExp = expanded[si] !== false;
          return (
            <div key={si} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", marginBottom: 12, overflow: "hidden" }}>
              <button onClick={() => toggleSec(si)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: "none", background: sc === st && st > 0 ? "#f0fdf4" : "transparent", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: sc === st && st > 0 ? "#22c55e" : cl.color + "15", color: sc === st && st > 0 ? "#fff" : cl.color }}>{sc === st && st > 0 ? I.chk : <span style={{ fontSize: 12, fontWeight: 700 }}>{sc}</span>}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>{sec.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 12, color: "#94a3b8" }}>{sc}/{st}</span><span style={{ transform: isExp ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", color: "#94a3b8" }}>{I.chv}</span></div>
              </button>
              {isExp && (
                <div style={{ padding: "0 20px 16px" }}>
                  {sec.alert && <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, marginBottom: 12 }}><span style={{ color: "#d97706", flexShrink: 0 }}>{I.wrn}</span><span style={{ fontSize: 12, color: "#92400e", fontFamily: "'DM Sans', sans-serif" }}>{sec.alert}</span></div>}
                  {sec.info && <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, marginBottom: 12 }}><span style={{ color: "#3b82f6", flexShrink: 0 }}>{I.inf}</span><span style={{ fontSize: 12, color: "#1e40af", fontFamily: "'DM Sans', sans-serif" }}>{sec.info}</span></div>}
                  {items.map(({ item, idx }) => (
                    <div key={idx}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>
                        <div onClick={e => { e.preventDefault(); toggle(idx); }} style={{ width: 22, height: 22, borderRadius: 6, border: chkd[idx] ? "none" : "2px solid #cbd5e1", background: chkd[idx] ? (ann[idx]?.autoChecked ? "#8b5cf6" : cl.color) : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, cursor: "pointer" }}>{chkd[idx] && <span style={{ color: "#fff" }}>{I.chk}</span>}</div>
                        <span style={{ fontSize: 13, color: chkd[idx] ? "#94a3b8" : "#374151", textDecoration: chkd[idx] ? "line-through" : "none", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{item}{ann[idx]?.autoChecked && <span style={{ marginLeft: 8, fontSize: 10, padding: "1px 6px", background: "#8b5cf620", color: "#7c3aed", borderRadius: 4, fontWeight: 700 }}>IA</span>}</span>
                      </label>
                      {showAI && ann[idx] && <AIBadge annotation={ann[idx]} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        });
      })()}

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, marginTop: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>{I.up} Arquivos Adicionais</h3>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 16px", border: "2px dashed #d1d5db", borderRadius: 12, cursor: "pointer", background: "#f8fafc" }}>
          <span style={{ color: "#94a3b8" }}>{I.up}</span><span style={{ fontSize: 13, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>Anexar documentos complementares</span>
          <input type="file" multiple onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {(cur.arquivos || []).length > 0 && <div style={{ marginTop: 16 }}>{cur.arquivos.map(f => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: f.analyzedByAI ? "#f5f3ff" : "#f8fafc", borderRadius: 8, marginBottom: 6, border: `1px solid \${f.analyzedByAI ? "#ddd6fe" : "#e2e8f0"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: f.analyzedByAI ? "#8b5cf6" : cl.color }}>{f.analyzedByAI ? I.bot : I.fil}</span><span style={{ fontSize: 13, color: "#374151" }}>{f.name}</span>{f.analyzedByAI && <span style={{ fontSize: 10, padding: "2px 6px", background: "#8b5cf6", color: "#fff", borderRadius: 4, fontWeight: 700 }}>IA</span>}<span style={{ fontSize: 11, color: "#94a3b8" }}>{(f.size / 1024).toFixed(0)} KB</span></div>
            <button onClick={() => onUpdate(cur.id, { arquivos: (cur.arquivos || []).filter(x => x.id !== f.id) })} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}>{I.del}</button>
          </div>
        ))}</div>}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, marginTop: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Observações</h3>
        <textarea value={cur.observacoes || ""} onChange={e => onUpdate(cur.id, { observacoes: e.target.value })} placeholder="Anotações, pendências..." style={{ width: "100%", minHeight: 100, padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

function DespachosView() {
  const [tmpl, setTmpl] = useState("validacao_cotacao");
  const [fd, setFd] = useState({ objeto: "", prazo: "5", numDespacho: "" });
  const [gen, setGen] = useState("");
  const [cop, setCop] = useState(false);
  const go = () => { const t = DISPATCH_TEMPLATES[tmpl]; if (t) setGen(t.template(fd)); };
  const cp = () => { navigator.clipboard.writeText(gen).then(() => { setCop(true); setTimeout(() => setCop(false), 2000); }); };
  const fs = { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };
  const ls = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" };
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Gerador de Despachos</h1>
      <p style={{ color: "#64748b", margin: "0 0 32px", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Modelos padronizados</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 1000 }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24 }}>
          <div style={{ marginBottom: 20 }}><label style={ls}>Modelo</label><select style={{ ...fs, background: "#fff" }} value={tmpl} onChange={e => setTmpl(e.target.value)}>{Object.entries(DISPATCH_TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}</select></div>
          {tmpl === "etp_engenharia" && <div style={{ marginBottom: 20 }}><label style={ls}>Objeto</label><input style={fs} value={fd.objeto} onChange={e => setFd({ ...fd, objeto: e.target.value })} placeholder="Ex: manutenção predial" /></div>}
          {(tmpl === "lancamento_sistema" || tmpl === "ausencia_resposta") && <div style={{ marginBottom: 20 }}><label style={ls}>Nº Despacho Anterior</label><input style={fs} value={fd.numDespacho} onChange={e => setFd({ ...fd, numDespacho: e.target.value })} placeholder="Ex: 045/2026" /></div>}
          <div style={{ marginBottom: 24 }}><label style={ls}>Prazo (dias úteis)</label><input style={fs} value={fd.prazo} onChange={e => setFd({ ...fd, prazo: e.target.value })} placeholder="Ex: 5" /></div>
          <button onClick={go} style={{ padding: "12px 32px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", width: "100%" }}>Gerar Despacho</button>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Pré-visualização</span>
            {gen && <button onClick={cp} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: cop ? "#22c55e" : "#f1f5f9", color: cop ? "#fff" : "#475569", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{I.cpy} {cop ? "Copiado!" : "Copiar"}</button>}
          </div>
          {gen ? <div style={{ flex: 1, padding: 20, background: "#fafaf9", borderRadius: 10, border: "1px solid #e7e5e4", fontSize: 13, color: "#1c1917", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8, whiteSpace: "pre-wrap", overflowY: "auto", maxHeight: 500 }}>{gen}</div> : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>Preencha e clique "Gerar Despacho"</div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [procs, setProcs] = useState([]);
  const [sel, setSel] = useState(null);
  const add = p => { setProcs(prev => [p, ...prev]); setSel(p); setView("checklists"); };
  const upd = (id, u) => { setProcs(prev => prev.map(p => p.id === id ? { ...p, ...u } : p)); if (sel?.id === id) setSel(prev => ({ ...prev, ...u })); };
  const render = () => {
    switch (view) {
      case "dashboard": return <Dashboard processos={procs} setCurrentView={setView} setSelectedProcesso={setSel} />;
      case "novo_processo": return <NovoProcesso onSave={add} onCancel={() => setView("dashboard")} />;
      case "checklists": return <ChecklistView processo={sel} onUpdate={upd} processos={procs} setSelectedProcesso={setSel} />;
      case "despachos": return <DespachosView />;
      default: return <Dashboard processos={procs} setCurrentView={setView} setSelectedProcesso={setSel} />;
    }
  };
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#f1f5f9}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}input:focus,select:focus,textarea:focus{border-color:#2563eb!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}`}</style>
      <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', sans-serif", position: "relative", background: "transparent" }}>
        <Background />
        <div style={{ zIndex: 20 }}><Sidebar currentView={view} setCurrentView={setView} sidebarOpen={sidebar} setSidebarOpen={setSidebar} /></div>
        <main style={{ flex: 1, overflow: "auto", position: "relative", zIndex: 10 }}>
          <div style={{ padding: "32px 32px 48px", maxWidth: 1200, margin: "0 auto" }}>{render()}</div>
        </main>
      </div>
    </>
  );
}
