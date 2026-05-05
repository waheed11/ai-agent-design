import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function PromptGenerator() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [examples, setExamples] = useState("");
  const [chainOfThought, setChainOfThought] = useState(false);
  const [tone, setTone] = useState("professional");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleGenerate = async () => {
    if (!role.trim() || !goal.trim()) {
      toast({ title: isAr ? "الدور والهدف مطلوبان" : "Role and Goal are required", variant: "destructive" });
      return;
    }
    setOutput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/prompt-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, goal, context, constraints, outputFormat, examples, chainOfThought, tone, language }),
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const p = JSON.parse(data);
            if (p.type === "delta") setOutput((prev) => prev + p.content);
            if (p.type === "done") setIsStreaming(false);
            if (p.type === "error") throw new Error(p.error);
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      toast({ title: isAr ? "فشل التوليد" : "Generation failed", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast({ title: isAr ? "تم النسخ!" : "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const toneOptions = [
    { value: "professional", labelAr: "احترافي", labelEn: "Professional" },
    { value: "friendly", labelAr: "ودود", labelEn: "Friendly" },
    { value: "concise", labelAr: "موجز", labelEn: "Concise" },
    { value: "detailed", labelAr: "مفصّل", labelEn: "Detailed" },
    { value: "technical", labelAr: "تقني", labelEn: "Technical" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isAr ? "مولّد المطالبات الاحترافية" : "Professional Prompt Generator"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr
            ? "أدخل مواصفات وكيل الذكاء الاصطناعي وسيُولَّد لك مطالبة نظام احترافية مع خطة تنفيذ"
            : "Describe your AI agent and get a production-ready system prompt with an implementation plan"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isAr ? "المعلومات الأساسية" : "Core Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="role">
                  {isAr ? "دور الوكيل *" : "Agent Role *"}
                </Label>
                <Input
                  id="role"
                  data-testid="input-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder={isAr ? "مثال: مساعد تحليل بيانات، وكيل دعم عملاء..." : "e.g., Data analysis assistant, Customer support agent..."}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal">
                  {isAr ? "الهدف الرئيسي *" : "Primary Goal *"}
                </Label>
                <Textarea
                  id="goal"
                  data-testid="input-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                  placeholder={isAr ? "ما الذي يجب على الوكيل إنجازه؟" : "What should this agent accomplish?"}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tone">
                  {isAr ? "نبرة الوكيل" : "Agent Tone"}
                </Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone" data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {isAr ? opt.labelAr : opt.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="cot" className="cursor-pointer">
                  {isAr ? "التفكير خطوة بخطوة (Chain of Thought)" : "Chain of Thought Reasoning"}
                </Label>
                <Switch
                  id="cot"
                  checked={chainOfThought}
                  onCheckedChange={setChainOfThought}
                  data-testid="switch-cot"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isAr ? "خيارات متقدمة" : "Advanced Options"}
                </CardTitle>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="context">
                    {isAr ? "السياق والخلفية" : "Context & Background"}
                  </Label>
                  <Textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={2}
                    placeholder={isAr ? "معلومات إضافية عن البيئة أو المستخدمين..." : "Additional info about the environment or users..."}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="constraints">
                    {isAr ? "القيود والمحاذير" : "Constraints & Guardrails"}
                  </Label>
                  <Textarea
                    id="constraints"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    rows={2}
                    placeholder={isAr ? "ما الذي يجب على الوكيل تجنبه؟" : "What should the agent avoid doing?"}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outputFormat">
                    {isAr ? "صيغة الإخراج المطلوبة" : "Desired Output Format"}
                  </Label>
                  <Input
                    id="outputFormat"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    placeholder={isAr ? "مثال: JSON، قائمة نقطية، تقرير منظم..." : "e.g., JSON, bullet list, structured report..."}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="examples">
                    {isAr ? "أمثلة Few-Shot (اختياري)" : "Few-Shot Examples (optional)"}
                  </Label>
                  <Textarea
                    id="examples"
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                    rows={3}
                    placeholder={isAr ? "مثال على مدخلات ومخرجات للوكيل..." : "Example input/output pairs for the agent..."}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          <Button
            data-testid="button-generate"
            onClick={handleGenerate}
            disabled={!role.trim() || !goal.trim() || isStreaming}
            className="w-full"
            size="lg"
          >
            {isStreaming ? (
              <><Loader2 className="w-4 h-4 me-2 animate-spin" />{isAr ? "جاري التوليد..." : "Generating..."}</>
            ) : (
              <><Wand2 className="w-4 h-4 me-2" />{isAr ? "ولِّد المطالبة الاحترافية" : "Generate Professional Prompt"}</>
            )}
          </Button>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {isAr ? "النتيجة" : "Output"}
            </h2>
            {output && (
              <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                {copied
                  ? <><Check className="w-3.5 h-3.5 me-1.5 text-green-500" />{isAr ? "تم النسخ" : "Copied"}</>
                  : <><Copy className="w-3.5 h-3.5 me-1.5" />{isAr ? "نسخ" : "Copy"}</>
                }
              </Button>
            )}
          </div>

          <div
            ref={outputRef}
            data-testid="output-area"
            className={cn(
              "flex-1 min-h-[520px] max-h-[600px] overflow-auto rounded-xl border bg-muted/30 p-5 text-sm font-mono leading-relaxed whitespace-pre-wrap",
              !output && "flex items-center justify-center"
            )}
          >
            {!output && !isStreaming && (
              <div className="text-center text-muted-foreground space-y-2">
                <Wand2 className="w-10 h-10 mx-auto opacity-20" />
                <p>{isAr ? "سيظهر الناتج هنا بعد الضغط على توليد" : "Output will appear here after generating"}</p>
              </div>
            )}
            {output && <span>{output}</span>}
            {isStreaming && !output && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? "جاري التوليد..." : "Generating..."}</span>
              </div>
            )}
          </div>

          {output && !isStreaming && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{isAr ? "✓ جاهز للاستخدام" : "✓ Ready to use"}</Badge>
              <Badge variant="outline">{isAr ? "انسخ والصق في نظامك" : "Copy & paste into your system"}</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
