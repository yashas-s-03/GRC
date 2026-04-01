import React from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// Generates attack scenario based on a check ID
function getAttackScenario(checkId) {
  const scenarios = {
    'ssl': 'Attackers could intercept unencrypted traffic between your users and your server (Man-in-the-Middle).',
    'https_enforcement': 'Users typing your domain without https:// might be served over an insecure connection, leaking session cookies.',
    'header_content_security_policy': 'Lack of CSP allows attackers to execute malicious scripts in your users\' browsers (Cross-Site Scripting).',
    'header_strict_transport_security': 'Without HSTS, attackers can quietly downgrade connections from HTTPS to HTTP.',
    'header_x_frame_options': 'Attackers can embed your site in an invisible iframe and trick users into clicking buttons they didn\'t intend (Clickjacking).',
    'exposed_paths': 'Sensitive environment variables or configuration files might leak database credentials and API keys.',
    'dns_spf': 'Spammers can send emails pretending to be from your domain, damaging your brand reputation.',
    'dns_dmarc': 'Without DMARC, email providers might reject legitimate emails you send to customers.',
    'third_party_scripts': 'If a third-party script gets hacked, the attacker instantly gains control of your users\' sessions.',
    'hibp': 'Credentials connected to this domain have been leaked on the dark web, making it vulnerable to credential stuffing attacks.',
    'cookie_flags': 'Session cookies without Secure/HttpOnly flags can be stolen via XSS or intercepted on legacy networks.'
  };
  return scenarios[checkId] || 'Vulnerability could be chained with other exploits to compromise user data or system integrity.';
}

function getImpactLevel(severity) {
  if (severity === 'critical') return 'High';
  if (severity === 'medium') return 'Medium';
  return 'Low';
}

