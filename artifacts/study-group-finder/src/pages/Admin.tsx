import { useGetMe, useAdminGetStats, useAdminGetUsers, useAdminGetGroups, useAdminDeleteUser, useAdminDeleteMessage } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ShieldAlert, Users, BookOpen, MessageSquare, Activity, Trash2 } from "lucide-react";
import { useEffect } from "react";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useGetMe();
  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    if (!isUserLoading && (!user || !isAdmin)) {
      setLocation("/dashboard");
    }
  }, [user, isAdmin, isUserLoading, setLocation]);

  const { data: stats } = useAdminGetStats({ query: { enabled: isAdmin } });
  const { data: users } = useAdminGetUsers({ query: { enabled: isAdmin } });
  const { data: groups } = useAdminGetGroups({ query: { enabled: isAdmin } });
  
  const deleteUserMutation = useAdminDeleteUser();

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      await deleteUserMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete user" });
    }
  };

  if (isUserLoading) return <div className="p-8">Verifying access...</div>;
  if (!isAdmin) return null; // Let the effect redirect

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground">Platform management and analytics</p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">+{stats.newUsersThisWeek} this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
              <p className="text-xs text-muted-foreground mt-1">+{stats.newGroupsThisWeek} this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Groups Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGroupsToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Sessions happening now</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all groups</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users Management</TabsTrigger>
          <TabsTrigger value="groups">Groups Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.id}</TableCell>
                        <TableCell>{u.name} {u.role === "admin" && <Badge variant="secondary" className="ml-2">Admin</Badge>}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.faculty}</TableCell>
                        <TableCell>{format(new Date(u.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === user?.id} // Don't delete yourself
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Platform Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Creator ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups?.map((g: any) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.id}</TableCell>
                        <TableCell>{g.title}</TableCell>
                        <TableCell><Badge variant="outline">{g.subject}</Badge></TableCell>
                        <TableCell>{g.createdBy}</TableCell>
                        <TableCell>{format(new Date(g.dateTime), "MMM d, yyyy")}</TableCell>
                        <TableCell className="capitalize">{g.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
