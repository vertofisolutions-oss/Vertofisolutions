"use client";
import { PanelShell } from "../components/PanelShell";
import { ClientWorkspace } from "../components/ClientWorkspace";
import { AssignmentInbox } from "../components/AssignmentInbox";

export default function AccountantsPanel() {
  return (
    <PanelShell
      title="Accountant Panel"
      subtitle="View your associate's clients and ping the associate when you spot a flaw."
      allow={["ACCOUNTANT", "ADMIN"]}
    >
      <div className="space-y-6">
        <AssignmentInbox />
        <ClientWorkspace caps={{ canFlag: true }} />
      </div>
    </PanelShell>
  );
}
