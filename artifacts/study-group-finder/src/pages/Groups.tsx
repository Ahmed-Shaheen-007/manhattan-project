import { useState, useEffect } from "react";
import { useGetGroups, GetGroupsType } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search as SearchIcon, Monitor, MapPin, Calendar, Clock, Plus } from "lucide-react";
import { format } from "date-fns";

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Groups() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounceValue(search, 300);
  const [type, setType] = useState<GetGroupsType | "all">("all");
  const [subject, setSubject] = useState("");

  const params: any = {};
  if (debouncedSearch) params.search = debouncedSearch;
  if (type !== "all") params.type = type;
  if (subject) params.subject = subject;

  const { data: groups, isLoading } = useGetGroups(params);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Groups</h1>
          <p className="text-muted-foreground mt-1">Find the perfect study group or create your own.</p>
        </div>
        <Link href="/groups/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </Link>
      </div>

      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Input
              placeholder="Filter by subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50"></CardHeader>
              <CardContent className="h-32"></CardContent>
            </Card>
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col hover-elevate transition-all border-t-4 border-t-primary">
              <CardHeader className="pb-3 flex-none">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardDescription className="font-semibold text-primary mb-1">
                      {group.subject}
                    </CardDescription>
                    <CardTitle className="text-xl line-clamp-2 leading-tight">
                      <Link href={`/groups/${group.id}`} className="hover:underline">
                        {group.title}
                      </Link>
                    </CardTitle>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shrink-0 ${
                    group.type === 'online' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                    {group.type === "online" ? <Monitor className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                    {group.type === "online" ? "Online" : "In Person"}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                  {group.description}
                </p>
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center text-sm text-foreground/80 gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(group.dateTime), "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center text-sm text-foreground/80 gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(group.dateTime), "h:mm a")}</span>
                  </div>
                  <div className="flex items-center text-sm text-foreground/80 gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{group.memberCount} / {group.maxMembers} members</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 mt-auto">
                <Link href={`/groups/${group.id}`} className="w-full">
                  <Button variant="secondary" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-muted/30 border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No groups found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              We couldn't find any study groups matching your current filters. Try adjusting your search or create a new group.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setType("all");
                setSubject("");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
