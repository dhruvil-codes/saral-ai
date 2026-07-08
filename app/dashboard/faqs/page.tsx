"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
  last_updated?: string;
  needs_verification?: boolean;
};

const initialFaqs: FAQ[] = [
  {
    id: "1",
    question: "What is the name of the clinic and what do you do? / क्लीनिक का नाम क्या है और यह किस बारे में है?",
    answer: "The clinic is \"Niramay Physiotherapy & Dental Clinic\", providing premium physiotherapy, sports injury rehabilitation, and dental care. / क्लीनिक का नाम \"Niramay Physiotherapy & Dental Clinic\" (निरामय फिजियोथेरेपी एंड डेंटल क्लीनिक) है। हम उच्च स्तरीय फिजियोथेरेपी, स्पोर्ट्स इंजरी रिहैबिलिटेशन (खेल की चोटों का पुनर्वास), और डेंटल केयर (दांतों का इलाज) प्रदान करते हैं।",
    category: "General",
    last_updated: "2026-07-01T10:00:00.000Z",
    needs_verification: false,
  },
  {
    id: "2",
    question: "What are your operating hours? / क्लीनिक कब खुला रहता है? / क्लीनिकची वेळ काय आहे?",
    answer: "We are open Monday to Saturday from 9:00 AM to 8:00 PM, with a lunch break from 1:00 PM to 2:00 PM. We are closed on Sundays. / क्लीनिक सोमवार से शनिवार सुबह 9:00 बजे से रात 8:00 बजे तक खुला रहता है। दोपहर 1:00 बजे से 2:00 बजे तक लंच ब्रेक (दोपहर का भोजन अवकाश) होता है। रविवार को क्लीनिक बंद रहता है। / क्लीनिक सोमवार ते शनिवार सकाळी 9:00 ते रात्री 8:00 पर्यंत उघडे असते. दुपारी 1:00 ते 2:00 या वेळेत जेवणाची सुटी असते. रविवारी क्लीनिक बंद असते.",
    category: "Hours",
    last_updated: "2026-05-15T10:00:00.000Z", // > 30 days old
    needs_verification: true,
  },
  {
    id: "3",
    question: "Who are the doctors and when are they available? / कौन से डॉक्टर उपलब्ध हैं और उनका समय क्या है? / डॉक्टर कधी उपलब्ध असतात?",
    answer: "We have two main specialists: 1. Dr. Amit Sharma (PT), Senior Physiotherapist (specialized in sports rehab & spine care) available Mon-Sat, 9:00 AM to 1:00 PM. 2. Dr. Priya Patil, Consultant Dentist (specialized in root canals & cosmetic dentistry) available Mon-Sat, 4:00 PM to 8:00 PM. / हमारे पास दो मुख्य विशेषज्ञ हैं: 1. डॉ. अमित शर्मा (PT), सीनियर फिजियोथेरेपिस्ट (स्पोर्ट्स रिहैब और स्पाइन केयर विशेषज्ञ) - सोमवार से शनिवार, सुबह 9:00 बजे से दोपहर 1:00 बजे तक। 2. डॉ. प्रिया पाटिल, कंसलटेंट डेंटिस्ट (रूट कैनाल और कॉस्मेटिक डेंटिस्ट्री) - सोमवार से शनिवार, शाम 4:00 बजे से रात 8:00 बजे तक। / आमच्याकडे दोन मुख्य तज्ज्ञ डॉक्टर आहेत: 1. डॉ. अमित शर्मा (PT), ज्येष्ठ फिजिओथेरपिस्ट - सोमवार ते शनिवार, सकाळी 9:00 ते दुपारी 1:00 वाजेपर्यंत. 2. डॉ. प्रिया पाटील, दंतवैद्यक सल्लागार - सोमवार ते शनिवार, संध्याकाळी 4:00 ते रात्री 8:00 वाजेपर्यंत.",
    category: "Doctors",
    last_updated: "2026-07-01T11:00:00.000Z",
    needs_verification: false,
  },
  {
    id: "4",
    question: "What is the consultation fee? / कंसल्टेशन फीस कितनी है? / तपासणी शुल्क किती आहे?",
    answer: "The consultation fee for the first visit is ₹600. Follow-up visits within 10 days are charged at ₹400. / पहली बार दिखाने (फर्स्ट विजिट) की फीस ₹600 है। 10 दिनों के भीतर दोबारा दिखाने (फॉलो-अप विजिट) पर फीस ₹400 है। / पहिल्या वेळच्या तपासणीचे शुल्क ₹600 आहे. 10 दिवसांच्या आतील पुढील भेटींसाठी (फॉलो-अप) शुल्क ₹400 आहे.",
    category: "Fees",
    last_updated: "2026-05-10T11:00:00.000Z", // > 30 days old
    needs_verification: true,
  },
  {
    id: "5",
    question: "Where is the clinic located? / क्लीनिक का पता और रास्ता क्या है? / क्लीनिक कुठे आहे?",
    answer: "We are located at Shop No. 12, Ground Floor, Sai Plaza, Sector 15, Vashi, Navi Mumbai (opposite Vashi Station). Landmark: Near HDFC Bank. / हमारा पता है: शॉप नंबर 12, ग्राउंड फ्लोर, साईं प्लाजा, सेक्टर 15, वाशी, नवी मुंबई (वाशी स्टेशन के सामने)। लैंडमार्क: एचडीएफसी बैंक के पास। / आमचा पत्ता: शॉप नं. 12, ग्राउंड फ्लोर, साई प्लाझा, सेक्टर 15, वाशी, नवी मुंबई (वाशी स्टेशनच्या समोर). लँडमार्क: एचडीएफसी बँकेच्या जवळ.",
    category: "Location",
    last_updated: "2026-07-02T12:00:00.000Z",
    needs_verification: false,
  },
  {
    id: "6",
    question: "Do you accept walk-ins, and what is your cancellation policy? / क्या बिना अपॉइंटमेंट के आ सकते हैं, और कैंसलेशन पॉलिसी क्या है? / बुकिंग आणि कॅन्सलेशन पॉलिसी काय आहे?",
    answer: "We are appointment-only to minimize wait times. Please book at least 2 hours in advance. For cancellations, please inform us at least 4 hours before your slot to avoid a late fee of ₹200. / हम केवल अपॉइंटमेंट के आधार पर ही मरीजों को देखते हैं ताकि आपका समय बच सके। कृपया कम से कम 2 घंटे पहले अपॉइंटमेंट बुक करें। अपॉइंटमेंट रद्द करने के लिए, स्लॉट से कम से कम 4 घंटे पहले सूचित करें, अन्यथा ₹200 लेट फीस ली जाएगी। / वेटिंग टाईम टाळण्यासाठी आम्ही फक्त अपॉइंटमेंटनुसारच रुग्णांना तपासतो. कृपया किमान 2 तास आधी अपॉइंटमेंट बुक करा. अपॉइंटमेंट रद्द करायची असल्यास, दिलेल्या वेळेच्या किमान 4 तास आधी कळवावे, अन्यथा ₹200 लेट फी लागू होईल.",
    category: "Policy",
    last_updated: "2026-07-02T13:00:00.000Z",
    needs_verification: false,
  },
  {
    id: "7",
    question: "What should I bring for my first appointment? / पहली विजिट पर मुझे क्या लाना चाहिए? / पहिल्या भेटीत काय सोबत आणावे?",
    answer: "For your first visit, please bring a doctor's referral letter (if any), prior medical/X-ray/MRI reports, and a valid ID proof. Wearing comfortable clothing is recommended for physiotherapy sessions. / पहली विजिट के लिए, कृपया डॉक्टर का रेफरल लेटर (यदि हो), पुरानी मेडिकल रिपोर्ट/एक्स-रे/एमआरआई रिपोर्ट्स और एक आईडी प्रूफ साथ लाएं। फिजियोथेरेपी सेशन के लिए आरामदायक कपड़े पहन कर आने की सलाह दी जाती है। / पहिल्या भेटीच्या वेळी, कृपया डॉक्टरांचे रेफरल पत्र (असल्यास), पूर्वीचे वैद्यकीय/एक्स-रे/एमआरआय रिपोर्ट्स आणि एक वैध ओळखपत्र सोबत आणावे. फिजिओथेरपी सेशनसाठी आरामदायक कपडे घालण्याचा सल्ला दिला जातो.",
    category: "General",
    last_updated: "2026-07-03T09:00:00.000Z",
    needs_verification: false,
  },
  {
    id: "8",
    question: "What conditions do you treat? / आप किन बीमारियों या समस्याओं का इलाज करते हैं? / तुम्ही कोणत्या आजारांवर उपचार करता?",
    answer: "We treat back pain, neck pain, frozen shoulder, sports injuries (like ACL tears, sprains), knee arthritis, sciatica, and post-surgery orthopedic rehabilitation. / हम पीठ दर्द (back pain), गर्दन का दर्द (neck pain), फ्रोजन शोल्डर, स्पोर्ट्स इंजरी (जैसे ACL टीयर, मोच), घुटने का गठिया (knee arthritis), साइटिका (sciatica), और सर्जरी के बाद ऑर्थोपेडिक पुनर्वास (post-surgery rehabilitation) का इलाज करते हैं। / आम्ही पाठीचे दुखणे (back pain), मानदुखी (neck pain), फ्रोजन शोल्डर, स्पोर्ट्स इंजरी (जसे की ACL टियर, मुका मार), गुडघेदुखी (knee arthritis), सायटिका (sciatica) आणि शस्त्रक्रियेनंतरच्या ऑर्थोपेडिक रिहॅबिलिटेशनवर उपचार करतो.",
    category: "Services",
    last_updated: "2026-07-03T10:00:00.000Z",
    needs_verification: false,
  },
];

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  Hours: "default",
  Booking: "secondary",
  Services: "outline",
  Policy: "secondary",
  General: "outline",
  Doctors: "default",
  Fees: "secondary",
  Location: "outline",
};

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "" });

  const supabase = createClient();

  useEffect(() => {
    async function loadFaqs() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setFaqs(initialFaqs);
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:8000/api/faqs", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setFaqs(data.map((f: any) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category || "General",
            last_updated: f.last_updated,
            needs_verification: f.needs_verification,
          })));
        } else {
          setFaqs(initialFaqs);
        }
      } catch (err) {
        console.error("Failed to fetch FAQs, using fallback mock data", err);
        setFaqs(initialFaqs);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, [supabase]);

  const handleAdd = async () => {
    if (!form.question || !form.answer) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token) {
        const res = await fetch("http://localhost:8000/api/faqs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: form.question,
            answer: form.answer,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setFaqs([...faqs, {
            id: created.id,
            question: created.question,
            answer: created.answer,
            category: form.category || "General",
            last_updated: created.last_updated,
            needs_verification: created.needs_verification,
          }]);
          setForm({ question: "", answer: "", category: "" });
          setIsAddOpen(false);
          return;
        }
      }
    } catch (err) {
      console.error("Backend FAQ addition failed, falling back to local simulation", err);
    }

    // Local fallback
    const newFaq: FAQ = {
      id: Date.now().toString(),
      question: form.question,
      answer: form.answer,
      category: form.category || "General",
      last_updated: new Date().toISOString(),
      needs_verification: false,
    };
    setFaqs([...faqs, newFaq]);
    setForm({ question: "", answer: "", category: "" });
    setIsAddOpen(false);
  };

  const handleEdit = async () => {
    if (!editingFaq || !form.question || !form.answer) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Real UUID has length > 10
      if (token && editingFaq.id.length > 10) {
        const res = await fetch(`http://localhost:8000/api/faqs/${editingFaq.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: form.question,
            answer: form.answer,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setFaqs(
            faqs.map((f) =>
              f.id === editingFaq.id
                ? {
                    ...f,
                    question: updated.question,
                    answer: updated.answer,
                    category: form.category,
                    last_updated: updated.last_updated,
                    needs_verification: updated.needs_verification,
                  }
                : f
            )
          );
          setEditingFaq(null);
          setForm({ question: "", answer: "", category: "" });
          return;
        }
      }
    } catch (err) {
      console.error("Backend FAQ edit failed, falling back to local simulation", err);
    }

    // Local fallback
    setFaqs(
      faqs.map((f) =>
        f.id === editingFaq.id
          ? {
              ...f,
              question: form.question,
              answer: form.answer,
              category: form.category,
              last_updated: new Date().toISOString(),
              needs_verification: false,
            }
          : f
      )
    );
    setEditingFaq(null);
    setForm({ question: "", answer: "", category: "" });
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token && id.length > 10) {
        const res = await fetch(`http://localhost:8000/api/faqs/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          setFaqs(faqs.filter((f) => f.id !== id));
          return;
        }
      }
    } catch (err) {
      console.error("Backend FAQ deletion failed, falling back to local simulation", err);
    }

    setFaqs(faqs.filter((f) => f.id !== id));
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category });
  };

  const needsAttentionList = faqs.filter((f) => f.needs_verification);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center font-sans">
        <Loader2 className="mr-2 size-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading Knowledge Base...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Needs Attention Header Section */}
      {needsAttentionList.length > 0 && (
        <Card className="rounded-xl border border-destructive/20 bg-destructive/5 shadow-2xs">
          <CardHeader>
            <CardTitle className="font-heading text-2xl font-semibold text-destructive">
              Needs Attention
            </CardTitle>
            <CardDescription className="font-sans text-xs">
              The following FAQs contain stale values (older than 30 days) and have been flagged for verification.
              Please review, update, or verify and save them to clear these warning badges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {needsAttentionList.map((faq) => (
                <div
                  key={`attention-${faq.id}`}
                  className="flex flex-col justify-between gap-4 p-4 rounded-xl border border-destructive/25 bg-card shadow-xs"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-sans font-semibold text-sm line-clamp-2 text-foreground">
                        {faq.question}
                      </span>
                      <Badge variant="destructive" className="font-sans text-[9px] uppercase tracking-wider h-5 rounded-full shrink-0">
                        Stale Info
                      </Badge>
                    </div>
                    <p className="font-sans text-xs text-muted-foreground line-clamp-3">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5 font-sans text-[11px] text-muted-foreground">
                    <span>
                      Stale since: {faq.last_updated ? new Date(faq.last_updated).toLocaleDateString() : "Never"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(faq)}
                      className="rounded-full h-7 text-xs font-sans px-3"
                    >
                      Verify / Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main FAQ list Card */}
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-sans text-lg font-bold">Knowledge Base</CardTitle>
            <CardDescription className="font-sans text-xs">
              Manage FAQs that your AI voice assistant uses to answer callers
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans font-semibold shadow-xs">
                <Plus className="mr-1.5 size-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-xl border border-border">
              <DialogHeader>
                <DialogTitle className="font-sans text-base font-bold">Add FAQ</DialogTitle>
                <DialogDescription className="font-sans text-xs">
                  Add a new question and answer pair to your knowledge base.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-question" className="font-sans text-xs font-semibold">Question</Label>
                  <Input
                    id="add-question"
                    placeholder="What is your question?"
                    value={form.question}
                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                    className="font-sans text-sm rounded-md"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-answer" className="font-sans text-xs font-semibold">Answer</Label>
                  <Textarea
                    id="add-answer"
                    placeholder="Provide a clear, concise answer..."
                    rows={4}
                    value={form.answer}
                    onChange={(e) => setForm({ ...form, answer: e.target.value })}
                    className="font-sans text-sm rounded-md"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-category" className="font-sans text-xs font-semibold">Category</Label>
                  <Input
                    id="add-category"
                    placeholder="e.g. Booking, Services, Policy"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="font-sans text-sm rounded-md"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-full font-sans text-xs">
                  Cancel
                </Button>
                <Button onClick={handleAdd} className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans text-xs font-semibold">
                  Add FAQ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sans text-xs font-semibold">Question</TableHead>
                <TableHead className="font-sans text-xs font-semibold">Answer</TableHead>
                <TableHead className="font-sans text-xs font-semibold">Category</TableHead>
                <TableHead className="text-right font-sans text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <span className="truncate block font-sans text-sm text-foreground">{faq.question}</span>
                      {faq.needs_verification && (
                        <div className="flex items-center gap-1.5 text-destructive">
                          <AlertCircle className="size-3 shrink-0" />
                          <span className="font-sans text-[10px] font-semibold uppercase tracking-wider">
                            Needs Verification
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[280px]">
                    <span className="line-clamp-2 font-sans text-xs leading-relaxed">{faq.answer}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoryColors[faq.category] ?? "outline"} className="font-sans text-[10px] rounded-full px-2 py-0.5">
                      {faq.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Edit Dialog */}
                      <Dialog
                        open={editingFaq?.id === faq.id}
                        onOpenChange={(open) => !open && setEditingFaq(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full"
                            onClick={() => openEdit(faq)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] rounded-xl border border-border">
                          <DialogHeader>
                            <DialogTitle className="font-sans text-base font-bold">Edit FAQ</DialogTitle>
                            <DialogDescription className="font-sans text-xs">
                              Update the question and answer. Resets needs-verification flag.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="edit-question" className="font-sans text-xs font-semibold">Question</Label>
                              <Input
                                id="edit-question"
                                value={form.question}
                                onChange={(e) =>
                                  setForm({ ...form, question: e.target.value })
                                }
                                className="font-sans text-sm rounded-md"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="edit-answer" className="font-sans text-xs font-semibold">Answer</Label>
                              <Textarea
                                id="edit-answer"
                                rows={4}
                                value={form.answer}
                                onChange={(e) =>
                                  setForm({ ...form, answer: e.target.value })
                                }
                                className="font-sans text-sm rounded-md"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="edit-category" className="font-sans text-xs font-semibold">Category</Label>
                              <Input
                                id="edit-category"
                                value={form.category}
                                onChange={(e) =>
                                  setForm({ ...form, category: e.target.value })
                                }
                                className="font-sans text-sm rounded-md"
                              />
                            </div>
                          </div>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setEditingFaq(null)} className="rounded-full font-sans text-xs">
                              Cancel
                            </Button>
                            <Button onClick={handleEdit} className="rounded-full bg-[#f5a623] hover:bg-[#e09510] text-black font-sans text-xs font-semibold">
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete AlertDialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive rounded-full"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-xl border border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-sans text-base font-bold">Delete FAQ?</AlertDialogTitle>
                            <AlertDialogDescription className="font-sans text-xs">
                              This will permanently remove this FAQ from your knowledge base.
                              Your AI assistant will no longer be able to answer this question.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel className="rounded-full font-sans text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(faq.id)}
                              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans text-xs"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
