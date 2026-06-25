"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  BookOpen, 
  Check, 
  HelpCircle,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Q&As
const initialFaqs = [
  { id: 1, question: "What are your opening hours?", answer: "We are open from 9:30 AM to 8:30 PM, Monday through Sunday. Last appointment is taken at 8:00 PM.", category: "Timings" },
  { id: 2, question: "Where is your salon located?", answer: "We are located at Shop No. 12, Block C, Main Market, Sector 62, Noida, Uttar Pradesh (Near HDFC Bank).", category: "Location" },
  { id: 3, question: "Do you provide haircut services for men?", answer: "Yes, we provide styling and haircut services for both men and women. Haircuts start at ₹250 for men and ₹500 for women.", category: "Services" },
  { id: 4, question: "What is the cost of Keratin treatment?", answer: "Keratin treatment starts at ₹3,999 for shoulder-length hair. Price may vary depending on hair length and volume. AI can book a free consultation call for exact pricing.", category: "Pricing" },
  { id: 5, question: "Do you accept digital payments and UPI?", answer: "Yes! We accept all major credit/debit cards, Google Pay, PhonePe, Paytm, and cash.", category: "Billing" },
];

const categories = ["All", "Services", "Pricing", "Timings", "Location", "Billing"];

export default function FaqsPage() {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("Services");
  const [toastMessage, setToastMessage] = useState("");

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newFaq = {
      id: Date.now(),
      question: newQuestion,
      answer: newAnswer,
      category: newCategory,
    };

    setFaqs([newFaq, ...faqs]);
    setNewQuestion("");
    setNewAnswer("");
    setIsModalOpen(false);

    // Show toast
    setToastMessage("FAQ added successfully!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleDeleteFaq = (id: number) => {
    if (confirm("Are you sure you want to delete this FAQ?")) {
      setFaqs(faqs.filter(faq => faq.id !== id));
      setToastMessage("FAQ deleted successfully!");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  // Filter logic
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 font-sans relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--color-text-primary)] text-white text-xs font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            AI Knowledge Base
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Define custom Q&As so the Voice AI agent knows how to answer customer queries.
          </p>
        </div>

        {/* Primary CTA (Pill-shaped, yellow bg, dark text, exactly one per viewport) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] font-bold px-6 py-2.5 rounded-full shadow-[0_2px_8px_rgba(245,166,35,0.25)] transition-all transform hover:-translate-y-0.5 active:scale-98 text-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Q&A</span>
        </button>
      </div>

      {/* Toolbar & Category Filters */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search existing Q&As..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full pl-10 pr-4 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors font-sans"
            />
          </div>

          {/* Category Badges list */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-[var(--color-accent-light)] border-transparent text-[#92400e]"
                    : "bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => (
            <div 
              key={faq.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <span className="inline-flex items-center gap-1 bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <Tag className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
                    {faq.category}
                  </span>
                  
                  {/* Delete Action button */}
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title="Delete Q&A"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-[var(--color-text-primary)] flex items-start gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <span>{faq.question}</span>
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed pl-6">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] p-12 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2">
            <BookOpen className="w-8 h-8 text-[var(--color-text-muted)] animate-pulse" />
            <p className="font-semibold text-sm">No Q&As found.</p>
            <p className="text-xs">Add a custom Q&A to train your AI agent.</p>
          </div>
        )}
      </div>

      {/* ADD FAQ MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity duration-300"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Dialog Card Box (rounded.xl/24px card) */}
          <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-2xl p-6 z-10 mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--color-border)] mb-4">
              <h3 className="text-base font-bold text-[var(--color-text-primary)] font-sans">
                Add Q&A to Knowledge Base
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddFaq} className="space-y-4 text-xs">
              {/* Category Select */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {categories.filter(c => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Question Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Do you have parking space available?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] font-sans"
                />
              </div>

              {/* Answer Textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)] uppercase">AI Response Answer</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Yes, we have free valet parking available for all clients right in front of the salon."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none font-sans"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-semibold rounded-full hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)] font-bold px-5 py-2 rounded-full shadow-sm transition-colors cursor-pointer"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
