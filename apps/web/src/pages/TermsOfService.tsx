import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft, FileCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 gap-1.5 -ml-2 mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1769D2]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              CIVICRESOLVE • Terms & Conditions
            </div>
            <h1 className="text-xl font-extrabold text-[#123B6D] tracking-tight">
              Terms of Service
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Effective Date: September 28, 2026 • Statutory Civic Redressal Standard
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
        {/* Section 1: Acceptance */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#1769D2]" />
            <span>1. Acceptance of Terms</span>
          </h2>
          <p>
            By accessing or submitting grievances through the CIVICRESOLVE platform (web or mobile application), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue platform use immediately.
          </p>
        </Card>

        {/* Section 2: Acceptable Use & Citizen Responsibility */}
        <Card className="p-5 bg-white border-slate-200 space-y-3">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#16803C]" />
            <span>2. Acceptable Use & Submission Integrity</span>
          </h2>
          <p>
            Citizens and municipal staff must adhere to civic honesty standards:
          </p>
          <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
            <li><strong>Factual Submissions:</strong> Reports must represent genuine civic issues (e.g. road damage, water leaks, sanitation hazards, electrical risks).</li>
            <li><strong>Evidence Authenticity:</strong> Uploaded photo evidence must accurately depict the physical location and state of the reported grievance. Submitting fabricated, unrelated, or manipulated images is strictly prohibited.</li>
            <li><strong>Anti-Spam & Duplicate Flooding:</strong> Automated request flooding, duplicate spamming, and bot-generated grievances are intercepted and will result in account suspension.</li>
            <li><strong>Respectful Interaction:</strong> Feedback, comments, and notes must remain professional and free of abusive, defamatory, or threatening language.</li>
          </ul>
        </Card>

        {/* Section 3: Statutory SLA & Resolution Workflow */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D]">
            3. Statutory SLA Timelines & Municipal Governance
          </h2>
          <p>
            Resolution timelines are governed by the Maharashtra Citizen Charter SLA matrix. Priority scoring (Urgent, High, Medium, Low) is computed deterministically based on public safety hazards, spatial cluster density, and infrastructure impact.
          </p>
          <p className="text-[11px] text-slate-500">
            While municipal authorities strive to meet statutory deadlines, emergency situations and severe natural disasters may necessitate operational rescheduling.
          </p>
        </Card>

        {/* Section 4: Civic Score & Reward Anti-Gaming */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D]">
            4. Civic Score & Anti-Gaming Rules
          </h2>
          <p>
            Civic Score points and Civic Champion badges are awarded exclusively for verified, constructive civic contributions. Points are not awarded for duplicate, rejected, or spam reports.
          </p>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
            <strong>Anti-Gaming Policy:</strong> Attempts to manipulate Civic Scores through automated scripting, falsified verification confirmations, or collusive ratings will result in score forfeiture and administrative moderation.
          </div>
        </Card>

        {/* Section 5: AI Copilot Advisory Notice */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>5. AI Copilot & Automated Assistance Limitations</span>
          </h2>
          <p>
            AI Copilot and automated triage engines provide evidence-grounded decision support to accelerate municipal responsiveness. However:
          </p>
          <ul className="space-y-1 list-disc pl-5 text-slate-600 text-[11px]">
            <li>AI analysis is advisory and subject to official municipal engineer oversight.</li>
            <li>Final case closure and contractor billing require verified physical proof and citizen sign-off.</li>
            <li>Deterministic backend database rules remain authoritative over AI suggestions.</li>
          </ul>
        </Card>

        {/* Section 6: Contact & Dispute Resolution */}
        <Card className="p-5 bg-white border-slate-200 space-y-2">
          <h2 className="text-sm font-bold text-[#123B6D]">
            6. Inquiries & Governance Cell
          </h2>
          <p className="text-slate-600">
            For operational disputes, statutory appeals, or platform inquiries, please contact:
          </p>
          <div className="font-mono text-xs text-[#1769D2]">
            governance@civicresolve.maharashtra.gov.in
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