export default function PDFReportTemplate({ result }) {
  const { scores = {}, checks = [], actionPlan = [], domain, scannedAt, aiSummary, verdict, confidence, confidenceNote } = result;

  const passedChecks = checks.filter(c => c.status === 'pass');
  const criticalFindings = actionPlan.filter(a => a.severity === 'critical');
  const importantFindings = actionPlan.filter(a => a.severity === 'medium');

  const topScenarios = actionPlan.slice(0, 3).map(a => ({
    title: a.title,
    scenario: getAttackScenario(a.item?.id || a.title.toLowerCase().replace(/ /g, '_'))
  }));

  const potentialScore = Math.min(100, scores.total + criticalFindings.reduce((sum, f) => sum + (f.pointsIfFixed || 0), 0));

  return (
    <div id="pdf-export-template" className="pdf-capture-mode" style={{ width: '800px', background: '#f8fafc', color: '#0f172a', padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. COVER HEADER */}
      <div style={{ borderBottom: '4px solid #0f172a', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '10px' }}>
            <Shield size={24} color="#6366f1" />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>TrustLens Security Report</h1>
          </div>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#475569' }}><strong>Target:</strong> {domain}</p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#475569' }}><strong>Scan Date:</strong> {new Date(scannedAt).toLocaleDateString()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '48px', fontWeight: 900, color: scores.grade === 'A' || scores.grade === 'B' ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
            {scores.total}<span style={{ fontSize: '20px', color: '#64748b' }}>/100</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '5px' }}>Grade {scores.grade}</div>
          <div style={{ display: 'inline-block', marginTop: '10px', padding: '4px 12px', background: '#e2e8f0', borderRadius: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
            {verdict}
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE SUMMARY */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Executive Summary</h2>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#334155', margin: 0 }}>
          {aiSummary?.summary || `The security posture of ${domain} has been evaluated at a score of ${scores.total}/100. ${criticalFindings.length > 0 ? `We detected ${criticalFindings.length} critical risks that require immediate remediation to prevent exploitation.` : 'No highly critical risks were detected, but foundational improvements are recommended.'} The scan achieved a confidence level of ${confidence}%. Overall recommendation is to immediately action the top findings below to establish baseline security maturity.`}
        </p>
      </div>

      {/* 3. SCORE BREAKDOWN */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Score Breakdown</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{scores.governance}/30</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Governance</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px' }}>Policies & Controls</div>
          </div>
          <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{scores.risk}/40</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Risk</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px' }}>Technical Vulns</div>
          </div>
          <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{scores.compliance}/30</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Compliance</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px' }}>DNS & Privacy</div>
          </div>
          <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800 }}>{confidence}/100</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Confidence</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px' }}>Scan Reliability</div>
          </div>
        </div>
      </div>

      {/* 4. KEY FINDINGS */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Key Findings</h2>
        
        {criticalFindings.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}><XCircle size={16} /> Critical Risks</h3>
            <ul style={{ fontSize: '13px', margin: '5px 0 0 20px', color: '#334155' }}>
              {criticalFindings.map((f, i) => <li key={i}>{f.title}</li>)}
            </ul>
          </div>
        )}

        {importantFindings.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}><AlertTriangle size={16} /> Important Issues</h3>
            <ul style={{ fontSize: '13px', margin: '5px 0 0 20px', color: '#334155' }}>
              {importantFindings.map((f, i) => <li key={i}>{f.title}</li>)}
            </ul>
          </div>
        )}

        {passedChecks.length > 0 && (
          <div>
            <h3 style={{ fontSize: '14px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={16} /> Good Practices Detected</h3>
            <ul style={{ fontSize: '13px', margin: '5px 0 0 20px', color: '#334155' }}>
              {passedChecks.slice(0, 5).map((c, i) => <li key={i}>{c.name}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* 5. ATTACK SCENARIOS & 6. BUSINESS IMPACT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Attack Scenarios</h2>
          {topScenarios.length > 0 ? (
            <ul style={{ fontSize: '13px', margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.5 }}>
              {topScenarios.map((ts, i) => (
                <li style={{ marginBottom: '10px' }} key={i}><strong>{ts.title}:</strong> {ts.scenario}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '13px', color: '#64748b' }}>No critical attack vectors immediately exploitable based on remote scan mapping.</p>
          )}
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Business Impact</h2>
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '10px' }}>
            <strong>User Trust:</strong> {scores.total < 60 ? 'Current vulnerabilities actively erode user confidence and deter enterprise adoption.' : 'Maintaining a solid secure posture reinforces brand safety.'}
          </p>
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '10px' }}>
            <strong>Legal/Compliance Risk:</strong> {scores.compliance < 15 ? 'High risk of failing vendor security questionnaires and violating privacy regulations.' : 'Adequate foundation for SOC2 and vendor security assessments.'}
          </p>
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
            <strong>Brand Credibility:</strong> A public data breach or exposed environment variables directly threaten the startup's operational runway.
          </p>
        </div>
      </div>

      {/* 7. TOP RECOMMENDATIONS & 8. SIMULATION */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Top Recommendations</h2>
          <ol style={{ fontSize: '13px', margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: 1.6 }}>
            {actionPlan.slice(0, 5).map((a, i) => (
              <li style={{ marginBottom: '5px' }} key={i}><strong>{a.title}</strong> — {a.why}</li>
            ))}
          </ol>
        </div>
        <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>Improvement Simulation</h2>
          <p style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#475569' }}>If critical issues are fixed:</p>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>→ New Score: {potentialScore}</div>
          <div style={{ fontSize: '14px', color: '#16a34a', marginTop: '5px', fontWeight: 600 }}>→ Risk Reduction: {Math.max(0, potentialScore - scores.total)}%</div>
        </div>
      </div>

      {/* 9. DETAILED CHECKS */}
      <div style={{ marginBottom: '30px', pageBreakInside: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Detailed Checks</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#e2e8f0' }}>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Check Name</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Status</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Impact Level</th>
              <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Explanation</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c, i) => {
              const isUnable = c.confidenceNote?.includes('failed to run') || c.detail?.includes('failed to run');
              const displayStatus = isUnable ? 'UNVERIFIED' : c.status.toUpperCase();
              return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#f1f5f9' }}>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: displayStatus === 'PASS' ? '#16a34a' : displayStatus === 'UNVERIFIED' ? '#64748b' : '#dc2626', fontWeight: 700 }}>{displayStatus}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', textTransform: 'capitalize' }}>{isUnable ? '-' : (c.severity || 'Low')}</td>
                <td style={{ padding: '8px', border: '1px solid #cbd5e1', color: '#475569' }}>{c.detail}</td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* 10. CONFIDENCE & LIMITATIONS */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>Confidence & Limitations</h2>
        <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${confidence > 70 ? '#16a34a' : '#f59e0b'}` }}>
          <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
            <strong>Confidence Score: {confidence}/100.</strong> {confidenceNote}
            <br/><br/>
            <em>Methodology Limitation:</em> TrustLens performs non-destructive, remote OSINT scans and does not simulate deep authentication or firewall bypassing. Results should be interpreted as external-facing hygiene signals, not a comprehensive penetration test.
          </p>
        </div>
      </div>

    </div>
  );
}
