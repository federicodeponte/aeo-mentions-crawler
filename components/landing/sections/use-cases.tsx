// ABOUTME: Use cases section showing real-world AEO applications
// ABOUTME: Examples of what users can do with AEO Visibility Machine

const useCases = [
  {
    title: "B2B SaaS Companies",
    description: "Dominate AI search results for your product category. Get discovered when prospects ask AI about solutions.",
    example: "Optimize for: 'best CRM for small businesses', 'AI-powered analytics tools'",
    emoji: "🎯",
  },
  {
    title: "E-commerce Brands",
    description: "Appear in product recommendations from ChatGPT and Perplexity. Drive qualified traffic from AI searches.",
    example: "Optimize for: 'sustainable fashion brands', 'organic skincare products'",
    emoji: "🛍️",
  },
  {
    title: "Professional Services",
    description: "Be the expert AI assistants recommend. Establish authority in your niche through strategic AEO.",
    example: "Optimize for: 'fractional CFO services', 'cybersecurity consultants'",
    emoji: "💼",
  },
  {
    title: "Content Publishers",
    description: "Maximize content reach across AI platforms. Get cited by answer engines and drive referral traffic.",
    example: "Optimize for: 'renewable energy trends', 'remote work best practices'",
    emoji: "📰",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Who benefits from AEO?
          </h2>
          <p className="mb-16 text-lg text-muted-foreground">
            From B2B to e-commerce, AEO Visibility Machine powers diverse industries
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-lg border border-border bg-card p-6 transition-all hover:border-green-500/30"
            >
              <div className="mb-4 text-3xl">{useCase.emoji}</div>
              <h3 className="mb-2 text-xl font-semibold">{useCase.title}</h3>
              <p className="mb-4 text-muted-foreground">{useCase.description}</p>
              <div className="rounded-lg bg-secondary/50 p-3 font-mono text-sm text-muted-foreground">
                {useCase.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

