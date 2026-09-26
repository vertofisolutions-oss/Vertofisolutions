"use client";
import { useState } from "react";
import { Plus, DownloadCloud, ArrowUpDown } from "lucide-react";

export function TransportersView({ orgId }: { orgId: string }) {
  const [pageSize, setPageSize] = useState(10);

  return (
    <div className="w-full space-y-4">
      {/* Header section outside the card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Manage Transporters</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const name = prompt("Enter Transporter Name:");
              if (name) alert(`Transporter ${name} added.`);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Transporter
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
        {/* Toolbar inside card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-6 py-2 text-[13px] font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer w-fit"
          >
            Excel <DownloadCloud className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 text-[13px] text-slate-700">
            <span>Show entries</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`rounded-full border border-slate-200 px-4 py-1.5 text-sm outline-none focus:border-green-500 shadow-sm transition cursor-pointer appearance-none bg-white`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
                paddingRight: "2.25rem"
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="w-full overflow-visible rounded-lg border border-slate-200/80 mt-1">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#f4f6f8] text-[12px] font-semibold text-slate-700">
              <tr>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50 w-20">
                  <div className="flex items-center gap-1 justify-between">
                    <span>S.No.</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center gap-1 justify-between">
                    <span>Name</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center gap-1 justify-between">
                    <span>Transporter Id</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center gap-1 justify-between">
                    <span>Vehicle Number</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center gap-1 justify-between">
                    <span>Vehicle Type</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center gap-1 justify-between">
                    <span>Mode</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={7} className="py-10 text-center text-[13px] text-[#006666] font-medium tracking-wide">
                  No data available in table
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[13px] pt-1">
          <div className="text-[#006666]">
            Showing 0 to 0 of 0 entries
          </div>
          <div className="flex items-center gap-3 text-slate-800 font-medium">
            <button className="hover:text-slate-500 cursor-pointer transition disabled:opacity-50" disabled>Previous</button>
            <button className="hover:text-slate-500 cursor-pointer transition disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
