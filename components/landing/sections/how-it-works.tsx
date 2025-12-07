// ABOUTME: How It Works section - 3-step process with visual flow
// ABOUTME: Clean cards with emojis and connecting arrows

import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "1",
    emoji: "🎯",
    title: "Enter Company Context",
    description: "Provide your company details and target market. We'll analyze your positioning.",
  },
  {
    number: "2", 
    emoji: "🔍",
    title: "Generate AEO Keywords",
    description: "AI generates strategic keywords optimized for answer engines like ChatGPT and Perplexity.",
  },
  {
    number: "3",
    emoji: "✨",
    title: "Create AI-Optimized Content",
    description: "Generate blog articles that boost your visibility in AI search engines.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">How it works</h2>
          <p className="text-muted-foreground">Three steps to AEO dominance</p>
        </div>

        {/* Steps with flow */}
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Card */}
                <div className="rounded-lg border border-border bg-card p-6 h-full text-center">
                  {/* Emoji */}
                  <div className="text-4xl mb-4">{step.emoji}</div>
                  
                  {/* Step number */}
                  <div className="text-xs font-medium text-green-500 mb-2">Step {step.number}</div>
                  
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow connector (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
