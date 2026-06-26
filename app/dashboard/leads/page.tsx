"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const leads = [
  { name: "Ananya Sharma", phone: "+91 98765 43210", intent: "Haircut", urgency: "High", status: "New" },
  { name: "Ravi Patel", phone: "+91 87654 32109", intent: "Consultation", urgency: "Medium", status: "Contacted" },
  { name: "Priya Mehta", phone: "+91 76543 21098", intent: "Appointment", urgency: "Low", status: "New" },
  { name: "Arjun Singh", phone: "+91 65432 10987", intent: "Haircut", urgency: "High", status: "Contacted" },
  { name: "Kavita Nair", phone: "+91 54321 09876", intent: "Coloring", urgency: "Medium", status: "New" },
  { name: "Suresh Kumar", phone: "+91 43210 98765", intent: "Consultation", urgency: "Low", status: "Contacted" },
  { name: "Deepa Reddy", phone: "+91 32109 87654", intent: "Appointment", urgency: "High", status: "New" },
  { name: "Mohan Joshi", phone: "+91 21098 76543", intent: "Haircut", urgency: "Medium", status: "New" },
  { name: "Lalitha Krishnan", phone: "+91 10987 65432", intent: "Consultation", urgency: "Low", status: "Contacted" },
  { name: "Vikram Bose", phone: "+91 09876 54321", intent: "Coloring", urgency: "High", status: "New" },
];

const urgencyVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High: "destructive",
  Medium: "default",
  Low: "secondary",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  New: "default",
  Contacted: "secondary",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.intent.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            {leads.length} total leads captured from voice calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.phone}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell>{lead.intent}</TableCell>
                  <TableCell>
                    <Badge variant={urgencyVariant[lead.urgency]} className="text-xs">
                      {lead.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[lead.status]} className="text-xs">
                      {lead.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No leads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
