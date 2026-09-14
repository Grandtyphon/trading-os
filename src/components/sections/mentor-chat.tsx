"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  useTrades,
  useConversations,
  useChatMessages,
  createConversation,
  saveChatMessage,
  deleteConversation,
  useMentorRules,
  saveMentorRule,
  deleteMentorRule,
} from "@/hooks/use-data";
import { useAppStore } from "@/store/use-app-store";
import { buildMentorPayload, computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Num, DateText, SectionHeader } from "@/components/shared/ui-bits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bot, Send, Plus, Trash2, MessageSquare, X, Loader2, WifiOff,
  Sparkles, User, Menu, Settings2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage, MentorRule } from "@/lib/types";
import { uid } from "@/lib/dexie";
import { Markdown } from "@/components/shared/markdown";

const SUGGESTED_QUESTIONS = [
  "چرا اخیراً تو سشن آسیا ضعیف عمل کردم؟",
  "ست‌آپ کدوم برای من بهتر جواب داده؟",
  "الگوی ریونج تو ترید‌هام رو تحلیل کن",
  "چه اشتباهاتی بیشتر تکرار می‌شن؟",
  "یه بررسی کلی روی روانشناسی معاملاتم بده",
  "چطور می‌تونم انتظام‌م رو بیشتر کنم؟",
];

