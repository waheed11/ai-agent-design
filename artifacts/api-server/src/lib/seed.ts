import { db, systemInstructionsTable, knowledgeBaseTable, memoryEntriesTable, skillsTable, hooksTable, subagentsTable, pluginsTable, mcpServersTable, agentArchitecturesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { DEFAULT_SYSTEM_INSTRUCTIONS } from "./system-instructions-defaults";

let systemInstructionsSeeded = false;

export async function seedSystemInstructions(): Promise<void> {
  if (systemInstructionsSeeded) return;

  for (const [mode, content] of Object.entries(DEFAULT_SYSTEM_INSTRUCTIONS)) {
    const [existing] = await db
      .select()
      .from(systemInstructionsTable)
      .where(eq(systemInstructionsTable.mode, mode));

    if (!existing) {
      await db.insert(systemInstructionsTable).values({
        mode,
        content,
        defaultContent: content,
        isDefault: true,
      });
    }
  }

  systemInstructionsSeeded = true;
}

export async function seedKnowledgeBase(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(knowledgeBaseTable);
  if (cnt > 0) return;

  const entries = [
    // ── Agent Frameworks ────────────────────────────────────────────────────────
    {
      title: "LangChain - إطار عمل بناء وكلاء الذكاء الاصطناعي",
      category: "أطر عمل الوكلاء",
      subcategory: "Python",
      summary: "مكتبة Python الأكثر شيوعاً لبناء تطبيقات الذكاء الاصطناعي المركبة والوكلاء الذكية",
      content: `# LangChain

LangChain هو إطار عمل مفتوح المصدر لبناء تطبيقات مدعومة بنماذج اللغة الكبيرة (LLMs).

## المكونات الرئيسية

### Chains (السلاسل)
تسمح بربط عدة خطوات معالجة معاً لإنشاء تدفقات عمل معقدة.

### Agents (الوكلاء)
وكلاء يمكنهم اتخاذ قرارات واستخدام أدوات مختلفة لإنجاز المهام.

### Memory (الذاكرة)
أنظمة لحفظ وتحميل سياق المحادثة بين الجلسات.

### Tools (الأدوات)
واجهات للتفاعل مع الأدوات الخارجية: البحث، قواعد البيانات، APIs.

## مثال بسيط

\`\`\`python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(model="gpt-4o-mini")
response = llm.invoke([HumanMessage(content="مرحباً!")])
print(response.content)
\`\`\`

## متى تستخدم LangChain؟
- بناء نظام RAG (Retrieval-Augmented Generation)
- تسلسل عدة نماذج أو خطوات
- بناء وكلاء مع أدوات متعددة
- التطبيقات التي تحتاج إدارة الذاكرة والسياق`,
      tags: ["langchain", "python", "llm", "agents", "rag"],
      status: "active",
      sourceUrl: "https://python.langchain.com",
    },
    {
      title: "LangGraph - بناء وكلاء بالأنظمة الرسومية",
      category: "أطر عمل الوكلاء",
      subcategory: "Python",
      summary: "امتداد لـ LangChain يتيح بناء وكلاء معقدة باستخدام الرسوم البيانية الدورية",
      content: `# LangGraph

LangGraph هو مكتبة لبناء تطبيقات ذات حالة (stateful) ومتعددة الوكلاء باستخدام نماذج اللغة.

## المفاهيم الأساسية

### State (الحالة)
كائن TypedDict يمثل الحالة الحالية للرسم البياني.

### Nodes (العقد)
دوال Python تأخذ الحالة الحالية وترجع التحديثات.

### Edges (الحواف)
تحدد كيفية الانتقال بين العقد، يمكن أن تكون ثابتة أو شرطية.

## مثال

\`\`\`python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    next_step: str

def process(state: AgentState):
    return {"next_step": "done"}

builder = StateGraph(AgentState)
builder.add_node("process", process)
builder.set_entry_point("process")
builder.add_edge("process", END)
graph = builder.compile()
\`\`\`

## متى تستخدم LangGraph؟
- الوكلاء التي تحتاج حلقات تكرار (loops)
- تدفقات العمل متعددة الوكلاء
- الأنظمة التي تحتاج backtracking أو re-planning`,
      tags: ["langgraph", "agents", "stateful", "multi-agent", "graphs"],
      status: "active",
      sourceUrl: "https://langchain-ai.github.io/langgraph/",
    },
    {
      title: "AutoGen - إطار وكلاء متعددين من Microsoft",
      category: "أطر عمل الوكلاء",
      subcategory: "Python",
      summary: "إطار من Microsoft يتيح إنشاء وكلاء متعددين يتواصلون ويتعاونون لحل المهام",
      content: `# AutoGen

AutoGen هو إطار عمل من Microsoft Research لبناء تطبيقات الذكاء الاصطناعي باستخدام وكلاء متعددين.

## المكونات الأساسية

### AssistantAgent
وكيل ذكاء اصطناعي يستطيع كتابة الكود وتوفير التوجيهات.

### UserProxyAgent
وكيل يمثل المستخدم ويمكنه تنفيذ الكود.

## مثال

\`\`\`python
import autogen

config_list = [{"model": "gpt-4", "api_key": "YOUR_KEY"}]

assistant = autogen.AssistantAgent(
    name="المساعد",
    llm_config={"config_list": config_list}
)

user_proxy = autogen.UserProxyAgent(
    name="المستخدم",
    human_input_mode="NEVER",
    code_execution_config={"work_dir": "coding"}
)

user_proxy.initiate_chat(
    assistant,
    message="ابنِ نظام RAG بسيط باستخدام LangChain"
)
\`\`\`

## متى تستخدم AutoGen؟
- المهام التي تتطلب تعاون وكلاء متعددين
- توليد الكود وتنفيذه تلقائياً
- مهام البحث والتحليل المعقدة`,
      tags: ["autogen", "microsoft", "multi-agent", "code-generation", "python"],
      status: "active",
      sourceUrl: "https://microsoft.github.io/autogen/",
    },
    {
      title: "CrewAI - فرق الوكلاء المتخصصة",
      category: "أطر عمل الوكلاء",
      subcategory: "Python",
      summary: "إطار عمل لبناء فرق وكلاء متخصصين يعملون معاً لإنجاز مهام معقدة",
      content: `# CrewAI

CrewAI هو إطار عمل يتيح بناء فرق من الوكلاء الذكيين المتخصصين يتعاونون لإنجاز مهام معقدة.

## المفاهيم الأساسية

### Agents — كل وكيل له دور، هدف، وقصة خلفية محددة.
### Tasks — مهام محددة مع أوصاف وأدوات ومخرجات متوقعة.
### Crew — مجموعة وكلاء يعملون معاً بترتيب محدد.

## مثال

\`\`\`python
from crewai import Agent, Task, Crew

researcher = Agent(
    role='باحث',
    goal='إيجاد أحدث المعلومات حول وكلاء الذكاء الاصطناعي',
    backstory='خبير في البحث التقني'
)

research_task = Task(
    description='ابحث عن أفضل أطر عمل الوكلاء',
    agent=researcher,
    expected_output='قائمة بأفضل 5 أطر عمل'
)

crew = Crew(agents=[researcher], tasks=[research_task])
result = crew.kickoff()
\`\`\`

## متى تستخدم CrewAI؟
- عندما تحتاج تقسيم المهام بين وكلاء متخصصين
- مشاريع البحث والتحليل متعددة المراحل`,
      tags: ["crewai", "multi-agent", "teams", "python", "specialized-agents"],
      status: "active",
      sourceUrl: "https://crewai.com",
    },
    {
      title: "Semantic Kernel - دمج الذكاء الاصطناعي في التطبيقات",
      category: "أطر عمل الوكلاء",
      subcategory: "C# / Python",
      summary: "إطار من Microsoft لدمج نماذج اللغة في تطبيقات المؤسسات عبر مكونات قابلة للتوصيل",
      content: `# Semantic Kernel

Semantic Kernel هو SDK مفتوح المصدر من Microsoft يتيح دمج نماذج الذكاء الاصطناعي في تطبيقات C# وPython وJava.

## المميزات الرئيسية

- **Plugins**: وحدات وظيفية قابلة للتوصيل تضم مهارات مخصصة
- **Planner**: يخطط ويرتب المهام تلقائياً
- **Memory**: إدارة الذاكرة الدلالية مع embeddings

## مثال Python

\`\`\`python
import semantic_kernel as sk
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion

kernel = sk.Kernel()
kernel.add_service(OpenAIChatCompletion(ai_model_id="gpt-4o-mini"))

prompt = kernel.add_function(
    prompt="اشرح مفهوم {{$concept}} بأمثلة عملية",
    function_name="explain",
    plugin_name="education"
)
result = await kernel.invoke(prompt, concept="RAG")
\`\`\`

## متى تستخدم Semantic Kernel؟
- تطبيقات المؤسسات بـ C# أو Java
- الأنظمة التي تتطلب تكاملاً مع خدمات Azure
- عندما تحتاج نظام plugins منظماً ومتوسعاً`,
      tags: ["semantic-kernel", "microsoft", "plugins", "c-sharp", "enterprise"],
      status: "active",
      sourceUrl: "https://github.com/microsoft/semantic-kernel",
    },
    {
      title: "Haystack - بناء أنظمة RAG الإنتاجية",
      category: "أطر عمل الوكلاء",
      subcategory: "Python",
      summary: "إطار متخصص لبناء أنظمة RAG وخطوط معالجة الوثائق في بيئات الإنتاج",
      content: `# Haystack

Haystack هو إطار عمل مفتوح المصدر من deepset لبناء أنظمة البحث والذكاء الاصطناعي التوليدي.

## المكونات الأساسية

- **Pipeline**: تدفق معالجة البيانات
- **DocumentStore**: تخزين الوثائق (Elasticsearch, Chroma, Weaviate)
- **Retriever**: استرجاع الوثائق ذات الصلة
- **Generator**: توليد الإجابات باستخدام LLM

## مثال

\`\`\`python
from haystack import Pipeline
from haystack.components.retrievers import InMemoryBM25Retriever
from haystack.components.generators import OpenAIGenerator

pipeline = Pipeline()
pipeline.add_component("retriever", InMemoryBM25Retriever(document_store=store))
pipeline.add_component("generator", OpenAIGenerator(model="gpt-4o-mini"))
pipeline.connect("retriever", "generator.documents")

result = pipeline.run({"retriever": {"query": "ما هو LangChain؟"}})
\`\`\`

## متى تستخدم Haystack؟
- أنظمة RAG على مستوى الإنتاج
- معالجة كميات كبيرة من الوثائق
- التكامل مع مخازن بيانات متعددة`,
      tags: ["haystack", "rag", "deepset", "document-processing", "production"],
      status: "active",
      sourceUrl: "https://haystack.deepset.ai",
    },
    // ── Graph Databases ─────────────────────────────────────────────────────────
    {
      title: "Neo4j - قاعدة البيانات الرسومية الرائدة",
      category: "قواعد البيانات الرسومية",
      subcategory: "Graph DB",
      summary: "قاعدة بيانات رسومية تستخدم Cypher Query Language، مثالية لتمثيل العلاقات المعقدة",
      content: `# Neo4j

Neo4j هي قاعدة البيانات الرسومية الأكثر استخداماً في العالم.

## مفاهيم أساسية

\`\`\`cypher
// إنشاء عقد وعلاقات
CREATE (p:Person {name: 'أحمد', age: 30})
CREATE (a)-[:KNOWS]->(b)

// استعلام
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.name = 'أحمد'
RETURN friend.name
\`\`\`

## GraphRAG مع Neo4j

\`\`\`python
from langchain_community.graphs import Neo4jGraph

graph = Neo4jGraph(url="bolt://localhost:7687",
                   username="neo4j", password="password")
graph.query("MATCH (n) RETURN count(n) as count")
\`\`\`

## متى تستخدم Neo4j؟
- GraphRAG وقواعد المعرفة للوكلاء
- أنظمة التوصية القائمة على العلاقات
- الشبكات الاجتماعية وتحليل الروابط`,
      tags: ["neo4j", "graph-database", "cypher", "knowledge-graph", "graphrag"],
      status: "active",
      sourceUrl: "https://neo4j.com",
    },
    {
      title: "FalkorDB - قاعدة بيانات رسومية عالية الأداء",
      category: "قواعد البيانات الرسومية",
      subcategory: "Graph DB",
      summary: "قاعدة بيانات رسومية مبنية على Redis تدعم GraphRAG بأداء استثنائي",
      content: `# FalkorDB

FalkorDB هي قاعدة بيانات رسومية مفتوحة المصدر مبنية على Redis، أسرع 6 مرات من Neo4j في بعض العمليات.

## التثبيت

\`\`\`bash
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
\`\`\`

## الاستخدام

\`\`\`python
from falkordb import FalkorDB

db = FalkorDB(host='localhost', port=6379)
g = db.select_graph('ai_knowledge')
g.query("CREATE (:Agent {name: 'GPT-4', type: 'LLM'})")
\`\`\`

## متى تستخدم FalkorDB؟
- GraphRAG عالي الأداء
- تطبيقات تتطلب Redis وقاعدة بيانات رسومية معاً`,
      tags: ["falkordb", "redis", "graph-database", "graphrag", "high-performance"],
      status: "active",
      sourceUrl: "https://www.falkordb.com",
    },
    {
      title: "ArangoDB - قاعدة بيانات متعددة النماذج",
      category: "قواعد البيانات الرسومية",
      subcategory: "Multi-Model DB",
      summary: "قاعدة بيانات تجمع بين النموذج الرسومي، الوثائق، ومفتاح-قيمة في نظام واحد",
      content: `# ArangoDB

ArangoDB هي قاعدة بيانات متعددة النماذج تدعم البيانات الرسومية، الوثائق، ومفتاح-قيمة.

## AQL - ArangoDB Query Language

\`\`\`aql
FOR v, e, p IN 1..3 OUTBOUND 'users/alice' GRAPH 'social'
    FILTER v.active == true
    RETURN v
\`\`\`

## Python

\`\`\`python
from arango import ArangoClient

client = ArangoClient(hosts='http://localhost:8529')
db = client.db('agents_db', username='root', password='')
graph = db.graph('knowledge_graph')
\`\`\`

## متى تستخدم ArangoDB؟
- المشاريع التي تحتاج بيانات رسومية ووثائق معاً
- أنظمة معرفة الوكلاء المعقدة`,
      tags: ["arangodb", "multi-model", "graph-database", "documents", "aql"],
      status: "active",
      sourceUrl: "https://arangodb.com",
    },
    {
      title: "Memgraph - قاعدة بيانات رسومية في الذاكرة",
      category: "قواعد البيانات الرسومية",
      subcategory: "In-Memory Graph DB",
      summary: "قاعدة بيانات رسومية عالية الأداء تعمل في الذاكرة مع دعم Cypher وتحليلات الوقت الفعلي",
      content: `# Memgraph

Memgraph هي قاعدة بيانات رسومية مفتوحة المصدر تعمل في الذاكرة.

## التثبيت

\`\`\`bash
docker run -it -p 7687:7687 memgraph/memgraph
\`\`\`

## Python

\`\`\`python
from gqlalchemy import Memgraph

memgraph = Memgraph("127.0.0.1", 7687)
memgraph.execute("CREATE (a:Agent {name: 'Assistant'})")
results = list(memgraph.execute_and_fetch(
    "MATCH (a:Agent) RETURN a.name as name"
))
\`\`\`

## متى تستخدم Memgraph؟
- تتبع تفاعلات الوكلاء في الوقت الفعلي
- شبكات المعرفة الديناميكية`,
      tags: ["memgraph", "in-memory", "graph-database", "cypher", "real-time"],
      status: "active",
      sourceUrl: "https://memgraph.com",
    },
    {
      title: "TigerGraph - قاعدة بيانات رسومية للتحليلات الموازية",
      category: "قواعد البيانات الرسومية",
      subcategory: "Graph Analytics",
      summary: "قاعدة بيانات رسومية للمؤسسات مصممة للتحليلات الموازية على نطاق واسع",
      content: `# TigerGraph

TigerGraph هي منصة قواعد البيانات الرسومية المصممة للتحليلات الموازية على نطاق المؤسسات.

## المميزات
- **GSQL**: لغة استعلام قوية تشبه SQL
- **Native Parallel Graph (NPG)**: معالجة متوازية أصيلة
- **Graph ML**: تكامل مع PyTorch Geometric و DGL

## GSQL

\`\`\`gsql
CREATE QUERY find_influencers(INT k) FOR GRAPH social {
  SumAccum<INT> @score;
  Start = {Person.*};
  Result = SELECT s FROM Start:s -(FOLLOWS>)- :t
           ACCUM t.@score += 1
           ORDER BY t.@score DESC LIMIT k;
  PRINT Result;
}
\`\`\`

## متى تستخدم TigerGraph؟
- تحليل الشبكات الكبيرة (مليارات العقد)
- الكشف عن الاحتيال في الوقت الفعلي
- تطبيقات Graph ML`,
      tags: ["tigergraph", "graph-analytics", "gsql", "parallel", "enterprise", "graph-ml"],
      status: "active",
      sourceUrl: "https://www.tigergraph.com",
    },
    {
      title: "Kuzu - قاعدة بيانات رسومية مدمجة للذكاء الاصطناعي",
      category: "قواعد البيانات الرسومية",
      subcategory: "Embedded Graph DB",
      summary: "قاعدة بيانات رسومية مدمجة خفيفة الوزن مصممة خصيصاً لتطبيقات الذكاء الاصطناعي وRAG",
      content: `# Kuzu

Kuzu هي قاعدة بيانات رسومية مدمجة مفتوحة المصدر، مصممة لأعمال الذكاء الاصطناعي وتحليل البيانات. مشابهة لـ DuckDB لكن للبيانات الرسومية.

## المميزات
- **No server needed**: تعمل مدمجة داخل تطبيقك
- **Cypher compatible**: تدعم Cypher Query Language
- **LangChain integration**: دعم رسمي من LangChain
- **Fast**: محسنة للاستعلامات التحليلية المعقدة

## Python

\`\`\`python
import kuzu
import shutil

db = kuzu.Database("./kuzu_db")
conn = kuzu.Connection(db)

conn.execute("CREATE NODE TABLE Agent(name STRING, type STRING, PRIMARY KEY (name))")
conn.execute("CREATE (:Agent {name: 'GPT-4', type: 'LLM'})")

result = conn.execute("MATCH (a:Agent) RETURN a.name, a.type")
while result.has_next():
    print(result.get_next())
\`\`\`

## مع LangChain للـ GraphRAG

\`\`\`python
from langchain_community.graphs import KuzuGraph
from langchain.chains import KuzuQAChain

graph = KuzuGraph(db)
chain = KuzuQAChain.from_llm(llm=llm, graph=graph)
chain.run("Who are the AI agents?")
\`\`\`

## متى تستخدم Kuzu؟
- تطبيقات GraphRAG بدون سيرفر
- تضمين قاعدة بيانات رسومية في تطبيق Python
- النماذج الأولية السريعة`,
      tags: ["kuzu", "embedded", "graph-database", "graphrag", "langchain", "no-server"],
      status: "active",
      sourceUrl: "https://kuzudb.com",
    },
    {
      title: "NebulaGraph - قاعدة بيانات رسومية موزعة",
      category: "قواعد البيانات الرسومية",
      subcategory: "Distributed Graph DB",
      summary: "قاعدة بيانات رسومية موزعة مفتوحة المصدر مصممة للمؤسسات مع دعم GraphRAG",
      content: `# NebulaGraph

NebulaGraph هي قاعدة بيانات رسومية موزعة مفتوحة المصدر، مصممة للشبكات الضخمة على مستوى المؤسسات.

## المميزات
- **nGQL**: لغة استعلام خاصة مستوحاة من SQL وOpenCypher
- **Distributed**: مصممة للتوزيع الأفقي
- **GraphRAG**: دعم رسمي للتكامل مع LangChain
- **Studio**: واجهة رسومية لاستكشاف البيانات

## nGQL

\`\`\`ngql
INSERT VERTEX Agent(name, type) VALUES "gpt4":("GPT-4", "LLM");
INSERT EDGE USES() VALUES "agent1" -> "gpt4":();

GO FROM "agent1" OVER USES
  YIELD FETCH PROP ON Agent $$.Agent.name AS agent_name;
\`\`\`

## Python + LangChain

\`\`\`python
from langchain_community.graphs import NebulaGraph

graph = NebulaGraph(
    space="ai_knowledge",
    username="root", password="nebula",
    address="127.0.0.1", port=9669
)
\`\`\`

## متى تستخدم NebulaGraph؟
- شبكات اجتماعية وتوصيات على نطاق واسع
- الكشف عن الاحتيال في الأنظمة الموزعة
- GraphRAG على نطاق المؤسسات`,
      tags: ["nebulagraph", "distributed", "graph-database", "ngql", "graphrag", "enterprise"],
      status: "active",
      sourceUrl: "https://nebula-graph.io",
    },
    // ── Personal Messaging AI Models ─────────────────────────────────────────────
    {
      title: "Hermes / NousResearch - نماذج محادثة متقدمة",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Open Source LLM",
      summary: "سلسلة نماذج مفتوحة المصدر من NousResearch متخصصة في المحادثة والتعليمات المعقدة",
      content: `# Hermes / NousResearch

Hermes هي سلسلة نماذج لغوية مفتوحة المصدر من NousResearch، معروفة بأدائها الممتاز.

## النماذج
- **Hermes-3-Llama-3.1-405B**: الأقوى
- **Hermes-3-Llama-3.1-70B**: توازن ممتاز
- **Hermes-3-Llama-3.1-8B**: خفيف للتطبيقات المحلية

## الاستخدام مع Ollama

\`\`\`bash
ollama pull nous-hermes2
\`\`\`

\`\`\`python
from langchain_community.llms import Ollama

llm = Ollama(model="nous-hermes2")
response = llm.invoke("كيف أبني وكيل ذكاء اصطناعي؟")
\`\`\`

## متى تستخدم Hermes؟
- المساعدون الشخصيون المحليون
- تطبيقات المحادثة التي تتطلب خصوصية`,
      tags: ["hermes", "nousresearch", "open-source", "llm", "local", "function-calling"],
      status: "active",
      sourceUrl: "https://huggingface.co/NousResearch",
    },
    {
      title: "OpenChat - نموذج محادثة مفتوح المصدر",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Open Source LLM",
      summary: "نماذج محادثة مدربة بتقنية C-RLFT لتحسين الاستجابات الطبيعية والمفيدة",
      content: `# OpenChat

OpenChat هي سلسلة نماذج لغوية مفتوحة المصدر تستخدم تقنية C-RLFT المبتكرة.

## النماذج
- **openchat-3.6-8b**: مع Llama-3.1
- **openchat-3.5-0106**: 7B معامل

## الاستخدام مع Ollama
\`\`\`bash
ollama pull openchat
\`\`\`

\`\`\`python
from openai import OpenAI
client = OpenAI(base_url="http://localhost:11434/v1", api_key="none")
response = client.chat.completions.create(
    model="openchat",
    messages=[{"role": "user", "content": "مرحباً!"}]
)
\`\`\`

## متى تستخدم OpenChat؟
- تطبيقات المحادثة المحلية
- بديل خفيف للنماذج التجارية`,
      tags: ["openchat", "open-source", "llm", "c-rlft", "local"],
      status: "active",
      sourceUrl: "https://huggingface.co/openchat",
    },
    {
      title: "Dolphin (Eric Hartford) - نموذج للمساعدة الشخصية",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Open Source LLM",
      summary: "نماذج مُحسَّنة للمساعدة الشخصية والمهام التفاعلية، غير مقيدة بفلاتر صارمة",
      content: `# Dolphin - Eric Hartford

Dolphin هي سلسلة نماذج من Eric Hartford، مبنية على نماذج Mistral وLlama مع تحسينات للمساعدة الشخصية.

## المميزات
- **Uncensored**: أقل قيوداً من النماذج الرسمية
- **Instruction Following**: ممتاز لاتباع التعليمات
- **Coding**: أداء جيد في البرمجة
- **Roleplay**: مثالي للتطبيقات التفاعلية

## النماذج الشائعة
- dolphin-2.9-llama3-8b
- dolphin-mixtral-8x7b
- dolphin3-llama3.2-3b (خفيف جداً)

## الاستخدام

\`\`\`bash
ollama pull dolphin-llama3
\`\`\`

\`\`\`python
from langchain_ollama import OllamaLLM

llm = OllamaLLM(model="dolphin-llama3")
result = llm.invoke("ساعدني في بناء تطبيق Node.js")
\`\`\`

## متى تستخدم Dolphin؟
- المساعدون الشخصيون بدون قيود مفرطة
- تطبيقات الكود والتحليل التقني`,
      tags: ["dolphin", "eric-hartford", "open-source", "llm", "uncensored", "personal-assistant"],
      status: "active",
      sourceUrl: "https://huggingface.co/cognitivecomputations",
    },
    {
      title: "Phi-3 / Phi-4 (Microsoft) - نماذج صغيرة عالية الكفاءة",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Small LLM",
      summary: "نماذج لغوية صغيرة الحجم من Microsoft تتفوق على نماذج أكبر في الاستدلال والبرمجة",
      content: `# Phi-3 / Phi-4 - Microsoft

سلسلة Phi من Microsoft تثبت أن الحجم الصغير لا يعني أداءً ضعيفاً.

## النماذج
- **Phi-3-mini** (3.8B): يتفوق على نماذج 7B في الاستدلال
- **Phi-3-small** (7B): أداء قريب من GPT-3.5
- **Phi-3-medium** (14B): يضاهي نماذج 70B
- **Phi-4** (14B): الأحدث، تفوق ممتاز في الرياضيات والمنطق

## الاستخدام

\`\`\`bash
ollama pull phi3
ollama pull phi4
\`\`\`

\`\`\`python
from langchain_ollama import OllamaLLM

llm = OllamaLLM(model="phi3:mini")
result = llm.invoke("اشرح الفرق بين RAG وFine-tuning")
\`\`\`

## متى تستخدم Phi؟
- الأجهزة ذات الموارد المحدودة (أجهزة edge)
- تطبيقات البرمجة والاستدلال المنطقي
- النشر المحلي السريع`,
      tags: ["phi-3", "phi-4", "microsoft", "small-llm", "efficient", "reasoning"],
      status: "active",
      sourceUrl: "https://azure.microsoft.com/en-us/products/phi",
    },
    {
      title: "Gemma (Google) - نماذج مفتوحة من Google",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Open Source LLM",
      summary: "نماذج لغوية مفتوحة من Google مبنية على نفس بنية Gemini مع ترخيص مرن",
      content: `# Gemma - Google

Gemma هي عائلة نماذج مفتوحة المصدر من Google مبنية على تقنية Gemini.

## النماذج
- **Gemma 2B / 7B**: النسخ الأصلية خفيفة الوزن
- **Gemma 2**: جيل ثانٍ مع أداء محسّن
- **CodeGemma**: متخصص في البرمجة
- **PaliGemma**: متعدد الوسائط (نص + صورة)

## الاستخدام

\`\`\`bash
ollama pull gemma2
\`\`\`

\`\`\`python
from langchain_ollama import ChatOllama

llm = ChatOllama(model="gemma2:9b")
response = llm.invoke("ما هي أفضل ممارسات بناء وكلاء الذكاء الاصطناعي؟")
print(response.content)
\`\`\`

## مع Vertex AI (Google Cloud)

\`\`\`python
from langchain_google_vertexai import ChatVertexAI

llm = ChatVertexAI(model="gemma-2-9b-it")
\`\`\`

## متى تستخدم Gemma؟
- بديل مجاني لـ GPT-4 في التطبيقات المحلية
- التكامل مع خدمات Google Cloud
- النماذج متعددة الوسائط`,
      tags: ["gemma", "google", "open-source", "llm", "multimodal", "codegemma"],
      status: "active",
      sourceUrl: "https://ai.google.dev/gemma",
    },
    // ── Graph Databases (additional) ────────────────────────────────────────────
    {
      title: "Amazon Neptune - قاعدة بيانات رسومية مُدارة على AWS",
      category: "قواعد البيانات الرسومية",
      subcategory: "Cloud Graph DB",
      summary: "خدمة قاعدة بيانات رسومية مُدارة بالكامل من AWS تدعم Gremlin وSPARQL وOpenCypher",
      content: `# Amazon Neptune

Amazon Neptune هي خدمة قاعدة بيانات رسومية مُدارة بالكامل من AWS، مُحسَّنة لتخزين مليارات العلاقات والاستعلام عنها بأقل من ميلي ثانية.

## لغات الاستعلام المدعومة

### Gremlin (Apache TinkerPop)
\`\`\`python
from gremlin_python.driver import client, serializer

c = client.Client(
    'wss://your-neptune-endpoint:8182/gremlin',
    'g',
    message_serializer=serializer.GraphSONSerializersV2d0()
)
result = c.submit("g.V().limit(5).valueMap(true)").all().result()
\`\`\`

### SPARQL (لبيانات RDF)
\`\`\`sparql
SELECT ?agent ?capability
WHERE {
    ?agent rdf:type :AIAgent .
    ?agent :hasCapability ?capability .
}
LIMIT 10
\`\`\`

### OpenCypher
\`\`\`python
import boto3

neptune = boto3.client('neptunedata', endpoint_url='https://your-endpoint:8182')
result = neptune.execute_open_cypher_query(
    openCypherQuery="MATCH (a:Agent)-[:USES]->(m:Model) RETURN a.name, m.name LIMIT 10"
)
\`\`\`

## Neptune Analytics
خدمة جديدة لتحليلات الرسوم البيانية مع دعم Graph RAG الأصيل.

## متى تستخدم Neptune؟
- التطبيقات المنشورة على AWS التي تحتاج قاعدة بيانات رسومية مُدارة
- التوافق مع نظام AWS البيئي (IAM، VPC، CloudWatch)
- GraphRAG عبر Neptune Analytics
- أنظمة SPARQL لبيانات RDF الضخمة`,
      tags: ["neptune", "aws", "cloud", "graph-database", "gremlin", "sparql", "graphrag"],
      status: "active",
      sourceUrl: "https://aws.amazon.com/neptune/",
    },
    // ── Personal Messaging AI (additional) ──────────────────────────────────────
    {
      title: "Open WebUI / LLM Orchestration - واجهة موحدة للنماذج المحلية",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Local AI Interface",
      summary: "واجهة ويب مفتوحة المصدر لإدارة وتشغيل النماذج المحلية مع دعم RAG والوكلاء",
      content: `# Open WebUI - المساعد الشخصي المحلي

Open WebUI (سابقاً Ollama WebUI) هي واجهة مستخدم مفتوحة المصدر لإدارة نماذج LLM المحلية.

## المميزات الرئيسية

- **Multi-model**: دعم Ollama وOpenAI API وأي نموذج متوافق
- **RAG مدمج**: رفع المستندات وإنشاء قاعدة معرفة شخصية
- **Agents**: بناء وكلاء مخصصين بأدوات وذاكرة
- **Voice**: دعم المحادثة الصوتية
- **Pipelines**: إنشاء تدفقات معالجة مخصصة

## التثبيت

\`\`\`bash
docker run -d -p 3000:8080 \\
  -v open-webui:/app/backend/data \\
  --name open-webui \\
  ghcr.io/open-webui/open-webui:main
\`\`\`

## Pipelines API

\`\`\`python
class RAGPipeline:
    def __init__(self):
        self.name = "Custom RAG Pipeline"
    
    async def pipe(self, user_message: str, model_id: str, messages: list, body: dict):
        # Add your KB retrieval logic here
        context = await self.retrieve_context(user_message)
        messages[-1]["content"] = f"Context: {context}\\n\\nQuestion: {user_message}"
        return messages
\`\`\`

## متى تستخدم Open WebUI؟
- المساعد الشخصي المحلي الشامل بدون بيانات ترسل للخارج
- إدارة عدة نماذج محلية من واجهة واحدة
- بناء RAG شخصي على مستنداتك`,
      tags: ["open-webui", "local-ai", "ollama", "personal-assistant", "rag", "pipelines"],
      status: "active",
      sourceUrl: "https://openwebui.com",
    },
    // ── Agent Frameworks (additional) ───────────────────────────────────────────
    {
      title: "LlamaIndex - إطار بناء تطبيقات RAG والبحث الدلالي",
      category: "أطر عمل الوكلاء",
      subcategory: "Python",
      summary: "إطار عمل Python لبناء تطبيقات RAG وفهرسة البيانات واسترجاع السياق للنماذج اللغوية",
      content: `# LlamaIndex (سابقاً GPT Index)

LlamaIndex هو إطار عمل Python متخصص في بناء تطبيقات RAG (Retrieval-Augmented Generation) وفهرسة البيانات والوكلاء المعرفية.

## المكونات الأساسية

### Data Loaders
\`\`\`python
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

# تحميل المستندات
documents = SimpleDirectoryReader("./data").load_data()

# بناء الفهرس
index = VectorStoreIndex.from_documents(documents)
\`\`\`

### Query Engine
\`\`\`python
# استعلام دلالي
query_engine = index.as_query_engine()
response = query_engine.query("ما هي أفضل أطر عمل الوكلاء؟")
print(response)
\`\`\`

### Agents مع أدوات
\`\`\`python
from llama_index.core.agent import ReActAgent
from llama_index.core.tools import QueryEngineTool

tool = QueryEngineTool.from_defaults(
    query_engine=query_engine,
    name="knowledge_base",
    description="للبحث في قاعدة المعرفة"
)

agent = ReActAgent.from_tools([tool], verbose=True)
response = agent.chat("قارن بين LangChain وLlamaIndex")
\`\`\`

## الفهارس المتاحة
- **VectorStoreIndex**: فهرس المتجهات (الافتراضي)
- **KnowledgeGraphIndex**: فهرس رسومي
- **SummaryIndex**: ملخصات متدرجة

## متى تستخدم LlamaIndex؟
- تطبيقات RAG المعقدة مع مصادر بيانات متعددة
- البحث الدلالي في المستندات الضخمة
- بناء وكلاء معرفية متخصصة`,
      tags: ["llamaindex", "rag", "vector-search", "python", "knowledge-graph", "embeddings"],
      status: "active",
      sourceUrl: "https://docs.llamaindex.ai",
    },
    // ── Local Model Runners ──────────────────────────────────────────────────────
    {
      title: "Ollama - تشغيل نماذج الذكاء الاصطناعي محلياً",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Local Model Runner",
      summary: "أداة سطر أوامر لتشغيل نماذج LLM مفتوحة المصدر محلياً بسهولة تامة",
      content: `# Ollama - المحرك المحلي للنماذج

Ollama يجعل تشغيل نماذج اللغة الكبيرة محلياً أمراً سهلاً وعملياً عبر CLI وAPI بسيط.

## التثبيت والاستخدام الأساسي

\`\`\`bash
# تثبيت Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# تنزيل وتشغيل نموذج
ollama run llama3.2
ollama run mistral
ollama run qwen2.5:7b

# عرض النماذج المثبتة
ollama list
\`\`\`

## OpenAI-Compatible API

\`\`\`python
from openai import OpenAI

# استخدام Ollama كـ OpenAI-compatible server
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

response = client.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "شرح مفهوم RAG"}]
)
print(response.choices[0].message.content)
\`\`\`

## مع LangChain
\`\`\`python
from langchain_ollama import ChatOllama

llm = ChatOllama(model="mistral", temperature=0)
response = llm.invoke("ما الفرق بين RAG وFine-tuning؟")
\`\`\`

## الموديل فايل (Modelfile)
\`\`\`
FROM llama3.2
SYSTEM "أنت مساعد ذكاء اصطناعي متخصص في تطوير الوكلاء."
PARAMETER temperature 0.7
\`\`\`

## متى تستخدم Ollama؟
- التطوير المحلي بدون اتصال إنترنت أو تكاليف API
- الحفاظ على خصوصية البيانات
- اختبار نماذج متعددة بسرعة`,
      tags: ["ollama", "local-llm", "llama", "mistral", "cli", "openai-compatible", "privacy"],
      status: "active",
      sourceUrl: "https://ollama.ai",
    },
    {
      title: "Mistral AI - نماذج لغوية أوروبية عالية الأداء",
      category: "نماذج مساعدي المراسلة",
      subcategory: "Commercial + Open Source LLM",
      summary: "شركة فرنسية تطور نماذج LLM متقدمة تجمع بين الأداء العالي والكفاءة مع خيارات مفتوحة المصدر",
      content: `# Mistral AI - نماذج لغوية أوروبية

Mistral AI شركة فرنسية أسسها مهندسون من Google DeepMind وMeta، تطور نماذج LLM تنافس GPT-4 بكفاءة أعلى.

## النماذج الرئيسية

| النموذج | الحجم | الاستخدام |
|--------|-------|-----------|
| Mistral 7B | 7B | محلي، سريع |
| Mixtral 8x7B | 47B (MoE) | أداء عالٍ |
| Mistral Small | - | API سريع |
| Mistral Large | - | مهام معقدة |
| Codestral | - | توليد كود |
| Pixtral | - | متعدد الوسائط |

## استخدام API الرسمي

\`\`\`python
from mistralai import Mistral

client = Mistral(api_key="your-api-key")

response = client.chat.complete(
    model="mistral-large-latest",
    messages=[{"role": "user", "content": "كيف أبني وكيل RAG؟"}]
)
print(response.choices[0].message.content)
\`\`\`

## مع Ollama (مجاناً)
\`\`\`bash
ollama run mistral
ollama run mixtral
\`\`\`

## مع LangChain
\`\`\`python
from langchain_mistralai import ChatMistralAI

llm = ChatMistralAI(model="mistral-large-latest")
response = llm.invoke("اشرح Function Calling في الوكلاء")
\`\`\`

## ميزة Function Calling
\`\`\`python
tools = [{
    "type": "function",
    "function": {
        "name": "search_web",
        "description": "البحث في الإنترنت",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
    }
}]
response = client.chat.complete(model="mistral-large-latest", messages=[...], tools=tools)
\`\`\`

## متى تستخدم Mistral؟
- التطبيقات التي تتطلب نموذجاً أوروبياً (GDPR/بيانات أوروبية)
- التوازن بين الأداء والتكلفة
- مهام توليد الكود مع Codestral`,
      tags: ["mistral", "mixtral", "french-ai", "open-source", "function-calling", "codestral", "moe"],
      status: "active",
      sourceUrl: "https://mistral.ai",
    },
  ];

  for (const entry of entries) {
    await db.insert(knowledgeBaseTable).values({
      ...entry,
      status: entry.status as "active" | "outdated" | "deprecated",
    });
  }
}

export async function seedMemory(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(memoryEntriesTable);
  if (cnt > 0) return;

  await db.insert(memoryEntriesTable).values([
    {
      key: "اللغة المفضلة",
      value: "العربية هي اللغة الأساسية للتواصل",
      confidence: "high",
      source: "system",
      isEditable: true,
    },
    {
      key: "مجال التخصص",
      value: "تطوير وكلاء الذكاء الاصطناعي وأنظمة RAG",
      confidence: "high",
      source: "system",
      isEditable: true,
    },
    {
      key: "أطر العمل المفضلة",
      value: "LangChain وLangGraph للمشاريع المعقدة",
      confidence: "medium",
      source: "system",
      isEditable: true,
    },
  ]);
}

export async function seedSkills(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(skillsTable);
  if (cnt > 0) return;
  await db.insert(skillsTable).values([
    {
      name: "مساعد الكود",
      description: "مهارة متخصصة في مراجعة الكود، اقتراح التحسينات، وشرح الخوارزميات",
      category: "coding",
      triggerKeywords: ["كود", "برمجة", "debug", "refactor", "code", "function"],
      content: `## الوصف\nمساعد ذكي متخصص في مراجعة ومساعدة البرمجة.\n\n## متى تُستخدم\nعند طلب مراجعة كود، شرح خوارزمية، أو اقتراح تحسينات.\n\n## الاستخدام\n- مراجعة الكود وتحديد الأخطاء\n- اقتراح تحسينات الأداء\n- شرح الكود بلغة بسيطة\n\n## أمثلة\n- "راجع هذه الدالة"\n- "كيف أحسّن أداء هذا الكود؟"`,
    },
    {
      name: "باحث ويب",
      description: "مهارة البحث على الإنترنت وتلخيص المعلومات من مصادر متعددة",
      category: "research",
      triggerKeywords: ["ابحث", "معلومات", "research", "search", "find", "latest"],
      content: `## الوصف\nأداة بحث ذكية تجمع المعلومات من مصادر موثوقة.\n\n## متى تُستخدم\nعند الحاجة لمعلومات حديثة أو بحث عن موضوع محدد.\n\n## الاستخدام\n- البحث عن أحدث الأخبار\n- مقارنة تقنيات وأدوات\n- التحقق من الحقائق`,
    },
    {
      name: "محلل البيانات",
      description: "مهارة تحليل البيانات وإنشاء تقارير ورؤى مفيدة",
      category: "analysis",
      triggerKeywords: ["تحليل", "بيانات", "إحصاء", "analyze", "data", "statistics", "insights"],
      content: `## الوصف\nمحلل بيانات متخصص في استخراج الرؤى والأنماط.\n\n## متى تُستخدم\nعند تحليل مجموعات بيانات أو إنشاء تقارير.\n\n## الاستخدام\n- تحليل الجداول والأرقام\n- رسم الاتجاهات والأنماط\n- إنشاء ملخصات تنفيذية`,
    },
  ]);
}

export async function seedHooks(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(hooksTable);
  if (cnt > 0) return;
  await db.insert(hooksTable).values([
    {
      name: "منع الأوامر الخطرة",
      eventType: "PreToolUse",
      matcherPattern: "Bash",
      command: "python /hooks/check_command.py",
      description: "يفحص الأوامر قبل التنفيذ ويمنع الأوامر الخطرة مثل rm -rf",
      enabled: true,
    },
    {
      name: "تسجيل استخدام الأدوات",
      eventType: "PostToolUse",
      matcherPattern: "*",
      command: "python /hooks/log_tool_use.py",
      description: "يسجل كل استخدام للأدوات في ملف السجل للمراجعة والتتبع",
      enabled: true,
    },
    {
      name: "إشعار بدء الجلسة",
      eventType: "SessionStart",
      matcherPattern: "*",
      command: "python /hooks/session_start.py",
      description: "يرسل إشعاراً عند بدء جلسة جديدة ويحمّل السياق المخصص",
      enabled: false,
    },
  ]);
}

export async function seedSubagents(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(subagentsTable);
  if (cnt > 0) return;
  await db.insert(subagentsTable).values([
    {
      name: "مراجع الكود",
      role: "مراجعة الكود، تحديد الأخطاء، واقتراح تحسينات بناءة لضمان جودة الكود",
      modelPreference: "gpt-4o-mini",
      tools: ["read_file", "search_code", "analyze"],
      permissions: "قراءة فقط — لا يُسمح بالتعديل المباشر",
      notes: "يجب أن يقدم تقريراً مهيكلاً يشمل: الأخطاء، التحسينات، ونقاط القوة",
    },
    {
      name: "باحث الويب",
      role: "البحث على الإنترنت عن معلومات محددة وتلخيصها بشكل موضوعي وموثّق",
      modelPreference: "gpt-4o-mini",
      tools: ["web_search", "web_fetch"],
      permissions: "بحث فقط — لا يُسمح بتعديل الملفات",
      notes: "يجب ذكر المصادر دائماً ومراعاة تاريخ المعلومات",
    },
    {
      name: "مصحح الأخطاء",
      role: "تشخيص أخطاء الكود وإيجاد الحلول المناسبة بشكل منهجي",
      modelPreference: "gpt-4o",
      tools: ["read_file", "execute_bash", "search_code"],
      permissions: "قراءة وتنفيذ — لا نشر في الإنتاج",
      notes: "يتبع منهجية: تشخيص → فرضيات → اختبار → حل",
    },
  ]);
}

export async function seedPlugins(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(pluginsTable);
  if (cnt > 0) return;
  await db.insert(pluginsTable).values([
    {
      name: "agent-core-pack",
      description: "حزمة المكونات الأساسية لوكيل تطوير البرمجيات — تشمل مهارات الكود والخطافات الأمنية",
      version: "1.0.0",
      installCommand: "npm install @org/agent-core-pack",
      components: ["skills", "hooks"],
    },
    {
      name: "research-agent-pack",
      description: "حزمة وكيل البحث — تشمل مهارات البحث ووكيل فرعي متخصص",
      version: "0.9.0",
      installCommand: "npm install @org/research-agent-pack",
      components: ["skills", "agents"],
    },
    {
      name: "safety-guardrails",
      description: "مجموعة خطافات الأمان والحراسة لمنع الإجراءات الضارة",
      version: "1.2.0",
      installCommand: "npm install @org/safety-guardrails",
      components: ["hooks"],
    },
  ]);
}

export async function seedMcpServers(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(mcpServersTable);
  if (cnt > 0) return;
  await db.insert(mcpServersTable).values([
    {
      name: "GitHub MCP",
      serverType: "stdio",
      endpoint: "npx @modelcontextprotocol/server-github",
      capabilities: "قراءة المستودعات، البحث في الكود، إدارة Issues و Pull Requests",
      status: "configured",
      notes: "يتطلب GITHUB_TOKEN في متغيرات البيئة",
    },
    {
      name: "Filesystem MCP",
      serverType: "stdio",
      endpoint: "npx @modelcontextprotocol/server-filesystem /path/to/project",
      capabilities: "قراءة وكتابة الملفات، إنشاء المجلدات، البحث في محتوى الملفات",
      status: "configured",
      notes: "حدّد المسار الجذر للمشروع في الأمر أعلاه",
    },
    {
      name: "Brave Search MCP",
      serverType: "stdio",
      endpoint: "npx @modelcontextprotocol/server-brave-search",
      capabilities: "البحث على الإنترنت، الحصول على نتائج بحث موثّقة بالمصادر",
      status: "unconfigured",
      notes: "يتطلب BRAVE_API_KEY — احصل عليه من brave.com/search/api",
    },
  ]);
}

export async function seedAgentArchitectures(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(agentArchitecturesTable);
  if (cnt > 0) return;

  // Fetch seeded IDs to reference them properly
  const [skills, hooks, subagents, plugins, mcpServers] = await Promise.all([
    db.select({ id: skillsTable.id }).from(skillsTable),
    db.select({ id: hooksTable.id }).from(hooksTable),
    db.select({ id: subagentsTable.id }).from(subagentsTable),
    db.select({ id: pluginsTable.id }).from(pluginsTable),
    db.select({ id: mcpServersTable.id }).from(mcpServersTable),
  ]);

  const skillIds = skills.map((r) => r.id);
  const hookIds = hooks.map((r) => r.id);
  const subagentIds = subagents.map((r) => r.id);
  const pluginIds = plugins.map((r) => r.id);
  const mcpServerIds = mcpServers.map((r) => r.id);

  await db.insert(agentArchitecturesTable).values([
    {
      name: "وكيل تطوير البرمجيات",
      description: "وكيل متكامل للمساعدة في تطوير البرمجيات — يشمل مراجعة الكود، البحث، والتصحيح",
      layers: {
        skillIds,
        hookIds: hookIds.slice(0, 2),
        subagentIds: subagentIds.slice(0, 2),
        pluginIds: pluginIds.slice(0, 1),
        mcpServerIds: mcpServerIds.slice(0, 2),
        systemInstructions: "أنت مساعد تطوير برمجيات متخصص في TypeScript وNode.js.\n\nالقيم الأساسية:\n- الكود الواضح أولاً\n- الأمان في كل قرار\n- التوثيق مع كل تغيير",
        agentsContent: "# AGENTS.md\n\n## وكيل تطوير البرمجيات\n\n- **الدور**: مساعد تطوير برمجي\n- **النموذج**: gpt-4o\n- **الأدوات**: قراءة الكود، البحث، التصحيح",
      },
    },
    {
      name: "وكيل البحث والتحليل",
      description: "وكيل متخصص في البحث على الإنترنت وتحليل البيانات وإعداد التقارير",
      layers: {
        skillIds: skillIds.slice(1, 3),
        hookIds: hookIds.slice(1, 2),
        subagentIds: subagentIds.slice(1, 2),
        pluginIds: pluginIds.slice(1, 2),
        mcpServerIds: mcpServerIds.slice(2),
        systemInstructions: "متخصص في البحث وتحليل البيانات.\n\nالمبادئ:\n- الموضوعية في التحليل\n- ذكر المصادر دائماً\n- التحقق من المعلومات قبل تقديمها",
        agentsContent: "# AGENTS.md\n\n## وكيل البحث والتحليل\n\n- **الدور**: باحث ومحلل بيانات\n- **النموذج**: gpt-4o\n- **الأدوات**: البحث على الإنترنت، تحليل البيانات",
      },
    },
    {
      name: "وكيل مراجعة الأمان",
      description: "وكيل متخصص في مراجعة الكود من منظور الأمان والكشف عن الثغرات",
      layers: {
        skillIds: skillIds.slice(0, 1),
        hookIds,
        subagentIds: subagentIds.slice(2),
        pluginIds: pluginIds.slice(2),
        mcpServerIds: mcpServerIds.slice(0, 1),
        systemInstructions: "مراجع أمان صارم.\n\nالقواعد الأساسية:\n- لا تتجاوز حدود الصلاحيات أبداً\n- أبلغ عن الثغرات فور اكتشافها\n- الأمان فوق الأداء دائماً",
        agentsContent: "# AGENTS.md\n\n## وكيل مراجعة الأمان\n\n- **الدور**: مراجع أمان\n- **النموذج**: gpt-4o\n- **الأدوات**: فحص الكود، كشف الثغرات",
      },
    },
  ]);
}
