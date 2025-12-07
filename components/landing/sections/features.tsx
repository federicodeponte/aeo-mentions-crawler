// ABOUTME: Features section showcasing AEO Visibility Machine capabilities
// ABOUTME: Grid of feature cards with emojis

const features = [
  {
    emoji: "🎯",
    title: "AEO Keyword Research",
    description: "Generate strategic keywords optimized for answer engines. Each keyword includes AEO type, intent, and citation potential.",
  },
  {
    emoji: "✨",
    title: "AI-Optimized Content",
    description: "Create blogs with 70-85+ AEO scores. Conversational format perfect for ChatGPT and Perplexity visibility.",
  },
  {
    emoji: "🔍",
    title: "Company Context Analysis",
    description: "Deep website analysis extracts your positioning, competitors, and value props automatically.",
  },
  {
    emoji: "🌍",
    title: "28+ Languages",
    description: "Generate keywords and content in multiple languages to reach global audiences via AI search.",
  },
  {
    emoji: "📊",
    title: "AEO Health Check",
    description: "30-point website audit for AEO readiness. Get actionable insights to improve AI crawler visibility.",
  },
  {
    emoji: "🚀",
    title: "Batch Processing",
    description: "Generate up to 50 keywords or blogs at once with intelligent cross-linking and entity optimization.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Everything you need for AEO success 🛠️
          </h2>
          <p className="mb-16 text-lg text-muted-foreground">
            Comprehensive tools to dominate AI search engines.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-green-500/30"
            >
              <div className="mb-4 text-4xl">{feature.emoji}</div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
