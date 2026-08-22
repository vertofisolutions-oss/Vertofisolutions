"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PanelShell, Card } from "@/components/admin/PanelShell";
import { api, type TeamMember, type CompanyAssignment, type AccessRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/admin-api";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
    DEACTIVATED: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ACTIVE" ? "bg-emerald-500" : status === "SUSPENDED" ? "bg-amber-500" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

function AccessBadge({ level }: { level: "READ" | "READ_WRITE" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${level === "READ_WRITE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
      {level === "READ_WRITE" ? "Read + Write" : "Read only"}
    </span>
  );
}

// â”€â”€ Approve Request Popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ApprovePopup({
  request,
  onClose,
  onDone,
}: {
  request: AccessRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [accessLevel, setAccessLevel] = useState<"READ" | "READ_WRITE">("READ");
  const [adminPassword, setAdminPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!adminPassword) { setError("Enter your admin password to confirm."); return; }
    setBusy(true); setError(null);
    try {
      await api.approveRequest(request.id, accessLevel, adminPassword);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Approval failed");
    } finally { setBusy(false); }
  }

  async function reject() {
    setBusy(true); setError(null);
    try {
      await api.rejectRequest(request.id);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Rejection failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Access Request â€” {request.team_member_name}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-400">{request.employee_id}</p>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Requesting access to:</p>
          <p className="mt-1 text-base font-bold text-slate-900">{request.org_name}</p>
          {request.reason && <p className="mt-1 text-xs text-slate-500 italic">"{request.reason}"</p>}
        </div>

        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Grant As</label>
          <div className="mt-2 flex gap-3">
            {(["READ", "READ_WRITE"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setAccessLevel(lvl)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                  accessLevel === lvl
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {lvl === "READ" ? "Read only" : "Read + Write"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Admin Password (re-verification required)
          </label>
          <input
            type="password"
            placeholder="Your admin password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && approve()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            autoFocus
          />
        </div>

        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={reject}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={approve}
            disabled={busy || !adminPassword}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Approvingâ€¦" : "Approve âœ“"}
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
    </div>
  );
}

// â”€â”€ Company Assignment Panel (inline expandable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AssignmentPanel({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [assignments, setAssignments] = useState<CompanyAssignment[]>([]);
  const [newOrgId, setNewOrgId] = useState("");
  const [newAccess, setNewAccess] = useState<"READ" | "READ_WRITE">("READ");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try { setAssignments(await api.listAssignments(member.id)); }
    finally { setLoading(false); }
  }, [member.id]);

  useEffect(() => { void loadAssignments(); }, [loadAssignments]);

  async function toggleAccess(orgId: string, current: "READ" | "READ_WRITE") {
    const next = current === "READ" ? "READ_WRITE" : "READ";
    await api.updateAssignmentAccess(member.id, orgId, next);
    await loadAssignments();
  }

  async function remove(orgId: string) {
    await api.removeAssignment(member.id, orgId);
    await loadAssignments();
  }

  async function assign() {
    if (!newOrgId.trim()) return;
    setBusy(true);
    try {
      await api.assignCompany(member.id, newOrgId.trim(), newAccess);
      setNewOrgId("");
      await loadAssignments();
    } finally { setBusy(false); }
  }

  return (
    <div className="col-span-full mt-1 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-800">
          Company Access â€” {member.full_name} <span className="font-mono text-xs text-slate-400">{member.employee_id}</span>
        </h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">Ã—</button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Loadingâ€¦</p>
      ) : assignments.length === 0 ? (
        <p className="text-xs text-slate-500 mb-3">No companies assigned yet.</p>
      ) : (
        <div className="mb-3 overflow-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Access</th>
                <th className="px-4 py-2 text-right">Remove</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{a.org_name}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => toggleAccess(a.org_id, a.access_level)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition hover:opacity-80 ${
                        a.access_level === "READ_WRITE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {a.access_level === "READ_WRITE" ? "Read + Write" : "Read only"} â†•
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => remove(a.org_id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign new company */}
      <div className="flex gap-2">
        <input
          placeholder="Org ID (UUID)"
          value={newOrgId}
          onChange={(e) => setNewOrgId(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <select
          value={newAccess}
          onChange={(e) => setNewAccess(e.target.value as "READ" | "READ_WRITE")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
        >
          <option value="READ">Read only</option>
          <option value="READ_WRITE">Read + Write</option>
        </select>
        <button
          onClick={assign}
          disabled={busy || !newOrgId.trim()}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "â€¦" : "Assign"}
        </button>
      </div>
    </div>
  );
}

// â”€â”€ Add / Edit Member Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MemberDrawer({
  member,
  onClose,
  onDone,
}: {
  member?: TeamMember;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = !!member;
  const [fullName, setFullName] = useState(member?.full_name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [mobile, setMobile] = useState(member?.mobile ?? "");
  const [jobTitle, setJobTitle] = useState(member?.job_title ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!fullName.trim() || !email.trim()) { setError("Name and email are required."); return; }
    if (!editing && !password) { setError("Password is required for new members."); return; }
    setBusy(true);
    try {
      if (editing) {
        await api.updateTeamMember(member!.id, { fullName, jobTitle: jobTitle || undefined, mobile: mobile || undefined });
      } else {
        const m = await api.createTeamMember({ fullName, email, mobile: mobile || undefined, jobTitle: jobTitle || undefined, password });
        setCreated(m.employee_id);
        return;
      }
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed");
    } finally { setBusy(false); }
  }

  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30" onClick={onClose}>
        <div className="h-full w-full max-w-md bg-white shadow-2xl p-8 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Member Created</h3>
          <p className="text-lg font-mono font-bold text-blue-600 mb-1">{created}</p>
          <p className="text-sm text-slate-500 mb-6 text-center">Share the credentials and a panel activation link with this team member.</p>
          <button onClick={onDone} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">{editing ? "Edit Member" : "Add Team Member"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">Ã—</button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Full Name *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ravi Kumar"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" />
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ravi@vertofi.com" type="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Mobile (optional)</label>
            <div className="flex gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">+91</div>
              <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="9876543210" maxLength={10}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Job Title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Financial Analyst"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" />
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Password * (you will share this manually)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-5">
          <button onClick={submit} disabled={busy}
            className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {busy ? (editing ? "Savingâ€¦" : "Creatingâ€¦") : (editing ? "Save Changes" : "Create Member â†’")}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Reset Password Popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResetPasswordPopup({ member, onClose, onDone }: { member: TeamMember; onClose: () => void; onDone: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true); setError(null);
    try { await api.resetTeamPassword(member.id, newPassword); onDone(); }
    catch (e) { setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
        <p className="text-sm text-slate-500 mt-1">{member.full_name} Â· <span className="font-mono">{member.employee_id}</span></p>
        <div className="mt-4 relative">
          <input type={show ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 8 chars)" autoFocus
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:bg-white" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">{show ? "Hide" : "Show"}</button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 font-semibold">{error}</p>}
        <p className="mt-2 text-xs text-slate-400">Copy this password and share it with the team member manually.</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Resettingâ€¦" : "Reset Password"}</button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Generate Token Popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GenerateTokenPopup({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const [label, setLabel] = useState(`${member.full_name}'s device`);
  const [busy, setBusy] = useState(false);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true); setError(null);
    try {
      const res = await api.generateToken({ panel: "TEAMS", label, teamMemberId: member.id });
      setActivationUrl(res.activationUrl);
    } catch (e) { setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed"); }
    finally { setBusy(false); }
  }

  function copy() {
    if (!activationUrl) return;
    navigator.clipboard.writeText(activationUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Generate Access Link</h3>
        <p className="text-sm text-slate-500 mt-1">{member.full_name} Â· <span className="font-mono">{member.employee_id}</span></p>

        {!activationUrl ? (
          <>
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Device Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
            </div>
            {error && <p className="mt-2 text-xs text-red-600 font-semibold">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Cancel</button>
              <button onClick={generate} disabled={busy} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Generatingâ€¦" : "Generate Link"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Activation Link (one-time share)</p>
              <p className="break-all text-xs font-mono text-slate-700">{activationUrl}</p>
            </div>
            <p className="mt-2 text-xs text-amber-600 font-semibold">âš ï¸ Copy and share this link securely. It grants permanent panel access.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Done</button>
              <button onClick={copy} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white">
                {copied ? "âœ“ Copied!" : "Copy Link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // UI state
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | undefined>();
  const [resetMember, setResetMember] = useState<TeamMember | null>(null);
  const [tokenMember, setTokenMember] = useState<TeamMember | null>(null);
  const [approveRequest, setApproveRequest] = useState<AccessRequest | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLTableCellElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listTeamMembers({ q: q || undefined, status: statusFilter || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setMembers(res.members);
      setTotal(res.total);
    } finally { setLoading(false); }
  }, [q, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdownId(null); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleStatusToggle(member: TeamMember) {
    if (member.status === "ACTIVE") await api.suspendTeamMember(member.id);
    else await api.activateTeamMember(member.id);
    setOpenDropdownId(null);
    await load();
  }

  return (
    <PanelShell title="Team Members" subtitle="Manage internal team staff â€” create members, assign companies, approve access requests." allow={["ADMIN"]}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              placeholder="Search by name, email, VTF-XXXXâ€¦"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
        <button
          onClick={() => { setEditMember(undefined); setShowDrawer(true); }}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
        >
          <span className="text-lg leading-none">+</span> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{total}</span> members total
        {total > 0 && <span>Â·</span>}
        {members.some((m) => m.pending_requests > 0) && (
          <span className="font-bold text-amber-600">
            {members.reduce((s, m) => s + m.pending_requests, 0)} pending access request{members.reduce((s, m) => s + m.pending_requests, 0) !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Employee ID</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Name / Email</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Title</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Companies</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Joined</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    {q ? "No members found for this search." : "No team members yet. Click \"Add Member\" to create the first one."}
                  </td>
                </tr>
              ) : (
                members.flatMap((m) => [
                  <tr key={m.id} className={`border-t border-slate-100 transition ${expandedMemberId === m.id ? "bg-blue-50/30" : "hover:bg-slate-50/70"}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-bold text-slate-700">{m.employee_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{m.full_name}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                      {m.mobile && <div className="text-xs text-slate-400">+91 {m.mobile}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.job_title ?? <span className="text-slate-300">â€”</span>}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedMemberId(expandedMemberId === m.id ? null : m.id)}
                        className="flex items-center gap-1.5"
                      >
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition">
                          {m.assignment_count} {m.assignment_count === 1 ? "org" : "orgs"} ðŸ¢
                        </span>
                        {m.pending_requests > 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const reqs = await api.listAccessRequests("PENDING");
                              const req = reqs.find((r) => r.team_member_id === m.id);
                              if (req) setApproveRequest(req);
                            }}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 hover:bg-amber-200 transition animate-pulse"
                          >
                            {m.pending_requests} pending
                          </button>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{ago(m.created_at)}</td>
                    <td className="px-4 py-3 relative" ref={openDropdownId === m.id ? dropdownRef : undefined}>
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                        className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition text-lg font-bold"
                      >
                        Â·Â·Â·
                      </button>
                      {openDropdownId === m.id && (
                        <div className="absolute right-0 top-full z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-xl">
                          {[
                            { label: "Edit", action: () => { setEditMember(m); setShowDrawer(true); setOpenDropdownId(null); } },
                            { label: "Reset Password", action: () => { setResetMember(m); setOpenDropdownId(null); } },
                            { label: "Generate Access Link", action: () => { setTokenMember(m); setOpenDropdownId(null); } },
                            { label: "Force Logout", action: async () => { await api.forceLogout(m.id); setOpenDropdownId(null); } },
                            { label: m.status === "ACTIVE" ? "Suspend" : "Activate", action: () => handleStatusToggle(m) },
                          ].map((item) => (
                            <button key={item.label} onClick={item.action}
                              className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition first:rounded-t-xl last:rounded-b-xl ${
                                item.label === "Suspend" ? "text-amber-600" : item.label === "Force Logout" ? "text-red-500" : "text-slate-700"
                              }`}>
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>,
                  // Inline assignment expansion
                  expandedMemberId === m.id && (
                    <tr key={`${m.id}-assignments`}>
                      <td colSpan={7} className="px-4 pb-2">
                        <AssignmentPanel member={m} onClose={() => setExpandedMemberId(null)} />
                      </td>
                    </tr>
                  ),
                ])
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">{page * PAGE_SIZE + 1}â€“{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40">â† Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40">Next â†’</button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals / Drawers */}
      {showDrawer && (
        <MemberDrawer
          member={editMember}
          onClose={() => { setShowDrawer(false); setEditMember(undefined); }}
          onDone={() => { setShowDrawer(false); setEditMember(undefined); void load(); }}
        />
      )}
      {resetMember && (
        <ResetPasswordPopup
          member={resetMember}
          onClose={() => setResetMember(null)}
          onDone={() => { setResetMember(null); }}
        />
      )}
      {tokenMember && (
        <GenerateTokenPopup
          member={tokenMember}
          onClose={() => setTokenMember(null)}
        />
      )}
      {approveRequest && (
        <ApprovePopup
          request={approveRequest}
          onClose={() => setApproveRequest(null)}
          onDone={() => { setApproveRequest(null); void load(); }}
        />
      )}
    </PanelShell>
  );
}

