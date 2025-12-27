'use client';

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>

      <Header transparent />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 md:pt-36 md:pb-40">
          <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center">

            {/* Pill Badge */}
            <div className="inline-flex items-center rounded-full border border-border bg-card/50 px-3 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm mb-8 fade-in">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
              <span>AI-Powered Discovery</span>
            </div>

            {/* Hero Text */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 fade-in">
              Stop Scrolling.
              <br />
              <span className="text-primary">Start Watching.</span>
            </h1>

            <p className="max-w-xl text-lg sm:text-xl text-muted-foreground text-balance mb-10 fade-in leading-relaxed">
              Get instant, personalized movie picks tailored to your unique taste—across all your streaming platforms.
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3 w-full sm:w-auto fade-in">
              <Button asChild size="lg" className="h-12 sm:h-14 px-8 text-base sm:text-lg rounded-full w-full sm:w-auto">
                <Link href="/onboarding">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Free • No signup required</span>
            </div>

            <div className="mt-6 text-sm fade-in">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-20 flex items-center justify-center gap-8 sm:gap-16 text-center fade-in">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">10K+</div>
                <div className="text-sm text-muted-foreground mt-1">Movies</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">95%</div>
                <div className="text-sm text-muted-foreground mt-1">Match Rate</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">2 min</div>
                <div className="text-sm text-muted-foreground mt-1">Setup</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 sm:py-28 border-t border-border/50">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">How it works</h2>
              <p className="text-muted-foreground">Three simple steps to your next favorite movie</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  step: "01",
                  title: "Share your favorites",
                  description: "Tell us a few movies you love. We'll learn your taste from what resonates with you.",
                  icon: Sparkles,
                },
                {
                  step: "02",
                  title: "AI analyzes your taste",
                  description: "We look at tone, pacing, themes, and style—not just genres.",
                  icon: Zap,
                },
                {
                  step: "03",
                  title: "Get personalized picks",
                  description: "Receive recommendations with clear explanations of why you'll love them.",
                  icon: Search,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="text-center md:text-left">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-6">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-xs font-medium text-primary mb-2">{item.step}</div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 sm:py-28 bg-card/30">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Why TasteMatch</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Beyond genres",
                  description: "We analyze tone, pacing, cinematography, and mood—not just surface-level categories.",
                  icon: Zap,
                },
                {
                  title: "Explained picks",
                  description: "Every recommendation comes with clear reasons why it matches your taste.",
                  icon: Sparkles,
                },
                {
                  title: "Hidden gems",
                  description: "Discover classics, indie favorites, and international films you've never heard of.",
                  icon: Search,
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="p-6 rounded-2xl border border-border/50 bg-background/50 hover:border-border transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 sm:py-28 border-t border-border/50">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">What people are saying</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "Finally, a recommendation engine that gets my taste! It suggested films I'd never have found on my own.",
                  author: "Sarah M.",
                  role: "Film enthusiast"
                },
                {
                  quote: "The explanations are spot-on. I love knowing WHY a movie matches my preferences.",
                  author: "James K.",
                  role: "Casual viewer"
                },
                {
                  quote: "Discovered so many hidden gems. This feels like having a film critic friend who knows me perfectly.",
                  author: "Priya R.",
                  role: "Indie film fan"
                }
              ].map((testimonial, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-border/50 bg-card/50">
                  <p className="text-foreground leading-relaxed mb-6">
                    &quot;{testimonial.quote}&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{testimonial.author}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 sm:py-28 border-t border-border/50">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Ready to find your next favorite?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Stop endless scrolling. Start watching movies you&apos;ll love.
            </p>
            <Button asChild size="lg" className="h-12 sm:h-14 px-8 text-base sm:text-lg rounded-full">
              <Link href="/onboarding">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2024 TasteMatch. Powered by TMDB & Gemini AI.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
