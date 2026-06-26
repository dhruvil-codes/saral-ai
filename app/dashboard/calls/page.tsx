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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Search, Play, Pause } from "lucide-react";

type CallLog = {
  id: string;
  caller: string;
  status: "Completed" | "Voicemail" | "Missed";
  duration: string;
  date: string;
  transcript: string;
};

const callLogs: CallLog[] = [
  {
    id: "1",
    caller: "+91 98765 43210",
    status: "Completed",
    duration: "3m 42s",
    date: "Today, 2:15 PM",
    transcript: `Agent: Hello! Thank you for calling Saral AI. How can I help you today?\n\nCaller: Hi, I wanted to book a haircut appointment for tomorrow.\n\nAgent: Of course! What time works best for you?\n\nCaller: Sometime around 11 AM would be great.\n\nAgent: Perfect. I've noted that down. Your appointment is confirmed for tomorrow at 11 AM. Is there anything else I can help you with?\n\nCaller: No, that's all. Thank you!\n\nAgent: Have a wonderful day!`,
  },
  {
    id: "2",
    caller: "+91 87654 32109",
    status: "Voicemail",
    duration: "0m 32s",
    date: "Today, 1:48 PM",
    transcript: `[Voicemail recording]\n\nCaller: Hi, this is Ravi. I had a quick question about your services. Please call me back at your earliest convenience. Thank you.`,
  },
  {
    id: "3",
    caller: "+91 76543 21098",
    status: "Completed",
    duration: "5m 18s",
    date: "Today, 12:30 PM",
    transcript: `Agent: Hello! Saral AI speaking. How may I assist you today?\n\nCaller: I'd like to know more about your consultation services.\n\nAgent: Absolutely! We offer 30-minute and 60-minute consultation slots. The 30-minute slot is ₹500 and the 60-minute slot is ₹900.\n\nCaller: That sounds good. Can I book a 60-minute slot for next Monday?\n\nAgent: Of course! I have a slot available at 10 AM and 3 PM next Monday. Which would you prefer?\n\nCaller: 10 AM works perfectly.\n\nAgent: Great! Your 60-minute consultation is booked for next Monday at 10 AM. You'll receive a confirmation SMS shortly.`,
  },
  {
    id: "4",
    caller: "+91 65432 10987",
    status: "Completed",
    duration: "2m 05s",
    date: "Today, 11:15 AM",
    transcript: `Agent: Hi there! Welcome to Saral AI. What can I do for you?\n\nCaller: I just wanted to confirm my appointment for today at 4 PM.\n\nAgent: Let me check that for you... Yes, your appointment is confirmed for today at 4 PM for a haircut with Rahul. Is there anything else?\n\nCaller: No, perfect. Thanks!\n\nAgent: See you at 4 PM!`,
  },
  {
    id: "5",
    caller: "+91 54321 09876",
    status: "Voicemail",
    duration: "0m 18s",
    date: "Yesterday, 5:45 PM",
    transcript: `[Voicemail recording]\n\nCaller: Please call me back regarding my appointment cancellation.`,
  },
  {
    id: "6",
    caller: "+91 43210 98765",
    status: "Completed",
    duration: "7m 44s",
    date: "Yesterday, 3:20 PM",
    transcript: `Agent: Hello! This is Saral AI. How can I help you today?\n\nCaller: I want to reschedule my appointment and also ask about your hair coloring services.\n\nAgent: Of course! Let me help with both. First, when would you like to reschedule to?\n\nCaller: Next Wednesday at 2 PM if possible.\n\nAgent: I've rescheduled your appointment to next Wednesday at 2 PM. Now regarding hair coloring, we offer full coloring, highlights, and balayage services. Prices start from ₹1,500 for basic coloring.\n\nCaller: Great! What about highlights?\n\nAgent: Highlights start from ₹2,200 depending on the length of your hair. Would you like to book a coloring session?\n\nCaller: Yes please, add highlights to my Wednesday appointment.\n\nAgent: Done! Your Wednesday 2 PM appointment now includes highlights. Anything else?\n\nCaller: That's perfect, thank you so much!`,
  },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  Completed: "default",
  Voicemail: "secondary",
  Missed: "destructive",
};

export default function CallsPage() {
  const [search, setSearch] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const filtered = callLogs.filter(
    (c) =>
      c.caller.includes(search) ||
      c.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Call Logs</CardTitle>
          <CardDescription>
            Click any row to view the full transcript and audio playback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((call) => (
                <TableRow
                  key={call.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedCall(call)}
                >
                  <TableCell className="font-medium">{call.caller}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[call.status]} className="text-xs">
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{call.duration}</TableCell>
                  <TableCell className="text-muted-foreground">{call.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Call Detail Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Call Details</SheetTitle>
            <SheetDescription>
              {selectedCall?.caller} · {selectedCall?.date}
            </SheetDescription>
          </SheetHeader>

          {selectedCall && (
            <div className="mt-6 flex flex-col gap-4">
              {/* Status + Duration */}
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[selectedCall.status]}>
                  {selectedCall.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Duration: {selectedCall.duration}
                </span>
              </div>

              <Separator />

              {/* Audio Playback Placeholder */}
              <div>
                <p className="text-sm font-medium mb-2">Audio Recording</p>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-border">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: isPlaying ? "35%" : "0%" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedCall.duration}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Transcript */}
              <div>
                <p className="text-sm font-medium mb-3">Transcript</p>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedCall.transcript}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
