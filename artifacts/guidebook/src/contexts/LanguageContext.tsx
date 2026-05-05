import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations, vars?: Record<string, string | number>) => string;
}

const translations = {
  // ── Navigation ────────────────────────────────────────────────────────────────
  "nav.dashboard": "لوحة القيادة",
  "nav.dashboard.en": "Dashboard",

  "nav.knowledge": "قاعدة المعرفة",
  "nav.knowledge.en": "Knowledge Base",

  "nav.chat": "محادثات الذكاء الاصطناعي",
  "nav.chat.en": "AI Chats",

  "nav.plans": "خطط المشاريع",
  "nav.plans.en": "Project Plans",

  "nav.evaluations": "تقييمات الأدوات",
  "nav.evaluations.en": "Tool Evaluations",

  "nav.prompt_generator": "مولّد المطالبات",
  "nav.prompt_generator.en": "Prompt Generator",

  "nav.project_analysis": "تحليل المشاريع",
  "nav.project_analysis.en": "Project Analysis",

  "nav.memory": "الذاكرة والتعلم",
  "nav.memory.en": "Memory & Learning",

  "nav.settings": "إعدادات النظام",
  "nav.settings.en": "System Settings",

  "nav.section_tools": "أدوات التصميم",
  "nav.section_tools.en": "Design Tools",

  "nav.section_layers": "طبقات الوكيل",
  "nav.section_layers.en": "Agent Layers",

  "nav.architecture": "معمارية النظام",
  "nav.architecture.en": "System Architecture",

  "nav.skills": "المهارات",
  "nav.skills.en": "Skills",

  "nav.hooks": "الخطافات",
  "nav.hooks.en": "Hooks",

  "nav.subagents": "الوكلاء الفرعيون",
  "nav.subagents.en": "Subagents",

  "nav.plugins": "الإضافات",
  "nav.plugins.en": "Plugins",

  "nav.mcp_servers": "خوادم MCP",
  "nav.mcp_servers.en": "MCP Servers",

  // ── App ───────────────────────────────────────────────────────────────────────
  "app.title": "منصة تصميم الوكلاء",
  "app.title.en": "AI Agent Design",

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  "dashboard.recent_chats": "المحادثات الأخيرة",
  "dashboard.recent_chats.en": "Recent Chats",

  "dashboard.saved_plans": "الخطط المحفوظة",
  "dashboard.saved_plans.en": "Saved Plans",

  "dashboard.knowledge_highlights": "أبرز المعارف",
  "dashboard.knowledge_highlights.en": "Knowledge Highlights",

  // ── Common ────────────────────────────────────────────────────────────────────
  "common.loading": "جاري التحميل...",
  "common.loading.en": "Loading...",

  "common.error": "حدث خطأ",
  "common.error.en": "An error occurred",

  "common.new": "جديد",
  "common.new.en": "New",

  "common.back": "رجوع",
  "common.back.en": "Back",

  "common.save": "حفظ",
  "common.save.en": "Save",

  "common.delete": "حذف",
  "common.delete.en": "Delete",

  "common.cancel": "إلغاء",
  "common.cancel.en": "Cancel",

  "common.edit": "تعديل",
  "common.edit.en": "Edit",

  "common.create": "إنشاء",
  "common.create.en": "Create",

  "common.sources": "مصادر:",
  "common.sources.en": "Sources:",

  "common.copy": "نسخ",
  "common.copy.en": "Copy",

  "common.copied": "تم النسخ!",
  "common.copied.en": "Copied!",

  "common.export": "تصدير",
  "common.export.en": "Export",

  "common.error_create": "خطأ في الإنشاء",
  "common.error_create.en": "Create error",

  "common.error_update": "خطأ في التحديث",
  "common.error_update.en": "Update error",

  "common.error_delete": "خطأ في الحذف",
  "common.error_delete.en": "Delete error",

  "common.error_export": "خطأ في التصدير",
  "common.error_export.en": "Export error",

  "common.error_generate": "خطأ في التوليد",
  "common.error_generate.en": "Generation error",

  "common.error_required": "الاسم والوصف مطلوبان",
  "common.error_required.en": "Name and description required",

  "common.name": "الاسم",
  "common.name.en": "Name",

  "common.description": "الوصف",
  "common.description.en": "Description",

  "common.description_optional": "الوصف (اختياري)",
  "common.description_optional.en": "Description (optional)",

  "common.notes": "ملاحظات",
  "common.notes.en": "Notes",

  "common.notes_optional": "ملاحظات (اختياري)",
  "common.notes_optional.en": "Notes (optional)",

  "common.no_items": "لا يوجد عناصر",
  "common.no_items.en": "No items",

  "common.components": "مكوّن",
  "common.components.en": "components",

  "common.workspace_badge": "مساحة العمل",
  "common.workspace_badge.en": "Workspace",

  "common.no_mcp_servers": "لا توجد خوادم MCP",
  "common.no_mcp_servers.en": "No MCP servers",

  // ── Chat ──────────────────────────────────────────────────────────────────────
  "chat.session_not_found": "الجلسة غير موجودة",
  "chat.session_not_found.en": "Session not found",

  "chat.start_conversation": "ابدأ المحادثة...",
  "chat.start_conversation.en": "Start the conversation...",

  "chat.searching_web": "جارٍ البحث على الويب...",
  "chat.searching_web.en": "Searching the web...",

  "chat.waiting_results": "انتظر نتائج البحث...",
  "chat.waiting_results.en": "Waiting for results...",

  "chat.extract_memory": "استخرج الذاكرة",
  "chat.extract_memory.en": "Extract Memory",

  "chat.memories_extracted": "تم استخراج {{count}} ذاكرة جديدة",
  "chat.memories_extracted.en": "Extracted {{count}} memories",

  "chat.send_error": "خطأ في الإرسال",
  "chat.send_error.en": "Send error",

  "chat.input_placeholder": "اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)",
  "chat.input_placeholder.en": "Type your message... (Enter to send, Shift+Enter for newline)",

  "chat.keyboard_hint": "Enter للإرسال • Shift+Enter لسطر جديد",
  "chat.keyboard_hint.en": "Enter to send • Shift+Enter for newline",

  "chat.auto_search_hint": "يبحث تلقائياً عند الحاجة",
  "chat.auto_search_hint.en": "Auto-searches when needed",

  "chat.search_button_title": "إرسال مع بحث على الويب",
  "chat.search_button_title.en": "Send with web search",

  "chat.language_arabic": "عربي",
  "chat.language_arabic.en": "Arabic",

  "chat.language_english": "إنجليزي",
  "chat.language_english.en": "English",

  // ── Skills ────────────────────────────────────────────────────────────────────
  "skills.title": "المهارات",
  "skills.title.en": "Skills",

  "skills.description": "وحدات المعرفة المُحدَّدة النطاق التي يستخدمها وكيلك — الطبقة الثانية في ADK",
  "skills.description.en": "Scoped knowledge modules your agent uses — ADK Layer 2 (The Knowledge Layer)",

  "skills.new": "مهارة جديدة",
  "skills.new.en": "New Skill",

  "skills.empty": "لا توجد مهارات بعد. أنشئ أول مهارة!",
  "skills.empty.en": "No skills yet. Create your first skill!",

  "skills.name": "اسم المهارة",
  "skills.name.en": "Skill Name",

  "skills.category": "الفئة",
  "skills.category.en": "Category",

  "skills.trigger_keywords": "كلمات التفعيل (مفصولة بفاصلة)",
  "skills.trigger_keywords.en": "Trigger Keywords (comma-separated)",

  "skills.content": "محتوى المهارة",
  "skills.content.en": "Skill Content",

  "skills.generate": "توليد المحتوى بالذكاء الاصطناعي",
  "skills.generate.en": "Generate Content with AI",

  "skills.generating": "جاري التوليد...",
  "skills.generating.en": "Generating...",

  "skills.create_title": "إنشاء مهارة جديدة",
  "skills.create_title.en": "Create New Skill",

  "skills.edit_title": "تعديل المهارة",
  "skills.edit_title.en": "Edit Skill",

  // ── Hooks ─────────────────────────────────────────────────────────────────────
  "hooks.title": "الخطافات",
  "hooks.title.en": "Hooks",

  "hooks.description": "قواعد الحراسة التلقائية المرتبطة بالأحداث — الطبقة الثالثة في ADK",
  "hooks.description.en": "Event-driven guardrail rules — ADK Layer 3 (The Guardrail Layer)",

  "hooks.new": "خطاف جديد",
  "hooks.new.en": "New Hook",

  "hooks.empty": "لا توجد خطافات بعد. أنشئ أول خطاف!",
  "hooks.empty.en": "No hooks yet. Create your first hook!",

  "hooks.event_type": "نوع الحدث",
  "hooks.event_type.en": "Event Type",

  "hooks.matcher": "نمط المطابقة",
  "hooks.matcher.en": "Matcher Pattern",

  "hooks.command": "الأمر / الإجراء",
  "hooks.command.en": "Command / Action",

  "hooks.enabled": "مُفعَّل",
  "hooks.enabled.en": "Enabled",

  "hooks.disabled": "معطَّل",
  "hooks.disabled.en": "Disabled",

  "hooks.create_title": "إنشاء خطاف جديد",
  "hooks.create_title.en": "Create New Hook",

  "hooks.edit_title": "تعديل الخطاف",
  "hooks.edit_title.en": "Edit Hook",

  // ── Subagents ─────────────────────────────────────────────────────────────────
  "subagents.title": "الوكلاء الفرعيون",
  "subagents.title.en": "Subagents",

  "subagents.description": "وحدات التفويض المتخصصة — الطبقة الرابعة في ADK",
  "subagents.description.en": "Specialized delegation units — ADK Layer 4 (The Delegation Layer)",

  "subagents.new": "وكيل فرعي جديد",
  "subagents.new.en": "New Subagent",

  "subagents.empty": "لا يوجد وكلاء فرعيون بعد. أنشئ أول وكيل!",
  "subagents.empty.en": "No subagents yet. Create your first subagent!",

  "subagents.role": "الدور",
  "subagents.role.en": "Role",

  "subagents.model": "النموذج المفضل",
  "subagents.model.en": "Preferred Model",

  "subagents.tools": "الأدوات (مفصولة بفاصلة)",
  "subagents.tools.en": "Tools (comma-separated)",

  "subagents.permissions": "الصلاحيات",
  "subagents.permissions.en": "Permissions",

  "subagents.notes": "ملاحظات",
  "subagents.notes.en": "Notes",

  "subagents.create_title": "إنشاء وكيل فرعي جديد",
  "subagents.create_title.en": "Create New Subagent",

  "subagents.edit_title": "تعديل الوكيل الفرعي",
  "subagents.edit_title.en": "Edit Subagent",

  // ── Plugins ───────────────────────────────────────────────────────────────────
  "plugins.title": "الإضافات",
  "plugins.title.en": "Plugins",

  "plugins.description": "حزم قابلة للتوزيع تجمع مكونات الوكيل — الطبقة الخامسة في ADK",
  "plugins.description.en": "Distributable packages bundling agent components — ADK Layer 5 (The Distribution Layer)",

  "plugins.new": "إضافة جديدة",
  "plugins.new.en": "New Plugin",

  "plugins.empty": "لا توجد إضافات بعد. أنشئ أول إضافة!",
  "plugins.empty.en": "No plugins yet. Create your first plugin!",

  "plugins.version": "الإصدار",
  "plugins.version.en": "Version",

  "plugins.install_command": "أمر التثبيت",
  "plugins.install_command.en": "Install Command",

  "plugins.components": "المكونات المضمَّنة",
  "plugins.components.en": "Included Components",

  "plugins.create_title": "إنشاء إضافة جديدة",
  "plugins.create_title.en": "Create New Plugin",

  "plugins.edit_title": "تعديل الإضافة",
  "plugins.edit_title.en": "Edit Plugin",

  // ── MCP Servers ───────────────────────────────────────────────────────────────
  "mcp.title": "خوادم MCP",
  "mcp.title.en": "MCP Servers",

  "mcp.description": "تكاملات الأدوات الخارجية عبر بروتوكول سياق النموذج",
  "mcp.description.en": "External tool integrations via Model Context Protocol",

  "mcp.new": "خادم MCP جديد",
  "mcp.new.en": "New MCP Server",

  "mcp.empty": "لا توجد خوادم MCP بعد. أضف أول خادم!",
  "mcp.empty.en": "No MCP servers yet. Add your first server!",

  "mcp.server_type": "نوع الخادم",
  "mcp.server_type.en": "Server Type",

  "mcp.endpoint": "نقطة الوصول / الأمر",
  "mcp.endpoint.en": "Endpoint / Command",

  "mcp.capabilities": "القدرات",
  "mcp.capabilities.en": "Capabilities",

  "mcp.status": "الحالة",
  "mcp.status.en": "Status",

  "mcp.notes": "ملاحظات",
  "mcp.notes.en": "Notes",

  "mcp.create_title": "إضافة خادم MCP جديد",
  "mcp.create_title.en": "Add New MCP Server",

  "mcp.edit_title": "تعديل خادم MCP",
  "mcp.edit_title.en": "Edit MCP Server",

  // ── Architecture ──────────────────────────────────────────────────────────────
  "arch.title": "معمارية النظام",
  "arch.title.en": "System Architecture",

  "arch.description": "صمِّم بنية وكيلك عبر نموذج الطبقات الست — ADK",
  "arch.description.en": "Design your agent architecture using the 6-layer ADK model",

  "arch.new": "تصميم جديد",
  "arch.new.en": "New Design",

  "arch.empty": "لا توجد تصاميم بعد. أنشئ أول تصميم معماري!",
  "arch.empty.en": "No designs yet. Create your first architecture design!",

  "arch.layer_system_instructions": "تعليمات النظام — System Instructions",
  "arch.layer_system_instructions.en": "System Instructions Layer",

  "arch.layer_memory": "طبقة الذاكرة — AGENTS.md",
  "arch.layer_memory.en": "Memory Layer — AGENTS.md",

  "arch.layer_skills": "طبقة المعرفة — المهارات",
  "arch.layer_skills.en": "Knowledge Layer — Skills",

  "arch.layer_hooks": "طبقة الحراسة — الخطافات",
  "arch.layer_hooks.en": "Guardrail Layer — Hooks",

  "arch.layer_subagents": "طبقة التفويض — الوكلاء الفرعيون",
  "arch.layer_subagents.en": "Delegation Layer — Subagents",

  "arch.layer_plugins": "طبقة التوزيع — الإضافات",
  "arch.layer_plugins.en": "Distribution Layer — Plugins",

  "arch.mcp_panel": "خوادم MCP",
  "arch.mcp_panel.en": "MCP Servers",

  "arch.export": "تصدير كملف Markdown",
  "arch.export.en": "Export as Markdown",

  "arch.adk_ref_title": "مرجع نموذج ADK — الطبقات الست",
  "arch.adk_ref_title.en": "ADK Reference — 6-Layer Model",

  "arch.adk_ref_hint": "اختر تصميماً معمارياً لتعيين مكوّنات كل طبقة. يمكنك تصدير التصميم كملف AGENTS.md جاهز للاستخدام.",
  "arch.adk_ref_hint.en": "Select an architecture design to assign components to each layer. You can export the design as an AGENTS.md file.",

  "arch.show_on_canvas": "عرض على اللوحة",
  "arch.show_on_canvas.en": "Show on Canvas",

  "arch.system_instructions_placeholder": "أدخل تعليمات النظام هنا... (التعليمات الأساسية الموجَّهة للنموذج في كل طلب)",
  "arch.system_instructions_placeholder.en": "Enter system instructions here... (Core instructions sent to the model on every request)",

  "arch.agents_content_placeholder": "محتوى ملف AGENTS.md — دستور الوكيل وقواعد سلوكه",
  "arch.agents_content_placeholder.en": "AGENTS.md content — agent constitution and behavioral rules",

  "canvas.title": "لوحة المخططات",
  "canvas.title.en": "Architecture Canvas",

  "canvas.description": "قارن تصاميمك المعمارية جنبًا إلى جنب في لوحة مرئية واحدة",
  "canvas.description.en": "Compare your architecture designs side-by-side in a visual canvas board",

  "canvas.empty": "لا توجد مخططات على اللوحة بعد",
  "canvas.empty.en": "No diagrams on the canvas yet",

  "canvas.empty_hint": "افتح تصميمًا معماريًا ثم اضغط «عرض على اللوحة» لإضافته هنا",
  "canvas.empty_hint.en": "Open an architecture design and click «Show on Canvas» to add it here",

  "canvas.go_to_arch": "إلى معمارية النظام",
  "canvas.go_to_arch.en": "Go to Architecture",

  "canvas.clear_all": "مسح الكل",
  "canvas.clear_all.en": "Clear All",

  "canvas.remove_shape": "إزالة",
  "canvas.remove_shape.en": "Remove",

  "nav.canvas": "لوحة المخططات",
  "nav.canvas.en": "Architecture Canvas",

  "arch.create_title": "إنشاء تصميم معماري جديد",
  "arch.create_title.en": "Create New Architecture Design",

  "arch.edit_title": "تعديل التصميم المعماري",
  "arch.edit_title.en": "Edit Architecture Design",

  "arch.open": "فتح مساحة العمل",
  "arch.open.en": "Open Workspace",

  "arch.memory_notes": "دستور الوكيل — AGENTS.md",
  "arch.memory_notes.en": "Agent Constitution — AGENTS.md",

  // ── Plans workflow ─────────────────────────────────────────────────────────────
  "plan.status_draft": "مسودة",
  "plan.status_draft.en": "Draft",

  "plan.status_prompt_generated": "قيد المراجعة",
  "plan.status_prompt_generated.en": "Under Review",

  "plan.status_approved": "معتمد",
  "plan.status_approved.en": "Approved",

  "plan.status_arch_generated": "تم توليد المعمارية",
  "plan.status_arch_generated.en": "Architecture Generated",

  "plan.generate_prompt_btn": "توليد بروبت احترافي + خطة تنفيذ",
  "plan.generate_prompt_btn.en": "Generate Professional Prompt + Execution Plan",

  "plan.generating": "جارٍ التوليد...",
  "plan.generating.en": "Generating...",

  "plan.approve_btn": "اعتماد الخطة",
  "plan.approve_btn.en": "Approve Plan",

  "plan.approving": "جارٍ الاعتماد...",
  "plan.approving.en": "Approving...",

  "plan.generate_arch_btn": "توليد المعمارية الكاملة",
  "plan.generate_arch_btn.en": "Generate Full Architecture",

  "plan.generating_arch": "جارٍ توليد المعمارية...",
  "plan.generating_arch.en": "Generating architecture...",

  "plan.view_architecture": "عرض المعمارية",
  "plan.view_architecture.en": "View Architecture",

  "plan.professional_prompt_title": "البروبت الاحترافي المولَّد",
  "plan.professional_prompt_title.en": "Generated Professional Prompt",

  "plan.execution_plan_title": "خطة التنفيذ",
  "plan.execution_plan_title.en": "Execution Plan",

  "plan.tab_chat": "المحادثة",
  "plan.tab_chat.en": "Chat",

  "plan.tab_doc": "إرفاق وثيقة",
  "plan.tab_doc.en": "Attach Document",

  "plan.tab_results": "النتائج",
  "plan.tab_results.en": "Results",

  "plan.initial_prompt_label": "البروبت الأولي:",
  "plan.initial_prompt_label.en": "Initial Prompt:",

  "plan.arch_generated_notice": "تم توليد المعمارية بنجاح من هذه الخطة",
  "plan.arch_generated_notice.en": "Architecture successfully generated from this plan",

  "plan.approve_hint": "بعد الاعتماد يمكنك توليد المعمارية الكاملة تلقائياً",
  "plan.approve_hint.en": "After approval you can auto-generate the full architecture",

  "plan.chat_placeholder": "اطرح سؤالاً أو ناقش جانباً من الخطة...",
  "plan.chat_placeholder.en": "Ask a question or discuss a plan aspect...",

  "plan.chat_empty": "ابدأ النقاش حول الخطة...",
  "plan.chat_empty.en": "Start discussing the plan...",

  "plan.doc_hint": "ارفع وثيقة (PDF، DOCX، TXT) لاستخدامها كسياق في التخطيط مع الذكاء الاصطناعي.",
  "plan.doc_hint.en": "Upload a document (PDF, DOCX, TXT) to use as context in AI planning.",

  "plan.doc_attached": "وثيقة مرفقة بالخطة",
  "plan.doc_attached.en": "Document attached to plan",

  "plan.drop_file": "اضغط لاختيار ملف",
  "plan.drop_file.en": "Click to select a file",

  "plan.uploading": "جاري الرفع...",
  "plan.uploading.en": "Uploading...",

  "plan.copy_prompt": "نسخ البروبت",
  "plan.copy_prompt.en": "Copy Prompt",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar");

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof typeof translations, vars?: Record<string, string | number>): string => {
    let text: string;
    if (language === "en") {
      const enKey = `${key}.en` as keyof typeof translations;
      text = translations[enKey] ?? translations[key];
    } else {
      text = translations[key];
    }
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
