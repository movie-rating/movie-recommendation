'use client';

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Search, TrendingUp, Clock, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden selection:bg-primary/20">
      <div className="fixed inset-0 -z-10">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }} />
        
        {/* Gradient orbs - more vibrant */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-primary/10 opacity-50 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute right-[10%] top-[15%] h-[400px] w-[400px] bg-gradient-to-br from-blue-500/30 to-cyan-500/30 opacity-60 blur-[100px] rounded-full" />
        <div className="absolute left-[10%] bottom-[20%] h-[500px] w-[500px] bg-gradient-to-tr from-purple-500/30 to-pink-500/30 opacity-60 blur-[110px] rounded-full" />
        <div className="absolute right-[20%] bottom-[10%] h-[350px] w-[350px] bg-gradient-to-tl from-orange-500/25 to-yellow-500/25 opacity-40 blur-[90px] rounded-full" />
      </div>

      <Header transparent />
      
      <main className="flex-1">
        <section className="relative pt-16 pb-24 sm:pt-20 sm:pb-32 md:pt-32 md:pb-40 overflow-hidden">
          {/* Decorative floating elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[20%] left-[15%] w-2 h-2 bg-blue-500/30 rounded-full animate-float" style={{ animationDuration: '4s' }}></div>
            <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 bg-purple-500/40 rounded-full animate-float" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
            <div className="absolute bottom-[40%] left-[25%] w-1 h-1 bg-pink-500/30 rounded-full animate-float" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
            <div className="absolute bottom-[30%] right-[18%] w-2 h-2 bg-cyan-500/30 rounded-full animate-float" style={{ animationDuration: '7s', animationDelay: '0.5s' }}></div>
            <div className="absolute top-[50%] left-[10%] w-1.5 h-1.5 bg-yellow-500/40 rounded-full animate-float" style={{ animationDuration: '5.5s', animationDelay: '1.5s' }}></div>
            <div className="absolute top-[25%] right-[12%] w-1 h-1 bg-green-500/30 rounded-full animate-float" style={{ animationDuration: '4.5s', animationDelay: '0.8s' }}></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center text-center relative z-10">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Sparkles className="w-3.5 h-3.5 mr-2 text-yellow-500 animate-pulse relative z-10" />
              <span className="relative z-10">AI-Powered Discovery</span>
            </div>

            {/* Hero Text */}
            <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100 relative">
              Stop Scrolling.
              <br className="hidden md:block" />
              <span className="inline-block relative text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-blue-600 animate-gradient">
                Start Watching.
                {/* Sparkle decorations */}
                <span className="absolute -top-4 -right-8 text-2xl animate-pulse" style={{ animationDuration: '2s' }}>✨</span>
                <span className="absolute -bottom-2 -left-6 text-xl animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>⚡</span>
              </span>
            </h1>

            <p className="max-w-2xl text-lg sm:text-xl md:text-2xl text-muted-foreground text-balance mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
              Get instant, personalized movie picks—across platforms
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <div className="flex flex-col items-center gap-2 w-full sm:w-auto relative">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl rounded-full scale-150 animate-pulse" style={{ animationDuration: '3s' }}></div>
                
                <Button asChild size="lg" className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105 w-full sm:w-auto min-h-[44px] relative z-10 group overflow-hidden">
                  <Link href="/onboarding">
                    <span className="relative z-10 flex items-center">
                      Find My Next Movie in 2 Minutes <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </Link>
                </Button>
                <span className="text-xs text-muted-foreground relative z-10">Free • No signup required to start</span>
              </div>
            </div>
            <div className="mt-4 text-sm animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in →
              </Link>
            </div>

            {/* Stats Section */}
            <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl w-full animate-in fade-in zoom-in duration-1000 delay-500">
              <div className="flex flex-col items-center p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mb-2" />
                <div className="text-2xl sm:text-4xl font-bold text-foreground mb-1">10K+</div>
                <div className="text-xs sm:text-sm text-muted-foreground text-center">Movies Analyzed</div>
              </div>
              <div className="flex flex-col items-center p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-sm">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mb-2" />
                <div className="text-2xl sm:text-4xl font-bold text-foreground mb-1">95%</div>
                <div className="text-xs sm:text-sm text-muted-foreground text-center">Match Accuracy</div>
              </div>
              <div className="flex flex-col items-center p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 backdrop-blur-sm">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-2" />
                <div className="text-2xl sm:text-4xl font-bold text-foreground mb-1">2min</div>
                <div className="text-xs sm:text-sm text-muted-foreground text-center">Average Setup</div>
              </div>
            </div>

          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-16 relative">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">How it works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Three simple steps to discover movies you'll love</p>
            </div>
            <div className="relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 -translate-y-1/2 z-0"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
                {[
                  {
                    title: "Share your favorites",
                    description: "Name a few movies you love—we'll learn your taste.",
                    icon: Sparkles,
                    color: "blue",
                    emoji: "🎯"
                  },
                  {
                    title: "AI decodes your vibe",
                    description: "We analyze tone, pacing, and style—not just genres.",
                    icon: Zap,
                    color: "purple",
                    emoji: "🧠"
                  },
                  {
                    title: "Get personalized picks",
                    description: "Instant recommendations with clear reasons why.",
                    icon: Search,
                    color: "green",
                    emoji: "✨"
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  const colorClasses: Record<string, string> = {
                    blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:shadow-blue-500/20",
                    purple: "from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:shadow-purple-500/20",
                    green: "from-green-500/10 to-emerald-500/10 border-green-500/30 hover:shadow-green-500/20"
                  };
                  return (
                    <div key={item.title} className={`rounded-3xl border bg-gradient-to-br ${colorClasses[item.color]} backdrop-blur-md p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 relative`}>
                      <div className="absolute -top-3 -right-3 text-4xl">{item.emoji}</div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground text-base font-bold shadow-lg">
                          {index + 1}
                        </span>
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 sm:py-24 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Why TasteMatch is different</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <div className="group p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-md hover:bg-card/60 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Beyond genres</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We analyze tone, pacing, cinematography, and mood—not just "action" or "comedy."
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-md hover:bg-card/60 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/30">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Explained picks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every recommendation comes with clear reasons why it matches your taste.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-md hover:bg-card/60 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:border-green-500/30">
                <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Search className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Hidden gems</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Discover classics, indie favorites, and international films you've never heard of.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 sm:py-20 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Loved by movie enthusiasts</h2>
              <p className="text-muted-foreground">Real feedback from real users</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "Finally, a recommendation engine that gets my taste! It suggested films I'd never have found on my own.",
                  author: "Sarah M.",
                  role: "Film buff"
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
                <div key={idx} className="relative p-6 rounded-2xl bg-gradient-to-br from-card/60 to-card/40 border border-border/50 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <div className="absolute -top-4 -left-2 text-6xl text-primary/20 font-serif">"</div>
                  <p className="text-foreground/90 leading-relaxed mb-4 relative z-10 italic">
                    {testimonial.quote}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg font-bold">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.author}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">⭐</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof CTA */}
        <section className="py-16 sm:py-24 text-center border-t border-border/40 bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-sm relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-10 left-10 text-6xl opacity-10 animate-float">🎬</div>
          <div className="absolute bottom-10 right-10 text-6xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>🍿</div>
          <div className="absolute top-1/2 left-1/4 text-4xl opacity-5 animate-float" style={{ animationDelay: '2s' }}>⭐</div>
          
          <div className="max-w-4xl mx-auto px-4 relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">
              Ready to find your next favorite? 🎯
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto">
              Stop endless scrolling. Start watching movies you'll actually love.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8 sm:px-10 h-12 sm:h-14 text-base sm:text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105 min-h-[44px] relative overflow-hidden group">
                <Link href="/onboarding">
                  <span className="relative z-10">Get Started in 2 Minutes</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 animate-shimmer"></div>
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">Join thousands finding their perfect watch ✨</p>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-8 text-center border-t border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 TasteMatch. Powered by TMDB & Gemini AI.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
