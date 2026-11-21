# 🛡️ BrandGuard AI

An enterprise brand compliance and copywriting workbench built with **React 18**, **Vite**, **Tailwind CSS**, and the **Google Gemini Flash API**. BrandGuard AI audits marketing copy and PDF documents against customizable brand guidelines, flags tone and legal risks inline, and generates one-click compliant rewrites.

🔗 **Live Demo:** [https://brandguard-ai-afterit.vercel.app/](https://brandguard-ai-afterit.vercel.app/)

---

## ✨ Features

- **3-Pane Enterprise Workbench:** Clean, light editorial interface uniting brand policy configuration, document editing, and real-time compliance diagnostics.
- **Native PDF Document Auditing:** Upload `.pdf` brochures, pitch decks, or press releases (up to 20 MB) for direct multimodal compliance analysis via Gemini Flash.
- **Industry Presets & Custom Rules:** Switch between **FinTech**, **Health & Wellness**, and **B2B Enterprise SaaS** profiles, or customize banned phrases, required disclaimers, and target brand voice on the fly.
- **Inline Violation Highlighting & Scoring:** Displays Compliance Score, Tone Alignment, and Legal Safety meters alongside clickable inline highlights linked to severity-tagged violation cards.
- **One-Click Compliant Rewrites & History:** Generate policy-safe rewrites, swap them directly into the editor, and compare before/after scores in the Audit History strip.
- **Exportable Compliance Reports:** Export results as a print-ready **PDF Compliance Report** or a **Markdown (`.md`)** summary.
- **Dual-Engine Reliability:** Runs on **Gemini Flash Live** with automatic fallback to a built-in **Local Rule Engine** for zero-downtime auditing.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React
- **AI Engine:** Google Gemini Flash API (`@google/genai`) with structured JSON output
- **Deployment:** Vercel

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [Google AI Studio](https://aistudio.google.com/) Gemini API key

### 1. Clone the Repository
```bash
git clone [https://github.com/AdityaIsOnGithub/brandguard-ai-afterit.git](https://github.com/AdityaIsOnGithub/brandguard-ai-afterit.git)
cd brandguard-ai-afterit