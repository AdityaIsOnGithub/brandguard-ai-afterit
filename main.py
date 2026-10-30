"""
BrandGuard AI v3.0 — Python FastAPI Governance & Cryptographic Signing Microservice
Team: AfterIt | Developer: Aditya Tiwari
Run locally with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import hashlib
import re
from datetime import datetime

app = FastAPI(
    title="BrandGuard AI Governance Engine API",
    description="Hybrid Brand Vector DNA, WCAG 2.1 Luminance & SHA-256 Compliance Microservice",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuditRequest(BaseModel):
    brand_id: str
    headline: str
    body: str
    visual_hex: str
    text_hex: str
    alt_text: str = ""

class CertificateRequest(BaseModel):
    submission_id: str
    brand_name: str
    headline: str
    body: str
    score: int
    author: str

def hex_to_rgb(hex_str: str) -> tuple:
    clean = hex_str.lstrip("#")
    if len(clean) != 6:
        return (15, 23, 42)
    return tuple(int(clean[i:i+2], 16) for i in (0, 2, 4))

def relative_luminance(rgb: tuple) -> float:
    def channel(c):
        v = c / 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = [channel(x) for x in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def wcag_contrast_ratio(hex1: str, hex2: str) -> float:
    l1 = relative_luminance(hex_to_rgb(hex1))
    l2 = relative_luminance(hex_to_rgb(hex2))
    bright, dark = max(l1, l2), min(l1, l2)
    return round((bright + 0.05) / (dark + 0.05), 2)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BrandGuard AI Python FastAPI Engine v3.0",
        "team": "AfterIt",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/v3/audit")
def run_governance_audit(req: AuditRequest) -> Dict:
    combined = f"{req.headline}\n{req.body}"
    issues = []

    patterns = [
        ("FIN-CLAIM-01", "Critical", r"\b(100%\s*(uptime|guaranteed|risk-free)|zero\s*risk)\b",
         "99.95% SLA-backed enterprise reliability"),
        ("FIN-FACT-02", "Critical", r"\b(zero\s*fees|0%\s*fee|instant\s*global\s*settlement)\b",
         "24-hour global settlement at a transparent 1.5% flat fee"),
        ("FIN-TONE-03", "Warning", r"\b(insane\s*gains|crush\s*the\s*banks|no-brainer|cheap\s*app)\b",
         "modernize institutional treasury operations"),
    ]

    for rule_id, severity, pattern, suggestion in patterns:
        for match in re.finditer(pattern, combined, flags=re.IGNORECASE):
            issues.append({
                "ruleId": rule_id,
                "severity": severity,
                "flaggedText": match.group(0),
                "suggestion": suggestion
            })

    contrast = wcag_contrast_ratio(req.visual_hex, req.text_hex)
    if contrast < 4.5:
        issues.append({
            "ruleId": "WCAG-AA-01",
            "severity": "Critical",
            "flaggedText": f"Contrast {contrast}:1",
            "suggestion": "#F8FAFC"
        })

    score = max(12, 100 - len(issues) * 15)
    return {
        "brand_id": req.brand_id,
        "alignment_score": score,
        "wcag_contrast_ratio": contrast,
        "issues_count": len(issues),
        "issues": issues
    }

@app.post("/api/v3/certificate")
def generate_sha256_certificate(req: CertificateRequest) -> Dict:
    payload = f"{req.submission_id}|{req.brand_name}|{req.headline}|{req.body}|{req.score}|{req.author}"
    sha256_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return {
        "certificate_id": req.submission_id,
        "brand": req.brand_name,
        "score": req.score,
        "algorithm": "SHA-256",
        "sha256_fingerprint": sha256_hash,
        "issued_at": datetime.utcnow().isoformat()
    }
