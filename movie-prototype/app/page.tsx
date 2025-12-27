'use client';

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Search, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.02] rounded-full blur-3xl" />
      </div>

      <Header transparent />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 md:pt-32 md:pb-36">
          <div className="max-w-3xl mx-auto px-4 flex flex-col items-center text-center">
            {/* Hero Text */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Stop Scrolling.
              <br />
              <span className="text-primary">Start Watching.</span>
            </h1>

            <p className="max-w-lg text-lg text-muted-foreground mb-8 leading-relaxed">
              AI-powered movie recommendations tailored to your unique taste.
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
              <Button asChild size="lg" className="h-12 sm:h-14 px-8 text-base sm:text-lg rounded-full w-full sm:w-auto">
                <Link href="/onboarding">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">Free · No signup required</span>
            </div>

            <div className="mt-4 text-sm">
              <Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Already have an account? <span className="text-primary font-medium">Sign in</span>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works - Compact */}
        <section className="py-16 sm:py-20 border-t border-border/50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-12">How it works</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Share favorites",
                  description: "Rate a few movies you love",
                  icon: Sparkles,
                },
                {
                  step: "2",
                  title: "AI analyzes",
                  description: "We decode your taste DNA",
                  icon: Zap,
                },
                {
                  step: "3",
                  title: "Get picks",
                  description: "Personalized recommendations",
                  icon: Search,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features - Combined with benefits */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  title: "Beyond genres",
                  description: "Analyzes tone, pacing, and mood",
                  icon: Zap,
                },
                {
                  title: "Explained picks",
                  description: "Know why you'll love each one",
                  icon: Star,
                },
                {
                  title: "Hidden gems",
                  description: "Discover films you'd never find",
                  icon: Search,
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="p-5 rounded-xl border border-border bg-background">
                    <Icon className="w-5 h-5 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Social Proof - Simple */}
        <section className="py-12 sm:py-16 border-t border-border/50">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground italic mb-2">
              &quot;Finally, recommendations that actually get my taste.&quot;
            </p>
            <p className="text-sm text-muted-foreground">
              Trusted by thousands of movie lovers
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-20 border-t border-border/50">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to find your next favorite?
            </h2>
            <p className="text-muted-foreground mb-6">
              Takes less than 2 minutes to get started.
            </p>
            <Button asChild size="lg" className="h-12 px-8 rounded-full">
              <Link href="/onboarding">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2024 TasteMatch</p>
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
