import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Download,
  Plus,
  X,
  Trash2,
  ArrowRight,
  Clock,
  FileText,
  Sparkles,
  Eye,
  Edit3,
  Upload,
  Printer,
  Paperclip
} from 'lucide-react';

const BRAND_PRESETS = {
  fintech: {
    id: 'fintech',
    label: 'FinTech & Banking',
    shortLabel: 'FinTech',
    framework: 'SEC / FINRA Marketing Rule 206(4)-1',
    voice: 'Authoritative & Transparent',
    bannedPhrases: [
      'guaranteed returns',
      'risk-free',
      'get rich',
      '100% safe',
      'foolproof'
    ],
    requiredDisclaimers: [
      'Past performance is not indicative of future results. Investing involves risk, including possible loss of principal.'
    ],
    highRiskDraft: `STOP LEAVING MONEY ON THE TABLE!!! Join Apex Yield today and lock in GUARANTEED RETURNS of 18% APY with our 100% safe algorithmic treasury vault. It is completely risk-free and the fastest way to get rich in 2026! Our foolproof AI portfolio engine NEVER loses. Sign up in 60 seconds and watch your wealth double overnight!!`,
    cleanDraft: `Optimize your corporate treasury with Apex Yield's institutional liquidity platform. Designed for finance teams seeking disciplined cash management, our automated allocation workflows provide real-time visibility, multi-custodian diversification, and transparent fee reporting.\n\nPast performance is not indicative of future results. Investing involves risk, including possible loss of principal.`
  },
  wellness: {
    id: 'wellness',
    label: 'Health & Wellness',
    shortLabel: 'Wellness',
    framework: 'FDA & FTC Health Claims',
    voice: 'Empathetic & Evidence-Based',
    bannedPhrases: [
      'cure',
      'miracle',
      'clinically proven',
      'instant results',
      'heals overnight'
    ],
    requiredDisclaimers: [
      'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.'
    ],
    highRiskDraft: `DISCOVER THE MIRACLE SLEEP FORMULA!! Tired of chronic insomnia? NeuroCalm Capsules are clinically proven to cure anxiety and deliver instant results from the very first dose! Our botanical blend heals overnight with ZERO side effects. Ditch your prescriptions today and wake up 100% transformed!!!`,
    cleanDraft: `Support a calmer evening routine with NeuroCalm. Formulated with magnesium glycinate, L-theanine, and chamomile extract, each capsule is designed to complement healthy sleep hygiene and help your body unwind naturally after demanding days.\n\nThese statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.`
  },
  saas: {
    id: 'saas',
    label: 'B2B SaaS',
    shortLabel: 'B2B SaaS',
    framework: 'Enterprise Brand Governance',
    voice: 'Crisp & Technical',
    bannedPhrases: [
      'cheap',
      'revolutionary',
      'best in the world',
      'no-brainer',
      'game-changer'
    ],
    requiredDisclaimers: [
      'Enterprise SLA terms and pricing vary by deployment tier.'
    ],
    highRiskDraft: `UPGRADE YOUR STACK NOW!! NexusCloud is the BEST IN THE WORLD observability platform and an absolute no-brainer for engineering leaders! Our revolutionary, game-changer telemetry agent is super cheap compared to legacy tools and cuts cloud bills by 90% INSTANTLY!!! Book a demo before your competitors crush you!`,
    cleanDraft: `Reduce mean time to resolution across distributed microservices with NexusCloud. Built on OpenTelemetry with sub-second trace ingestion, our platform unifies logs, metrics, and APM diagnostics in a single SOC 2 Type II compliant control plane.\n\nEnterprise SLA terms and pricing vary by deployment tier.`
  }
};

const VOICE_OPTIONS = [
  'Authoritative & Transparent',
  'Empathetic & Evidence-Based',
  'Crisp & Technical',
  'Formal & Executive',
  'Approachable & Clear'
];

const SAFE_REPLACEMENTS = {
  'guaranteed returns': 'targeted yield potential',
  'risk-free': 'risk-managed',
  'get rich': 'build long-term wealth',
  '100% safe': 'institutionally safeguarded',
  foolproof: 'disciplined and systematic',
  cure: 'support daily wellness for',
  miracle: 'thoughtfully formulated',
  'clinically proven': 'research-backed',
  'instant results': 'consistent support over time',
  'heals overnight': 'supports nightly recovery',
  cheap: 'cost-efficient',
  revolutionary: 'modern, high-throughput',
  'best in the world': 'enterprise-grade',
  'no-brainer': 'high-ROI decision',
  'game-changer': 'operational advantage'
};

const ALLOWED_ACRONYMS = new Set([
  'SEC', 'FDA', 'FTC', 'FINRA', 'ROI', 'SLA', 'SOC', 'API', 'APM', 'APY',
  'SAAS', 'B2B', 'B2C', 'CEO', 'CFO', 'CTO', 'AI', 'ML', 'LLM', 'USD',
  'GDPR', 'HIPAA', 'ISO', 'KPI', 'OKR', 'FAQ', 'CRM', 'ERP', 'SSO', 'MFA'
]);

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overallScore: { type: 'INTEGER' },
    toneScore: { type: 'INTEGER' },
    legalScore: { type: 'INTEGER' },
    summary: { type: 'STRING' },
    violations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          phrase: { type: 'STRING' },
          severity: { type: 'STRING', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          category: { type: 'STRING' },
          reason: { type: 'STRING' }
        },
        required: ['phrase', 'severity', 'category', 'reason']
      }
    },
    compliantRewrite: { type: 'STRING' }
  },
  required: [
    'overallScore',
    'toneScore',
    'legalScore',
    'summary',
    'violations',
    'compliantRewrite'
  ]
};

