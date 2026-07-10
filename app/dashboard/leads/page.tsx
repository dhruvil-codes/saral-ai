"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
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
import { Search } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type CaseCard = {
  id: string;
  caller_number: string;
  name: string | null;
  interest: string | null;
  urgency_level: string | null;
  patient_type: string | null;
  requested_slot: string | null;
  recommended_action: string | null;
  language: string | null;
  status: string | null;
  created_at: string | null;
};

const sampleCaseCards: CaseCard[] = [
  {
    id: "sample-1",
    caller_number: "+91 98765 43210",
    name: "Ananya Sharma",
    interest: "Severe lower back pain after lifting a heavy bag",
    urgency_level: "same_day",
    patient_type: "new",
    requested_slot: "Today evening",
    recommended_action: "book_appointment",
    language: "Hindi",
    status: "new",
    created_at: null,
  },
  {
    id: "sample-2",
    caller_number: "+91 87654 32109",
    name: "Ravi Patel",
    interest: "Dental pain and sensitivity while eating",
    urgency_level: "urgent",
    patient_type: "existing",
    requested_slot: "As soon as possible",
    recommended_action: "callback_now",
    language: "English",
    status: "new",
    created_at: null,
  },
];

const urgencyVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  urgent: "destructive",
  same_day: "default",
  routine: "secondary",
  faq_only: "outline",
};

const formatValue = (value: string | null | undefined) => value || "-";

const formatLabel = (value: string | null | undefined) =>
  formatValue(value).replace(/_/g, " ");

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [caseCards, setCaseCards] = useState<CaseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    async function loadCaseCards() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setCaseCards(sampleCaseCards);
          setUsingFallback(true);
          return;
        }

        const res = await fetch(`${BACKEND_URL}/api/leads`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch case cards");
        }

        const data: CaseCard[] = await res.json();
        setCaseCards(data);
        setUsingFallback(false);
      } catch (err) {
        console.error("Failed to fetch case cards, using fallback sample data", err);
        setCaseCards(sampleCaseCards);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    }

    loadCaseCards();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return caseCards.filter((card) =>
      [
        card.name,
        card.caller_number,
        card.interest,
        card.urgency_level,
        card.patient_type,
        card.requested_slot,
        card.recommended_action,
        card.language,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [caseCards, search]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Case Cards</CardTitle>
          <CardDescription>
            {loading
              ? "Loading structured Stage 2 triage summaries..."
              : `${caseCards.length} structured patient case cards from voice calls`}
            {usingFallback ? " Sample data shown until backend case cards are available." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search case cards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Complaint</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested Slot</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Language</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((card) => {
                const urgency = card.urgency_level || "routine";
                return (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">
                      {formatValue(card.name)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatValue(card.caller_number)}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="line-clamp-2">{formatValue(card.interest)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={urgencyVariant[urgency] || "secondary"} className="text-xs capitalize">
                        {formatLabel(urgency)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {formatLabel(card.patient_type)}
                    </TableCell>
                    <TableCell>{formatValue(card.requested_slot)}</TableCell>
                    <TableCell className="capitalize">
                      {formatLabel(card.recommended_action)}
                    </TableCell>
                    <TableCell>{formatValue(card.language)}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No case cards found.
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


