import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, User, LayoutDashboard, Search, Shield } from "lucide-react";

export function Navbar() {
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
    }
  });
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    localStorage.removeItem("token");
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center mx-auto px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block text-xl tracking-tight text-primary">
            StudyGroup
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/groups" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Find Groups
            </Link>
          </nav>
        ) : null}

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {!isLoading && (
              user ? (
                <>
                  {(user as any).role === "admin" && (
                    <Link href="/admin" className="mr-4">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      {user.name}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