function getGeminiApiKey() {
  try {
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  } catch {
    return '';
  }
}

async function fetchWithBackoff(url, options, maxRetries = 3, timeoutMs = 45000) {
  let delay = 1000;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) return response;
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    } catch (err) {
      clearTimeout(timer);
      if (attempt === maxRetries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
async function runGeminiAudit({ copy, guidelines, pdfAttachment }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Missing Gemini API key');
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const systemPrompt = `You are BrandGuard AI, an enterprise compliance officer and senior brand editor.
Audit the provided marketing copy and/or attached PDF document (including all text, tables, claims, and disclaimers) strictly against the provided Brand Guidelines.
Return structured JSON with:
- overallScore (0-100), toneScore (0-100), legalScore (0-100)
- summary: concise 1-2 sentence executive assessment
- violations: list of every issue with verbatim phrase from the copy or PDF (or "[Missing Disclaimer]" if a required disclaimer is absent), severity ("HIGH", "MEDIUM", or "LOW"), category, and clear reason.
- compliantRewrite: publication-ready rewrite preserving the core offer, matching the target voice, removing all violations, and including all required disclaimers verbatim.`;

  const userPrompt = `BRAND GUIDELINES:
- Industry: ${guidelines.presetLabel}
- Target Voice: ${guidelines.voice}
- Banned Phrases: ${guidelines.bannedPhrases.length ? guidelines.bannedPhrases.join(', ') : 'None'}
- Required Disclaimers: ${guidelines.requiredDisclaimers.length ? guidelines.requiredDisclaimers.join(' | ') : 'None'}

${pdfAttachment ? `ATTACHED PDF DOCUMENT: "${pdfAttachment.name}" (audit all pages, tables, claims, and disclosures inside this PDF).` : ''}
${copy ? `ADDITIONAL COPY TO AUDIT:\n"""\n${copy}\n"""` : 'No additional text copy provided; audit the attached PDF document.'}`;

  const parts = [{ text: userPrompt }];
  if (pdfAttachment?.base64) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfAttachment.base64
      }
    });
  }

  const payload = {
    contents: [{ parts }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2
    }
  };

  const response = await fetchWithBackoff(
    apiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    3
  );

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty Gemini response');

  const parsed = JSON.parse(rawText);
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  return {
    overallScore: clamp(parsed.overallScore),
    toneScore: clamp(parsed.toneScore),
    legalScore: clamp(parsed.legalScore),
    summary: parsed.summary || 'Compliance audit completed.',
    violations: Array.isArray(parsed.violations) ? parsed.violations : [],
    compliantRewrite: parsed.compliantRewrite || copy || 'No rewrite generated.',
    engine: 'gemini'
  };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function runLocalRuleAudit({ copy, guidelines, pdfAttachment }) {
  if (!copy && pdfAttachment) {
    return {
      overallScore: 0,
      toneScore: 0,
      legalScore: 0,
      summary: `Attached PDF "${pdfAttachment.name}" requires the live Gemini Flash API for native PDF parsing. Add VITE_GEMINI_API_KEY in .env or paste text into the editor to run the local rule engine.`,
      violations: [
        {
          phrase: `[PDF: ${pdfAttachment.name}]`,
          severity: 'MEDIUM',
          category: 'Live API Required',
          reason:
            'Local Rule Engine cannot parse binary PDF documents natively. Connect a valid Gemini API key to audit PDFs directly.'
        }
      ],
      compliantRewrite:
        'Connect your Gemini API key (VITE_GEMINI_API_KEY) to generate a compliant rewrite directly from the uploaded PDF.',
      engine: 'local'
    };
  }

  const violations = [];
  let legalPenalty = 0;
  let tonePenalty = 0;
  let rewritten = copy;

  guidelines.bannedPhrases.forEach((banned) => {
    const clean = banned.trim();
    if (!clean) return;
    const regex = new RegExp(`\\b${escapeRegExp(clean)}\\b`, 'gi');
    const matches = copy.match(regex);
    if (matches?.length) {
      const verbatim = matches[0];
      const replacement = SAFE_REPLACEMENTS[clean.toLowerCase()] || 'compliant alternative';
      violations.push({
        phrase: verbatim,
        severity: 'HIGH',
        category: 'Banned Terminology',
        reason: `"${verbatim}" is prohibited under ${guidelines.presetLabel} policy. Replace with "${replacement}".`
      });
      legalPenalty += 18;
      tonePenalty += 8;
      rewritten = rewritten.replace(regex, replacement);
    }
  });

  const claimRules = [
    {
      regex: /\b(double overnight|triple overnight|never loses|zero side effects|ditch your prescriptions)\b/gi,
      severity: 'HIGH',
      category: 'Hyperbolic Claim',
      reason: 'Absolute outcome or unsubstantiated guarantee creates regulatory exposure.',
      replacement: 'deliver disciplined, measurable support'
    },
    {
      regex: /\b(100% transformed|cuts cloud bills by 90%|crush your competitors|18% APY)\b/gi,
      severity: 'MEDIUM',
      category: 'Substantiation Risk',
      reason: 'Specific performance figures or aggressive claims require documented evidence.',
      replacement: 'meaningful operational improvements'
    }
  ];

  claimRules.forEach((rule) => {
    const matches = copy.match(rule.regex);
    if (matches?.length) {
      const verbatim = matches[0];
      if (!violations.some((v) => v.phrase.toLowerCase() === verbatim.toLowerCase())) {
        violations.push({
          phrase: verbatim,
          severity: rule.severity,
          category: rule.category,
          reason: rule.reason
        });
        legalPenalty += rule.severity === 'HIGH' ? 16 : 10;
        tonePenalty += 6;
        rewritten = rewritten.replace(rule.regex, rule.replacement);
      }
    }
  });

  const capsMatches = copy.match(/\b[A-Z]{4,}\b/g) || [];
  const shouting = [...new Set(capsMatches)].filter((w) => !ALLOWED_ACRONYMS.has(w));
  if (shouting.length > 0) {
    violations.push({
      phrase: shouting[0],
      severity: 'MEDIUM',
      category: 'Tone Mismatch',
      reason: `ALL-CAPS emphasis ("${shouting.slice(0, 3).join('", "')}") conflicts with the "${guidelines.voice}" brand voice.`
    });
    tonePenalty += Math.min(22, shouting.length * 6);
    shouting.forEach((word) => {
      const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g');
      rewritten = rewritten.replace(wordRegex, word.charAt(0) + word.slice(1).toLowerCase());
    });
  }

  const multiBang = copy.match(/!{2,}/);
  const totalBangs = (copy.match(/!/g) || []).length;
  if (multiBang || totalBangs > 2) {
    violations.push({
      phrase: multiBang ? multiBang[0] : '!',
      severity: 'LOW',
      category: 'Tone & Punctuation',
      reason: `Excessive exclamation marks (${totalBangs}) undermine editorial credibility.`
    });
    tonePenalty += 10;
    rewritten = rewritten.replace(/!{2,}/g, '.').replace(/!/g, '.');
  }

  const missingDisclaimers = [];
  const normalizedCopy = copy.toLowerCase().replace(/\s+/g, ' ');
  guidelines.requiredDisclaimers.forEach((disc, idx) => {
    const cleanDisc = disc.trim();
    if (!cleanDisc) return;
    const snippet = cleanDisc.toLowerCase().replace(/\s+/g, ' ').slice(0, Math.min(40, cleanDisc.length));
    if (!normalizedCopy.includes(snippet)) {
      missingDisclaimers.push(cleanDisc);
      violations.push({
        phrase: `[Missing Disclaimer #${idx + 1}]`,
        severity: 'HIGH',
        category: 'Mandatory Disclosure',
        reason: `Required disclosure is missing: "${cleanDisc}"`
      });
      legalPenalty += 18;
    }
  });

  rewritten = rewritten.replace(/\.\./g, '.').replace(/\s{2,}/g, ' ').trim();
  if (missingDisclaimers.length > 0) {
    rewritten = `${rewritten}\n\n${missingDisclaimers.join('\n')}`;
  }

  const legalScore = Math.max(12, Math.min(100, 100 - legalPenalty));
  const toneScore = Math.max(18, Math.min(100, 100 - tonePenalty));
  const overallScore = Math.round(legalScore * 0.65 + toneScore * 0.35);
  const highCount = violations.filter((v) => v.severity === 'HIGH').length;

  const summary =
    violations.length === 0
      ? `Draft meets all ${guidelines.presetLabel} compliance policies and aligns with the "${guidelines.voice}" voice.`
      : `Identified ${violations.length} compliance ${violations.length === 1 ? 'issue' : 'issues'} (${highCount} high-risk) affecting ${guidelines.presetLabel} policy adherence.`;

  const finalSummary = pdfAttachment
    ? `${summary} (Note: Attached PDF "${pdfAttachment.name}" was skipped in local fallback mode; live Gemini API is required for native PDF parsing.)`
    : summary;

  return {
    overallScore,
    toneScore,
    legalScore,
    summary: finalSummary,
    violations,
    compliantRewrite: rewritten,
    engine: 'local'
  };
}

