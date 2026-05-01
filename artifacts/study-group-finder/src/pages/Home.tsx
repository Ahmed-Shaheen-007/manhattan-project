import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";
import { BookOpen, Users, Clock, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({
    query: { retry: false }
  });

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-48 bg-muted/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
                  Find Your Perfect Study <span className="text-primary">Squad</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl lg:text-2xl leading-relaxed">
                  The ultimate academic social hub for university students. Discover study groups, collaborate with peers, and crush your exams together.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-lg gap-2">
                    Get Started <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-24 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-card border border-card-border shadow-sm">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Find Your Tribe</h3>
                <p className="text-muted-foreground">
                  Search for groups by subject, faculty, or academic year. Find the people taking the exact same classes.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-card border border-card-border shadow-sm">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Stay Focused</h3>
                <p className="text-muted-foreground">
                  Join online or offline sessions. Keep track of upcoming meetings and coordinate effortlessly.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-card border border-card-border shadow-sm">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Real-time Chat</h3>
                <p className="text-muted-foreground">
                  Discuss materials, share notes, and ask questions before you even meet up with built-in group chats.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
