"use client";

import { useState } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  Undo,
  Bot
} from "lucide-react";

// Mock Leads Data tailored for Indian MSMEs
const initialLeads = [
  { id: 1, name: "Priya Sharma", phone: "+91 98102 34567", intent: "Haircut & hair coloring appointment", urgency: "High", status: "New", date: "2026-06-25" },
  { id: 2, name: "Rajesh Gupta", phone: "+91 99112 88344", intent: "Bridal makeup package pricing & queries", urgency: "Medium", status: "Contacted", date: "2026-06-24" },
  { id: 3, name: "Amit Verma", phone: "+91 98711 02938", intent: "Commercial property site visit (Sector 62)", urgency: "High", status: "New", date: "2026-06-25" },
  { id: 4, name: "Sneha Patel", phone: "+91 98122 88442", intent: "Keratin treatment appointment slots", urgency: "Low", status: "New", date: "2026-06-25" },
  { id: 5, name: "Vikram Malhotra", phone: "+91 99991 23456", intent: "Annual VIP salon membership details", urgency: "Medium", status: "Contacted", date: "2026-06-23" },
  { id: 6, name: "Divya Iyer", phone: "+91 98450 12345", intent: "Party makeup for 5 ladies on Saturday", urgency: "High", status: "New", date: "2026-06-25" },
  { id: 7, name: "Sanjay Singh", phone: "+91 97118 77665", intent: "Full-body spa package booking", urgency: "Low", status: "Contacted", date: "2026-06-22" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Toggle lead contacted status
  const toggleStatus = (id: number) => {
    setLeads(leads.map(lead => {
      if (lead.id === id) {
        return {
          ...lead,
          status: lead.status === "New" ? "Contacted" : "New"
        };
      }
      return lead;
    }));
  };

  // Filter logic
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.intent.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUrgency = urgencyFilter === "All" || lead.urgency === urgencyFilter;
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;

    return matchesSearch && matchesUrgency && matchesStatus;
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "High":
        return (
          <span className="inline-block bg-[var(--color-accent-light)] text-[#92400e] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            High
          </span>
        );
      case "Medium":
        return (
          <span className="inline-block bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Medium
          </span>
        );
      case "Low":
        return (
          <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "New":
        return (
          <span className="inline-block bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            New
          </span>
        );
      case "Contacted":
        return (
          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Contacted
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Captured Leads
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Review qualified business opportunities transcripted and classified by AI.
          </p>
        </div>

        {/* Primary/Secondary action button - Pill shaped */}
        <button
          onClick={() => alert("Leads exported to CSV format!")}
          className="inline-flex items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-primary)] font-semibold rounded-full px-5 py-2 hover:border-[var(--color-text-primary)] transition-all text-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters Toolbar - Card structure */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by Name, Phone, or Intent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full pl-10 pr-4 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-sans"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="font-semibold text-[var(--color-text-secondary)]">Urgency:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full px-3 py-1 font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="All">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--color-text-secondary)]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full px-3 py-1 font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="All">All</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] font-bold text-xs uppercase tracking-wider font-sans">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Qualified Intent</th>
                <th className="px-6 py-4 text-center">Urgency</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] text-sm text-[var(--color-text-primary)]">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{lead.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{lead.phone}</td>
                    <td className="px-6 py-4 max-w-xs truncate text-[var(--color-text-secondary)]" title={lead.intent}>
                      {lead.intent}
                    </td>
                    <td className="px-6 py-4 text-center">{getUrgencyBadge(lead.urgency)}</td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(lead.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleStatus(lead.id)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                          lead.status === "New"
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300"
                            : "border-[var(--color-border-strong)] text-[var(--color-text-secondary)] bg-transparent hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        {lead.status === "New" ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Contacted</span>
                          </>
                        ) : (
                          <>
                            <Undo className="w-3.5 h-3.5" />
                            <span>Mark New</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Bot className="w-8 h-8 text-[var(--color-text-muted)] animate-pulse" />
                      <p className="font-semibold text-sm">No leads match the filters.</p>
                      <p className="text-xs">Try clearing the search or changing parameters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer stats bar */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] flex justify-between items-center text-xs text-[var(--color-text-secondary)] font-sans">
          <div>
            Showing <strong className="text-[var(--color-text-primary)]">{filteredLeads.length}</strong> of{" "}
            <strong className="text-[var(--color-text-primary)]">{leads.length}</strong> total qualified leads
          </div>
          <div>
            AI Filter Active
          </div>
        </div>
      </div>
    </div>
  );
}