function buildHighlightedSegments(text, violations) {
  if (!text || !violations?.length) {
    return [{ text, violationIndex: null, severity: null }];
  }

  const matches = [];
  violations.forEach((v, idx) => {
    if (!v.phrase || v.phrase.startsWith('[')) return;
    const regex = new RegExp(escapeRegExp(v.phrase), 'gi');
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        violationIndex: idx,
        severity: v.severity
      });
      if (m[0].length === 0) break;
    }
  });

  if (!matches.length) return [{ text, violationIndex: null, severity: null }];
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    if (m.start > cursor) {
      segments.push({ text: text.slice(cursor, m.start), violationIndex: null, severity: null });
    }
    segments.push({ text: text.slice(m.start, m.end), violationIndex: m.violationIndex, severity: m.severity });
    cursor = m.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), violationIndex: null, severity: null });
  }
  return segments;
}

function getScoreStatus(score, violations = []) {
  const highCount = violations.filter((v) => v.severity === 'HIGH').length;
  if (score >= 82 && highCount === 0) {
    return {
      label: 'Compliant',
      badgeClass: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
      barClass: 'bg-[#166534]',
      textClass: 'text-[#166534]'
    };
  }
  if (score >= 55 && highCount <= 1) {
    return {
      label: 'Review Needed',
      badgeClass: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
      barClass: 'bg-[#92400E]',
      textClass: 'text-[#92400E]'
    };
  }
  return {
    label: 'High Risk',
    badgeClass: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
    barClass: 'bg-[#991B1B]',
    textClass: 'text-[#991B1B]'
  };
}

