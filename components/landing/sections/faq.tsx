// ABOUTME: FAQ section for AEO Visibility Machine landing page
// ABOUTME: Common questions and answers in accordion format

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "What is Answer Engine Optimization (AEO)?",
    answer: "AEO is the process of optimizing your content to appear in AI-powered search engines like ChatGPT, Perplexity, Claude, and Gemini. It focuses on making your brand visible when users ask questions to AI assistants.",
  },
  {
    question: "How does AEO differ from SEO?",
    answer: "While SEO focuses on ranking in traditional search engines like Google, AEO optimizes for AI platforms that provide direct answers. AEO requires conversational, entity-rich content with structured data and citations.",
  },
  {
    question: "Which AI platforms are supported?",
    answer: "We optimize for all major AI search engines including ChatGPT (OpenAI), Perplexity AI, Claude (Anthropic), Gemini (Google), and Mistral. Our keywords and content are tailored for answer engine visibility.",
  },
  {
    question: "How many keywords can I generate?",
    answer: "You can generate up to 50 strategic keywords per batch, optimized specifically for AEO. Each keyword includes AEO scoring, intent classification, and citation potential analysis.",
  },
  {
    question: "What makes content 'AEO-optimized'?",
    answer: "AEO-optimized content is conversational, question-focused, entity-rich, and includes structured data like FAQs. Our blog generator creates articles with AEO scores of 70-85+, perfect for AI visibility.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. All data is stored locally in your browser (localStorage). Your API keys and business context never leave your device. We prioritize your privacy and security.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mb-16 text-lg text-muted-foreground">
            Everything you need to know about AEO Visibility Machine
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left"
              >
                <span className="text-lg font-medium">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all",
                  openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

