"use client";
import { useEffect } from "react";
import { PanelShell } from "@/components/accountants/PanelShell";
import { ClientWorkspace } from "@/components/accountants/ClientWorkspace";
import { AssignmentInbox } from "@/components/accountants/AssignmentInbox";

export default function AccountantsPanel() {
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("vertofi.panels.access")) {
      window.location.href = "/accountants/login";
    }
  }, []);

  return (
    <PanelShell
      title="Accountant Panel"
      subtitle="View your associate's clients and ping the associate when you spot a flaw."
      allow={["ACCOUNTANT"]}
    >
      <div className="space-y-6">
        <AssignmentInbox />
        <ClientWorkspace caps={{ canFlag: true }} />
      </div>
    </PanelShell>
  );
}