export default function App() {
  const [activePresetId, setActivePresetId] = useState('fintech');
  const [brandVoice, setBrandVoice] = useState(BRAND_PRESETS.fintech.voice);
  const [bannedPhrases, setBannedPhrases] = useState(BRAND_PRESETS.fintech.bannedPhrases);
  const [newBannedInput, setNewBannedInput] = useState('');
  const [requiredDisclaimers, setRequiredDisclaimers] = useState(
    BRAND_PRESETS.fintech.requiredDisclaimers
  );
  const [newDisclaimerInput, setNewDisclaimerInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [draftCopy, setDraftCopy] = useState(BRAND_PRESETS.fintech.highRiskDraft);
  const [editorMode, setEditorMode] = useState('split'); // 'split' | 'edit' | 'highlight'
  const [pdfAttachment, setPdfAttachment] = useState(null);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  const [isAuditing, setIsAuditing] = useState(false);
  const [engineMode, setEngineMode] = useState('local');
  const [currentAudit, setCurrentAudit] = useState(null);
  const [selectedViolationIdx, setSelectedViolationIdx] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);

  const [copiedRewrite, setCopiedRewrite] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const violationRefs = useRef([]);
  const fileInputRef = useRef(null);

  const activePreset = BRAND_PRESETS[activePresetId];

  const { wordCount, charCount } = useMemo(() => {
    const trimmed = draftCopy.trim();
    return {
      wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
      charCount: draftCopy.length
    };
  }, [draftCopy]);

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const handleSelectPreset = (presetId) => {
    const preset = BRAND_PRESETS[presetId];
    if (!preset) return;
    setActivePresetId(presetId);
    setBrandVoice(preset.voice);
    setBannedPhrases([...preset.bannedPhrases]);
    setRequiredDisclaimers([...preset.requiredDisclaimers]);
    setDraftCopy(preset.highRiskDraft);
    setSelectedViolationIdx(null);
    triggerToast(`Switched to ${preset.label} guidelines`);
  };

  const handleAddBanned = (e) => {
    e.preventDefault();
    const cleaned = newBannedInput.trim();
    if (!cleaned) return;
    if (!bannedPhrases.some((p) => p.toLowerCase() === cleaned.toLowerCase())) {
      setBannedPhrases((prev) => [...prev, cleaned]);
    }
    setNewBannedInput('');
  };

  const handleAddDisclaimer = (e) => {
    e.preventDefault();
    const cleaned = newDisclaimerInput.trim();
    if (!cleaned) return;
    if (!requiredDisclaimers.includes(cleaned)) {
      setRequiredDisclaimers((prev) => [...prev, cleaned]);
    }
    setNewDisclaimerInput('');
  };

  const handlePdfFile = useCallback(
    (file) => {
      if (!file) return;
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        triggerToast('Only .pdf files are supported for document auditing.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        triggerToast('PDF exceeds the 20 MB size limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        setPdfAttachment({
          name: file.name,
          size: file.size,
          base64
        });
        triggerToast(`Attached ${file.name} for compliance audit`);
      };
      reader.onerror = () => {
        triggerToast('Could not read the selected PDF file.');
      };
      reader.readAsDataURL(file);
    },
    [triggerToast]
  );

  const handleRemovePdf = () => {
    setPdfAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    triggerToast('Removed PDF attachment');
  };

  const handleRunAudit = useCallback(async () => {
    const trimmed = draftCopy.trim();
    if (!trimmed && !pdfAttachment) {
      triggerToast('Enter marketing copy or attach a PDF before running an audit.');
      return;
    }

    setIsAuditing(true);
    setSelectedViolationIdx(null);

    const guidelines = {
      presetId: activePresetId,
      presetLabel: activePreset.label,
      voice: brandVoice.trim() || activePreset.voice,
      bannedPhrases,
      requiredDisclaimers
    };

    let output;
    try {
      output = await runGeminiAudit({ copy: trimmed, guidelines, pdfAttachment });
      setEngineMode('gemini');
    } catch {
      output = runLocalRuleAudit({ copy: trimmed, guidelines, pdfAttachment });
      setEngineMode('local');
    }

    const record = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullDate: new Date().toLocaleString(),
      presetLabel: activePreset.shortLabel,
      pdfName: pdfAttachment?.name || null,
      originalCopy: trimmed,
      guidelinesSnapshot: guidelines,
      ...output
    };

    setCurrentAudit(record);
    setAuditHistory((prev) => [record, ...prev].slice(0, 8));
    setIsAuditing(false);
  }, [
    draftCopy,
    pdfAttachment,
    activePresetId,
    activePreset,
    brandVoice,
    bannedPhrases,
    requiredDisclaimers,
    triggerToast
  ]);

  useEffect(() => {
    handleRunAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHighlightClick = (idx) => {
    setSelectedViolationIdx(idx);
    violationRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleCopyRewrite = async () => {
    if (!currentAudit?.compliantRewrite) return;
    try {
      await navigator.clipboard.writeText(currentAudit.compliantRewrite);
    } catch {
      const el = document.createElement('textarea');
      el.value = currentAudit.compliantRewrite;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedRewrite(true);
    triggerToast('Compliant rewrite copied');
    setTimeout(() => setCopiedRewrite(false), 1800);
  };

  const handleApplyRewrite = () => {
    if (!currentAudit?.compliantRewrite) return;
    setDraftCopy(currentAudit.compliantRewrite);
    triggerToast('Applied rewrite to editor — run audit to verify');
  };

  const handleExportMarkdown = () => {
    if (!currentAudit) return;
    const violationsMd =
      currentAudit.violations.length === 0
        ? '_No compliance violations detected._'
        : currentAudit.violations
            .map(
              (v, i) =>
                `### ${i + 1}. \`${v.phrase}\` (${v.severity} — ${v.category})\n${v.reason}`
            )
            .join('\n\n');

    const md = `# BrandGuard AI — Compliance Audit Report

- **Date:** ${new Date().toLocaleString()}
- **Industry Profile:** ${currentAudit.guidelinesSnapshot.presetLabel}
- **Engine:** ${currentAudit.engine === 'gemini' ? 'Gemini Flash Live' : 'Local Rule Engine'}

## Scorecard
| Metric | Score |
| :--- | :--- |
| Overall Compliance | ${currentAudit.overallScore} / 100 |
| Tone Alignment | ${currentAudit.toneScore}% |
| Legal & Policy Safety | ${currentAudit.legalScore}% |

> ${currentAudit.summary}

## Original Copy
\`\`\`text
${currentAudit.originalCopy}
\`\`\`

## Flagged Violations (${currentAudit.violations.length})
${violationsMd}

## Compliant Rewrite
\`\`\`text
${currentAudit.compliantRewrite}
\`\`\`
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brandguard-report-${currentAudit.presetLabel.toLowerCase().replace(/\s+/g, '-')}-${currentAudit.overallScore}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('Downloaded compliance report (.md)');
  };

  const handleExportPdf = () => {
    if (!currentAudit) return;
    const status = getScoreStatus(currentAudit.overallScore, currentAudit.violations);
    const sourceLabel = currentAudit.pdfName
      ? `PDF: ${currentAudit.pdfName}${currentAudit.originalCopy ? ' + Editor Copy' : ''}`
      : 'Editor Draft Copy';

    const violationsRows =
      currentAudit.violations.length === 0
        ? `<tr><td colspan="4" style="padding:14px;text-align:center;color:#166534;background:#F0FDF4;">No compliance violations detected. Copy is ready for publication.</td></tr>`
        : currentAudit.violations
            .map((v, i) => {
              const sevColor =
                v.severity === 'HIGH'
                  ? 'background:#FEF2F2;color:#991B1B;border:1px solid #FECACA;'
                  : v.severity === 'MEDIUM'
                  ? 'background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;'
                  : 'background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;';
              return `
                <tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-family:monospace;font-size:12px;">${i + 1}</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;"><span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;${sevColor}">${escapeHtml(v.severity)}</span></td>
                  <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-family:monospace;font-size:12px;font-weight:600;">${escapeHtml(v.phrase)}<div style="font-family:sans-serif;font-weight:400;font-size:11px;color:#475569;margin-top:2px;">${escapeHtml(v.category)}</div></td>
                  <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#334155;line-height:1.5;">${escapeHtml(v.reason)}</td>
                </tr>`;
            })
            .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BrandGuard AI — Compliance Audit Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; background: #FFFFFF; margin: 0; padding: 36px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F766E; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .brand span { color: #0F766E; }
    .meta { font-size: 12px; color: #475569; text-align: right; line-height: 1.6; }
    .scores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
    .score-box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; background: #F8F9FA; }
    .score-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 600; }
    .score-val { font-size: 28px; font-weight: 700; font-family: monospace; margin-top: 4px; color: #0F172A; }
    .summary { background: #F8F9FA; border-left: 3px solid #0F766E; padding: 12px 16px; font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #0F172A; margin: 24px 0 10px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
    th { text-align: left; background: #F8F9FA; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 1px solid #E2E8F0; }
    .rewrite { background: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.65; white-space: pre-wrap; color: #0F172A; }
    @media print { body { padding: 18px; } .score-box, .summary, .rewrite, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">BrandGuard <span>AI</span></div>
      <div style="font-size:12px;color:#475569;margin-top:4px;">Executive Compliance Audit Report &middot; <strong>${escapeHtml(status.label)}</strong></div>
    </div>
    <div class="meta">
      <div><strong>Profile:</strong> ${escapeHtml(currentAudit.guidelinesSnapshot.presetLabel)}</div>
      <div><strong>Source:</strong> ${escapeHtml(sourceLabel)}</div>
      <div><strong>Audited:</strong> ${escapeHtml(currentAudit.fullDate || currentAudit.timestamp)}</div>
      <div><strong>Engine:</strong> ${currentAudit.engine === 'gemini' ? 'Gemini Flash Live' : 'Local Rule Engine'}</div>
    </div>
  </div>

  <div class="scores">
    <div class="score-box"><div class="score-label">Overall Compliance</div><div class="score-val">${currentAudit.overallScore} / 100</div></div>
    <div class="score-box"><div class="score-label">Tone Alignment</div><div class="score-val">${currentAudit.toneScore}%</div></div>
    <div class="score-box"><div class="score-label">Legal Safety</div><div class="score-val">${currentAudit.legalScore}%</div></div>
  </div>

  <div class="summary">${escapeHtml(currentAudit.summary)}</div>

  <h2>Flagged Violations (${currentAudit.violations.length})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th style="width:90px;">Severity</th>
        <th style="width:220px;">Phrase &amp; Category</th>
        <th>Compliance Guidance</th>
      </tr>
    </thead>
    <tbody>${violationsRows}</tbody>
  </table>

  <h2>Compliant Rewrite</h2>
  <div class="rewrite">${escapeHtml(currentAudit.compliantRewrite)}</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=920,height=800');
    if (!printWindow) {
      triggerToast('Pop-up blocked. Allow pop-ups to print or save as PDF.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const highlightedSegments = useMemo(() => {
    if (!currentAudit) return [];
    return buildHighlightedSegments(currentAudit.originalCopy, currentAudit.violations);
  }, [currentAudit]);

  const scoreStatus = currentAudit
    ? getScoreStatus(currentAudit.overallScore, currentAudit.violations)
    : null;

  const getSeverityBadge = (severity) => {
    if (severity === 'HIGH') return 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
    if (severity === 'MEDIUM') return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
    return 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] font-sans flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E293B] text-white text-xs font-medium shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. SLIM TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Wordmark & Sidebar Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-md border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:bg-[#F8F9FA] transition-colors"
              title="Toggle Policy Inspector"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#0F766E] flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-semibold tracking-tight text-[#0F172A] text-base">
                BrandGuard <span className="text-[#0F766E]">AI</span>
              </span>
            </div>
          </div>

          {/* Center: Segmented Industry Preset Switcher */}
          <nav
            aria-label="Industry compliance presets"
            className="flex items-center bg-[#F8F9FA] p-1 rounded-lg border border-[#E2E8F0]"
          >
            {Object.values(BRAND_PRESETS).map((preset) => {
              const isActive = preset.id === activePresetId;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#0F766E] shadow-xs border border-[#E2E8F0]'
                      : 'text-[#475569] hover:text-[#0F172A] border border-transparent'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Engine Status Pill & Export .md */}
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                engineMode === 'gemini'
                  ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                  : 'bg-[#F8F9FA] text-[#475569] border-[#E2E8F0]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  engineMode === 'gemini' ? 'bg-[#166534]' : 'bg-[#64748B]'
                }`}
              />
              {engineMode === 'gemini' ? 'Gemini Flash Live' : 'Local Rule Engine'}
            </span>

            <button
              onClick={handleExportMarkdown}
              disabled={!currentAudit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white hover:bg-[#F8F9FA] disabled:opacity-40 border border-[#E2E8F0] text-[#0F172A] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#475569]" />
              <span>Export Report (.md)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ENTERPRISE 3-PANE WORKBENCH */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* 2. LEFT SIDEBAR: POLICY & GUIDELINES INSPECTOR (~280px) */}
          {isSidebarOpen && (
            <aside className="w-full lg:w-[280px] shrink-0 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-5">
              <div className="pb-3 border-b border-[#E2E8F0]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                  Policy Inspector
                </h2>
                <p className="text-xs text-[#475569] mt-1">{activePreset.framework}</p>
              </div>

              {/* Target Brand Voice */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#0F172A]">
                  Target Brand Voice
                </label>
                <select
                  value={VOICE_OPTIONS.includes(brandVoice) ? brandVoice : '__custom'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom') setBrandVoice(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F766E]"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  {!VOICE_OPTIONS.includes(brandVoice) && (
                    <option value="__custom">Custom Voice</option>
                  )}
                </select>
                <input
                  type="text"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="Custom brand voice..."
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              {/* Editable Banned Phrases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#0F172A]">Banned Phrases</label>
                  <span className="text-[11px] font-mono text-[#475569]">
                    {bannedPhrases.length}
                  </span>
                </div>
                <form onSubmit={handleAddBanned} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newBannedInput}
                    onChange={(e) => setNewBannedInput(e.target.value)}
                    placeholder="Add phrase + Enter"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-white border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1.5 rounded-md bg-[#F8F9FA] hover:bg-[#E2E8F0]/60 border border-[#E2E8F0] text-[#0F172A]"
                    title="Add banned phrase"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-0.5">
                  {bannedPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs"
                    >
                      <span>{phrase}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setBannedPhrases((prev) => prev.filter((p) => p !== phrase))
                        }
                        className="hover:opacity-70"
                        title={`Remove "${phrase}"`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {bannedPhrases.length === 0 && (
                    <span className="text-xs text-[#475569] italic">No banned phrases.</span>
                  )}
                </div>
              </div>

              {/* Editable Required Disclaimers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#0F172A]">
                    Required Disclaimers
                  </label>
                  <span className="text-[11px] font-mono text-[#475569]">
                    {requiredDisclaimers.length}
                  </span>
                </div>
                <form onSubmit={handleAddDisclaimer} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newDisclaimerInput}
                    onChange={(e) => setNewDisclaimerInput(e.target.value)}
                    placeholder="Add required disclosure..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-white border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1.5 rounded-md bg-[#F8F9FA] hover:bg-[#E2E8F0]/60 border border-[#E2E8F0] text-[#0F172A]"
                    title="Add disclaimer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {requiredDisclaimers.map((disc, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 p-2 rounded-md bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#475569] leading-relaxed"
                    >
                      <span>{disc}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRequiredDisclaimers((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-[#94A3B8] hover:text-[#991B1B] shrink-0 mt-0.5"
                        title="Remove disclaimer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {requiredDisclaimers.length === 0 && (
                    <span className="text-xs text-[#475569] italic">
                      No mandatory disclaimers.
                    </span>
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* 3 & 4. CENTER DOCUMENT STUDIO + RIGHT AUDIT REPORT */}
          <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
            {/* 3. CENTER MAIN WORKSPACE (DOCUMENT STUDIO) */}
            <section className="xl:col-span-7 flex flex-col gap-5">
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                {/* Document Toolbar */}
                <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8F9FA]/60">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0F766E]" />
                    <h2 className="text-sm font-semibold text-[#0F172A]">Document Studio</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        setDraftCopy(activePreset.highRiskDraft);
                        triggerToast(`Loaded high-risk ${activePreset.shortLabel} draft`);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#FEF2F2] hover:bg-[#FECACA]/40 text-[#991B1B] border border-[#FECACA] transition-colors"
                    >
                      High-Risk Draft
                    </button>
                    <button
                      onClick={() => {
                        setDraftCopy(activePreset.cleanDraft);
                        triggerToast(`Loaded compliant ${activePreset.shortLabel} draft`);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F0FDF4] hover:bg-[#BBF7D0]/40 text-[#166534] border border-[#BBF7D0] transition-colors"
                    >
                      Compliant Draft
                    </button>
                    <button
                      onClick={() => setDraftCopy('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-[#F8F9FA] text-[#475569] border border-[#E2E8F0] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="p-5 space-y-4">
                  <textarea
                    value={draftCopy}
                    onChange={(e) => setDraftCopy(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleRunAudit();
                      }
                    }}
                    rows={9}
                    placeholder="Paste or draft marketing copy here to audit against active brand guidelines..."
                    className="w-full p-4 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] focus:bg-white focus:border-[#0F766E] focus:outline-none text-[15px] leading-relaxed text-[#0F172A] placeholder:text-[#94A3B8] resize-y transition-colors"
                  />

                  {/* PDF Upload Dropzone / Attached File Pill */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handlePdfFile(e.target.files?.[0])}
                      className="hidden"
                    />

                    {pdfAttachment ? (
                      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#F0FDF4]/60 border border-[#BBF7D0]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-white border border-[#BBF7D0] flex items-center justify-center text-[#0F766E] shrink-0">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#0F172A] truncate">
                              {pdfAttachment.name}
                            </p>
                            <p className="text-[11px] font-mono text-[#475569]">
                              PDF &middot; {formatFileSize(pdfAttachment.size)} &middot; Ready for Gemini native audit
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePdf}
                          className="p-1.5 rounded-md text-[#475569] hover:text-[#991B1B] hover:bg-white transition-colors shrink-0"
                          title="Remove attached PDF"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingPdf(true);
                        }}
                        onDragLeave={() => setIsDraggingPdf(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingPdf(false);
                          handlePdfFile(e.dataTransfer.files?.[0]);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-dashed cursor-pointer transition-colors ${
                          isDraggingPdf
                            ? 'bg-[#F0FDFA] border-[#0F766E]'
                            : 'bg-[#F8F9FA]/70 border-[#CBD5E1] hover:border-[#0F766E] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Upload className="w-4 h-4 text-[#0F766E] shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-[#0F172A]">
                              Attach a PDF document to audit
                            </p>
                            <p className="text-[11px] text-[#475569]">
                              Drag &amp; drop or click to upload (.pdf up to 20 MB)
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-[#E2E8F0] text-[#0F172A]">
                          Browse PDF
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs font-mono text-[#475569]">
                      <span>{wordCount} words</span>
                      <span className="text-[#CBD5E1]">|</span>
                      <span>{charCount} characters</span>
                    </div>

                    <button
                      onClick={handleRunAudit}
                      disabled={isAuditing || (!draftCopy.trim() && !pdfAttachment)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#1E293B] hover:bg-[#0F172A] disabled:opacity-45 text-white transition-colors cursor-pointer"
                    >
                      {isAuditing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Auditing Copy...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-teal-400" />
                          <span>Run Compliance Audit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Inline Highlight View */}
              {currentAudit && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 bg-[#F8F9FA]/60">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#0F766E]" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                        Inline Highlight Preview
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#475569]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#FEF2F2] border border-[#FECACA]" />
                        High Risk
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#FFFBEB] border border-[#FDE68A]" />
                        Warning
                      </span>
                      <button
                        onClick={() =>
                          setEditorMode((m) => (m === 'highlight' ? 'split' : 'highlight'))
                        }
                        className="inline-flex items-center gap-1 text-[#0F766E] hover:underline font-medium"
                      >
                        <Edit3 className="w-3 h-3" />
                        {editorMode === 'highlight' ? 'Standard' : 'Focus'}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 text-[15px] leading-7 text-[#0F172A] whitespace-pre-wrap break-words">
                    {highlightedSegments.map((seg, idx) => {
                      if (seg.violationIndex === null) {
                        return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
                      }
                      const isSelected = selectedViolationIdx === seg.violationIndex;
                      const styleClass =
                        seg.severity === 'HIGH'
                          ? 'bg-[#FEF2F2] text-[#991B1B] border-b-2 border-[#991B1B]/60 hover:bg-[#FEE2E2]'
                          : 'bg-[#FFFBEB] text-[#92400E] border-b-2 border-[#92400E]/60 hover:bg-[#FEF3C7]';

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleHighlightClick(seg.violationIndex)}
                          className={`inline px-1 py-0.5 rounded-xs font-medium cursor-pointer transition-all ${styleClass} ${
                            isSelected ? 'ring-2 ring-[#0F766E]' : ''
                          }`}
                          title="Click to inspect violation"
                        >
                          {seg.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* 4. RIGHT PANEL: EXECUTIVE AUDIT REPORT & REMEDIATION */}
            <section className="xl:col-span-5 flex flex-col gap-5">
              {/* Compliance Score Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                {!currentAudit ? (
                  <p className="text-sm text-[#475569] text-center py-6">
                    Run a compliance audit to view executive scoring and remediation.
                  </p>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                          Compliance Score
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-4xl font-bold tracking-tight text-[#0F172A] font-mono">
                            {currentAudit.overallScore}
                          </span>
                          <span className="text-sm text-[#475569] font-mono">/ 100</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${scoreStatus.badgeClass}`}
                      >
                        {scoreStatus.label === 'Compliant' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {scoreStatus.label}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed">
                      {currentAudit.summary}
                    </p>

                    {/* Crisp Horizontal Progress Bars */}
                    <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                      {[
                        {
                          label: 'Overall Score',
                          value: currentAudit.overallScore,
                          barClass: scoreStatus.barClass
                        },
                        {
                          label: 'Tone Alignment',
                          value: currentAudit.toneScore,
                          barClass: 'bg-[#0F766E]'
                        },
                        {
                          label: 'Legal Safety',
                          value: currentAudit.legalScore,
                          barClass:
                            currentAudit.legalScore >= 80
                              ? 'bg-[#166534]'
                              : currentAudit.legalScore >= 55
                              ? 'bg-[#92400E]'
                              : 'bg-[#991B1B]'
                        }
                      ].map((metric) => (
                        <div key={metric.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#0F172A]">{metric.label}</span>
                            <span className="font-mono text-[#475569]">{metric.value}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${metric.barClass}`}
                              style={{ width: `${metric.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Export Actions (PDF + Markdown) */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E2E8F0]">
                      <button
                        onClick={handleExportPdf}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1E293B] hover:bg-[#0F172A] text-white transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-400" />
                        <span>Export PDF Report</span>
                      </button>
                      <button
                        onClick={handleExportMarkdown}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white hover:bg-[#F8F9FA] border border-[#E2E8F0] text-[#0F172A] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#475569]" />
                        <span>Export .md</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Violations & Recommendations */}
              {currentAudit && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      Violations &amp; Recommendations
                    </h3>
                    <span className="text-xs font-mono text-[#475569]">
                      {currentAudit.violations.length} found
                    </span>
                  </div>

                  {currentAudit.violations.length === 0 ? (
                    <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>No violations detected. Copy is ready for publication.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {currentAudit.violations.map((v, idx) => {
                        const isSelected = selectedViolationIdx === idx;
                        return (
                          <div
                            key={`${v.phrase}-${idx}`}
                            ref={(el) => (violationRefs.current[idx] = el)}
                            onClick={() => setSelectedViolationIdx(idx)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#F8F9FA] border-[#0F766E] ring-1 ring-[#0F766E]'
                                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getSeverityBadge(
                                    v.severity
                                  )}`}
                                >
                                  {v.severity}
                                </span>
                                <code className="text-xs font-mono font-semibold text-[#0F172A] truncate">
                                  {v.phrase}
                                </code>
                              </div>
                              <span className="text-[11px] text-[#475569] shrink-0">
                                {v.category}
                              </span>
                            </div>
                            <p className="text-xs text-[#475569] leading-relaxed">{v.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* One-Click Compliant Rewrite Card */}
              {currentAudit && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F766E]" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                        Compliant Rewrite
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyRewrite}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-[#F8F9FA] border border-[#E2E8F0] text-[#0F172A] transition-colors"
                      >
                        {copiedRewrite ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#166534]" />
                            <span className="text-[#166534]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#475569]" />
                            <span>Copy Rewrite</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleApplyRewrite}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#0F766E] hover:bg-[#115E59] text-white transition-colors"
                      >
                        <span>Apply to Editor</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] text-xs leading-relaxed text-[#0F172A] whitespace-pre-wrap">
                    {currentAudit.compliantRewrite}
                  </div>
                </div>
              )}

              {/* Compact Audit History Log */}
              {auditHistory.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#475569]" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                        Audit History
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#475569]">Click to compare</span>
                  </div>

                  <div className="divide-y divide-[#E2E8F0] max-h-40 overflow-y-auto">
                    {auditHistory.map((run) => {
                      const isCurrent = currentAudit?.id === run.id;
                      const st = getScoreStatus(run.overallScore, run.violations);
                      return (
                        <button
                          key={run.id}
                          onClick={() => {
                            setCurrentAudit(run);
                            setSelectedViolationIdx(null);
                          }}
                          className={`w-full py-2 px-2 flex items-center justify-between gap-2 text-left rounded-md transition-colors ${
                            isCurrent ? 'bg-[#F8F9FA]' : 'hover:bg-[#F8F9FA]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold border ${st.badgeClass}`}
                            >
                              {run.overallScore}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-[#0F172A] truncate">
                                {run.presetLabel}
                              </div>
                              <div className="text-[11px] text-[#475569] font-mono">
                                {run.timestamp} &middot; {run.violations.length} flags
                              </div>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0F766E]">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}