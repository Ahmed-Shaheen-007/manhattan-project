import { useGetMe, useGetDashboardSummary, useGetUpcomingGroups, useGetPopularGroups } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Monitor, MapPin, Calendar, Clock, ArrowRight, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: upcoming, isLoading: isUpcomingLoading } = useGetUpcomingGroups();
  const { data: popular, isLoading: isPopularLoading } = useGetPopularGroups();

  if (isUserLoading || isSummaryLoading || isUpcomingLoading || isPopularLoading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your study groups.</p>
        </div>
        <Link href="/groups/new">
          <Button className="gap-2">
            <BookOpen className="h-4 w-4" />
            Create Study Group
          </Button>
        </Link>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.myGroupsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active memberships</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.upcomingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled in your groups</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Groups</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.onlineGroups}</div>
              <p className="text-xs text-muted-foreground mt-1">Platform-wide</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In-Person Groups</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.offlineGroups}</div>
              <p className="text-xs text-muted-foreground mt-1">Platform-wide</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Your Upcoming Sessions</h2>
            <Link href="/groups">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {upcoming && upcoming.length > 0 ? (
            <div className="grid gap-4">
              {upcoming.map((group) => (
                <Card key={group.id} className="hover-elevate transition-all border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/groups/${group.id}`} className="hover:underline">
                            {group.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1 font-medium text-primary">
                          {group.subject}
                        </CardDescription>
                      </div>
                      <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        {group.type === "online" ? <Monitor className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {group.type === "online" ? "Online" : "In Person"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(group.dateTime), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(group.dateTime), "h:mm a")}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Link href={`/groups/${group.id}`}>
                        <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                          Open Group
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No upcoming sessions</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Join some groups to see your schedule here</p>
                <Link href="/groups">
                  <Button variant="outline" size="sm">Find Groups</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Popular Right Now</h2>
          </div>
          
          {popular && popular.length > 0 ? (
            <div className="grid gap-4">
              {popular.map((group) => (
                <Card key={group.id} className="hover-elevate transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/groups/${group.id}`} className="hover:underline">
                            {group.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1">{group.subject}</CardDescription>
                      </div>
                      <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.memberCount} / {group.maxMembers}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {group.description}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(group.dateTime), "MMM d")}
                      </div>
                      <Link href={`/groups/${group.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          Details <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">No popular groups at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