export function MentorChat() {
  const profileId = useAppStore((s) => s.activeProfileId ?? "all");
  const isOnline = useAppStore((s) => s.isOnline);
  const trades = useTrades(profileId);
  const conversations = useConversations(profileId);
  const rules = useMentorRules();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const messages = useChatMessages(activeConvId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partial]);

  // build trade context for the AI (compressed stats)
  const tradeContext = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const stats = computeStats(trades);
    const payload = buildMentorPayload(trades, "همه");
    return JSON.stringify(payload);
  }, [trades]);

  const rulesText = useMemo(() => rules?.map((r) => r.rule) ?? [], [rules]);

  const handleNewChat = async () => {
    const id = await createConversation(profileId, "گفتگو جدید");
    setActiveConvId(id);
    setSidebarOpen(false);
  };

  const handleSend = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || streaming) return;
    if (!isOnline) {
      toast.error("اتصال اینترنت لازمه");
      return;
    }

    // create conversation if none active
    let convId = activeConvId;
    if (!convId) {
      convId = await createConversation(profileId, text.slice(0, 40));
      setActiveConvId(convId);
    }

    // save user message
    const userMsg: ChatMessage = {
      id: uid(),
      conversationId: convId,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    await saveChatMessage(userMsg);
    setInput("");

    // build conversation history for API
    const history = (messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    history.push({ role: "user", content: text });

    // if this is the first message and no title set, update title
    if ((messages?.length ?? 0) === 0) {
      const { renameConversation } = await import("@/hooks/use-data");
      await renameConversation(convId, text.slice(0, 40));
    }

    setStreaming(true);
    setPartial("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          rules: rulesText,
          tradeContext: tradeContext ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = "خطا در ارتباط";
        try { const j = await res.json(); msg = j?.error ?? msg; } catch {}
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("خطا در خواندن پاسخ");

      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setPartial(acc);
      }

      // save assistant message
      const aiMsg: ChatMessage = {
        id: uid(),
        conversationId: convId,
        role: "assistant",
        content: acc.trim() || "پاسخی دریافت نشد",
        createdAt: Date.now(),
        kind: "chat",
      };
      await saveChatMessage(aiMsg);
      setPartial("");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error(e?.message ?? "خطا");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleDeleteConv = async (id: string) => {
    await deleteConversation(id);
    if (activeConvId === id) setActiveConvId(null);
    toast.success("گفتگو حذف شد");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-3">
      {/* Sidebar — conversation list */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-72 transform border-l border-border/40 glass-strong transition-transform lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b p-3">
            <span className="flex items-center gap-2 text-sm font-bold">
              <MessageSquare className="h-4 w-4 text-primary" />
              گفتگوها
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRulesOpen(true)}>
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-2">
            <Button onClick={handleNewChat} className="w-full gap-2" size="sm">
              <Plus className="h-4 w-4" />
              گفتگوی جدید
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin px-2 pb-2">
            {conversations?.map((c) => (
              <div
                key={c.id}
                onClick={() => { setActiveConvId(c.id); setSidebarOpen(false); }}
                className={cn(
                  "group mb-1 flex w-full items-center gap-2 rounded-lg border p-2.5 text-right transition-colors cursor-pointer",
                  activeConvId === c.id ? "border-primary/40 bg-accent/30" : "border-transparent hover:bg-muted/40"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    <DateText ts={c.updatedAt} /> · <Num>{c.messageCount}</Num> پیام
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConv(c.id); }}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                </button>
              </div>
            ))}
            {conversations && conversations.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">هنوز گفتگویی شروع نشده</p>
            )}
          </div>

          {/* Rules count */}
          {rules && rules.length > 0 && (
            <div className="border-t p-2">
              <div
                onClick={() => setRulesOpen(true)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-xs text-muted-foreground hover:bg-muted/40"
              >
                <Zap className="h-3.5 w-3.5 text-primary" />
                <Num>{rules.length}</Num> قانون یادگرفته‌شده
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">منتور هوشمند</p>
              <p className="text-[10px] text-muted-foreground">
                {isOnline ? "آنلاین · آماده گفتگو" : "آفلاین"}
              </p>
            </div>
          </div>
          {trades && trades.length > 0 && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="h-3 w-3" />
              <Num>{trades.length}</Num> ترید در حافظه
            </Badge>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin p-3">
          {(!messages || messages.length === 0) && !streaming && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary neon-glow">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">سلام! من منتورت هستم 👋</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                درباره‌ی هر چیزی مربوط به معامله‌گری می‌تونی با من حرف بزنی. من داده‌های ترید‌هات رو می‌دم و یاد می‌گیرم.
              </p>
              <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="rounded-xl border border-border/60 bg-card/40 p-3 text-right text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages?.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {streaming && partial && (
            <div className="mb-3 flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-card/60 p-3">
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed" dir="rtl">
                  {partial}
                  <span className="animate-pulse">▌</span>
                </pre>
              </div>
            </div>
          )}

          {streaming && !partial && (
            <div className="mb-3 flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tr-sm bg-card/60 p-3">
                <span className="text-sm text-muted-foreground">در حال فکر کردن…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/40 p-3">
          {!isOnline && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-500">
              <WifiOff className="h-3.5 w-3.5" />
              برای گفتگو با منتور نیاز به اینترنت داری
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              dir="rtl"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="پیامت رو بنویس… (Enter برای ارسال)"
              className="max-h-32 resize-none"
              disabled={!isOnline}
            />
            {streaming ? (
              <Button variant="outline" size="icon" onClick={handleStop} className="shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim() || !isOnline}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Rules dialog */}
      <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} rules={rules} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("mb-3 flex gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/15 text-primary"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl p-3",
        isUser
          ? "rounded-tl-sm bg-primary text-primary-foreground"
          : "rounded-tr-sm bg-card/60"
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        ) : (
          <Markdown>{message.content}</Markdown>
        )}
      </div>
    </div>
  );
}

function RulesDialog({
  open,
  onOpenChange,
  rules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rules: MentorRule[] | undefined;
}) {
  const [newRule, setNewRule] = useState("");
  const [category, setCategory] = useState<MentorRule["category"]>("general");

  const handleAdd = async () => {
    if (!newRule.trim()) return;
    await saveMentorRule({
      id: uid(),
      rule: newRule.trim(),
      category,
      createdAt: Date.now(),
      source: "manual",
    });
    setNewRule("");
    toast.success("قانون اضافه شد");
  };

  const catLabel = { risk: "ریسک", setup: "ست‌آپ", psychology: "روانشناسی", session: "سشن", general: "عمومی" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Zap className="h-4 w-4 text-primary" />
            قوانین یادگرفته‌شده
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            این قوانین چیزهایی هستن که منتور باید همیشه در نظر بگیره. می‌تونی دستی اضافه کنی یا منتور خودش از گفتگوها یاد می‌گیره.
          </p>

          {/* Existing rules */}
          <div className="max-h-48 space-y-1.5 overflow-y-auto scroll-thin">
            {rules?.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border p-2">
                <Badge variant="outline" className="text-[9px]">{catLabel[r.category]}</Badge>
                <span className="flex-1 text-xs">{r.rule}</span>
                {r.source === "learned" && <Badge className="bg-primary/15 text-primary text-[9px]">یادگرفته‌شده</Badge>}
                <button onClick={() => deleteMentorRule(r.id)} className="text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {rules && rules.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">هنوز قانونی ثبت نشده</p>
            )}
          </div>

          {/* Add new rule */}
          <div className="space-y-2 border-t pt-3">
            <Input
              dir="rtl"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="مثلاً: هرگز بیشتر از ۲٪ ریسک نکن"
            />
            <div className="flex gap-2">
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(catLabel).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} size="sm">افزودن</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
