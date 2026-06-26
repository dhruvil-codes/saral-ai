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
import { Plus, Pencil, Trash2 } from "lucide-react";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

const initialFaqs: FAQ[] = [
  {
    id: "1",
    question: "What are your working hours?",
    answer: "We are open Monday to Saturday from 9 AM to 8 PM, and Sunday from 10 AM to 6 PM.",
    category: "Hours",
  },
  {
    id: "2",
    question: "How do I book an appointment?",
    answer: "You can book an appointment by calling our AI assistant, visiting our website, or asking during a call. The AI can directly schedule you.",
    category: "Booking",
  },
  {
    id: "3",
    question: "What services do you offer?",
    answer: "We offer haircuts, coloring, highlights, balayage, straightening, perming, and various spa treatments.",
    category: "Services",
  },
  {
    id: "4",
    question: "Do you offer home service?",
    answer: "Yes, we offer home service for select services within a 10 km radius. Additional charges apply.",
    category: "Services",
  },
  {
    id: "5",
    question: "What is your cancellation policy?",
    answer: "You can cancel or reschedule up to 2 hours before your appointment without any charge. Late cancellations may incur a small fee.",
    category: "Policy",
  },
];

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  Hours: "default",
  Booking: "secondary",
  Services: "outline",
  Policy: "secondary",
};

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "" });

  const handleAdd = () => {
    if (!form.question || !form.answer) return;
    const newFaq: FAQ = {
      id: Date.now().toString(),
      question: form.question,
      answer: form.answer,
      category: form.category || "General",
    };
    setFaqs([...faqs, newFaq]);
    setForm({ question: "", answer: "", category: "" });
    setIsAddOpen(false);
  };

  const handleEdit = () => {
    if (!editingFaq || !form.question || !form.answer) return;
    setFaqs(
      faqs.map((f) =>
        f.id === editingFaq.id
          ? { ...f, question: form.question, answer: form.answer, category: form.category }
          : f
      )
    );
    setEditingFaq(null);
    setForm({ question: "", answer: "", category: "" });
  };

  const handleDelete = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category });
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Knowledge Base</CardTitle>
            <CardDescription>
              Manage FAQs that your AI voice assistant uses to answer callers
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add FAQ</DialogTitle>
                <DialogDescription>
                  Add a new question and answer pair to your knowledge base.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-question">Question</Label>
                  <Input
                    id="add-question"
                    placeholder="What is your question?"
                    value={form.question}
                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-answer">Answer</Label>
                  <Textarea
                    id="add-answer"
                    placeholder="Provide a clear, concise answer..."
                    rows={4}
                    value={form.answer}
                    onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-category">Category</Label>
                  <Input
                    id="add-category"
                    placeholder="e.g. Booking, Services, Policy"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add FAQ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqs.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="truncate block">{faq.question}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[280px]">
                    <span className="line-clamp-2">{faq.answer}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoryColors[faq.category] ?? "outline"} className="text-xs">
                      {faq.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit Dialog */}
                      <Dialog
                        open={editingFaq?.id === faq.id}
                        onOpenChange={(open) => !open && setEditingFaq(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(faq)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Edit FAQ</DialogTitle>
                            <DialogDescription>
                              Update the question and answer.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="edit-question">Question</Label>
                              <Input
                                id="edit-question"
                                value={form.question}
                                onChange={(e) =>
                                  setForm({ ...form, question: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="edit-answer">Answer</Label>
                              <Textarea
                                id="edit-answer"
                                rows={4}
                                value={form.answer}
                                onChange={(e) =>
                                  setForm({ ...form, answer: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="edit-category">Category</Label>
                              <Input
                                id="edit-category"
                                value={form.category}
                                onChange={(e) =>
                                  setForm({ ...form, category: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingFaq(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleEdit}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete AlertDialog */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this FAQ from your knowledge base.
                              Your AI assistant will no longer be able to answer this question.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(faq.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
