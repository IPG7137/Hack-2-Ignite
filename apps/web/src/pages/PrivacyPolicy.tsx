import React from 'react';
import { Shield, Lock, Eye, FileText, Database, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              CIVICRESOLVE • Legal & Compliance
            </div>
            <h1 className="text-xl font-extrabold text-[#123B6D] tracking-tight">
              Privacy Policy
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Effective Date: September 28, 2026 • Version 2.0 (Statutory Civic Technology Standard)
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
        {/* Section 1: Overview */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1769D2]" />
            <span>1. Overview & Scope</span>
          </h2>
          <p>
            CIVICRESOLVE is an open civic technology platform providing municipal operations management, statutory Service Level Agreement (SLA) monitoring, and grievance redressal coordination for Municipal Corporations and citizens across Maharashtra. We are committed to safeguarding user privacy, enforcing data isolation, and ensuring transparency in all data processing.
          </p>
        </Card>

        {/* Section 2: Information Collected */}
        <Card className="p-5 bg-white border-slate-200 space-y-3">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#1769D2]" />
            <span>2. Information We Collect</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Account Credentials</div>
              <p className="text-[11px] text-slate-600">
                Verified email address, full name, mobile number, and assigned administrative role. Passwords are cryptographically hashed and salted by Supabase Auth; plain-text passwords are never stored or accessible.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Grievance & Evidence Data</div>
              <p className="text-[11px] text-slate-600">
                Issue category, description, GPS coordinates, photo evidence (before/after), timestamps, and citizen verification feedback.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Spatial Telemetry</div>
              <p className="text-[11px] text-slate-600">
                Geographic coordinates are collected solely to pinpoint municipal issues on GIS maps, perform proximity verification (&lt;200m tolerance), and identify localized cluster hotspots.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">Device & Audit Logs</div>
              <p className="text-[11px] text-slate-600">
                Device push notification tokens (FCM), operational status transition timestamps, and officer action audit trails.
              </p>
            </div>
          </div>
        </Card>

        {/* Section 3: How Information is Used */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#1769D2]" />
            <span>3. How We Use Your Data</span>
          </h2>
          <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
            <li>Dispatching field crews and contractors to resolve reported civic infrastructure failures.</li>
            <li>Enforcing statutory Maharashtra Citizen Charter SLA resolution deadlines.</li>
            <li>Detecting emerging spatial hotspots (500m radius) and clustering common incident reports.</li>
            <li>Enabling citizen before/after resolution verification with GPS anti-tampering audits.</li>
            <li>Computing verified Civic Score points for constructive civic participation.</li>
            <li>Synthesizing grounded, privacy-preserved operational briefings for Municipal Commissioners.</li>
          </ul>
        </Card>

        {/* Section 4: Security & Access Control */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#16803C]" />
            <span>4. Security & District Data Isolation</span>
          </h2>
          <p>
            CIVICRESOLVE enforces strict zero-trust security architecture:
          </p>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1 text-[11px] text-emerald-900">
            <div>• <strong>PostgreSQL Row Level Security (RLS):</strong> Citizens can only view and edit their own private submissions. Officers access only authorized departmental records.</div>
            <div>• <strong>District Isolation:</strong> Municipal data for Pune, Solapur, Nashik, and other districts remains strictly partitioned at the database layer.</div>
            <div>• <strong>Zero Client-Side AI Keys:</strong> All Gemini AI operations execute server-side via Supabase Edge Functions. API keys are never bundled in client code.</div>
            <div>• <strong>PII Redaction:</strong> Aadhaar numbers, phone numbers, and private emails are masked prior to any AI synthesis or public rendering.</div>
          </div>
        </Card>

        {/* Section 5: Third-Party Services */}
        <Card className="p-5 bg-white border-slate-200 space-y-2.5">
          <h2 className="text-sm font-bold text-[#123B6D]">
            5. Third-Party Infrastructure Services
          </h2>
          <p>
            We utilize secure enterprise infrastructure providers under strict contractual confidentiality:
          </p>
          <ul className="space-y-1 list-disc pl-5 text-slate-600 text-[11px]">
            <li><strong>Supabase / PostgreSQL:</strong> Database storage, authentication, and encrypted file storage.</li>
            <li><strong>Google Gemini AI (Server-Side):</strong> Natural language classification and executive briefing summarization.</li>
            <li><strong>OpenStreetMap / MapLibre:</strong> Open-source vector and raster basemap rendering.</li>
          </ul>
        </Card>

        {/* Section 6: Contact */}
        <Card className="p-5 bg-white border-slate-200 space-y-2">
          <h2 className="text-sm font-bold text-[#123B6D]">
            6. Contact & Data Protection Officer
          </h2>
          <p className="text-slate-600">
            For inquiries regarding civic data protection or privacy rights, contact the Municipal IT & Governance Cell at:
          </p>
          <div className="font-mono text-xs text-[#1769D2]">
            support@civicresolve.maharashtra.gov.in
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
