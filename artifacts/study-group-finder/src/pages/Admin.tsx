import { useState } from "react";
import {
  useGetMe,
  useAdminGetStats,
  useAdminGetUsers,
  useAdminGetGroups,
  useAdminGetMessages,
  useAdminGetReports,
  useAdminGetLogs,
  useAdminDeleteUser,
  useAdminBanUser,
  useAdminChangeRole,
  useAdminDeleteGroup,
  useAdminDeleteMessage,
  useAdminUpdateReportStatus,
  useAdminBanUser as useBanUserFromReport,
  useAdminDeleteGroup as useDeleteGroupFromReport,
  useAdminDeleteMessage as useDeleteMsgFromReport,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ShieldAlert, Users, BookOpen, MessageSquare, Activity,
  Trash2, Ban, UserCheck, Shield, ClipboardList, ScrollText,
  Search, Flag, AlertTriangle, CheckCircle2, RefreshCw,
  Eye, EyeOff, XCircle, Clock,
} from "lucide-react";
import { useEffect } from "react";

type ReportStatus = "pending" | "reviewed" | "resolved" | "rejected";
type ReportFilter = "all" | ReportStatus;

const STATUS_CONFIG: Record<ReportStatus, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  pending: { label: "Pending", icon: <Clock className="h-3 w-3" />, badgeClass: "text-amber-600 border-amber-200" },
  reviewed: { label: "Reviewed", icon: <Eye className="h-3 w-3" />, badgeClass: "text-blue-600 border-blue-200" },
  resolved: { label: "Resolved", icon: <CheckCircle2 className="h-3 w-3" />, badgeClass: "text-green-600 border-green-200" },
  rejected: { label: "Rejected", icon: <XCircle className="h-3 w-3" />, badgeClass: "text-muted-foreground border-border" },
};

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userSearch, setUserSearch] = useState("");
  const [reportFilter, setReportFilter] = useState<ReportFilter>("all");
  const [msgFlaggedOnly, setMsgFlaggedOnly] = useState(false);

  const { data: me, isLoading: isMeLoading } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";

  useEffect(() => {
    if (!isMeLoading && (!me || !isAdmin)) {
      setLocation("/dashboard");
    }
  }, [me, isAdmin, isMeLoading, setLocation]);

  const { data: stats, refetch: refetchStats } = useAdminGetStats({ query: { enabled: isAdmin } });
  const { data: users, refetch: refetchUsers } = useAdminGetUsers({ query: { enabled: isAdmin } });
  const { data: groups, refetch: refetchGroups } = useAdminGetGroups({ query: { enabled: isAdmin } });
  const { data: messages, refetch: refetchMessages } = useAdminGetMessages(
    { flagged: msgFlaggedOnly || undefined },
    { query: { enabled: isAdmin } }
  );
  const { data: reports, refetch: refetchReports } = useAdminGetReports(
    { status: reportFilter === "all" ? undefined : reportFilter },
    { query: { enabled: isAdmin } }
  );
  const { data: logs, refetch: refetchLogs } = useAdminGetLogs({}, { query: { enabled: isAdmin } });

  const deleteUserMutation = useAdminDeleteUser();
  const banUserMutation = useAdminBanUser();
  const changeRoleMutation = useAdminChangeRole();
  const deleteGroupMutation = useAdminDeleteGroup();
  const deleteMessageMutation = useAdminDeleteMessage();
  const updateReportStatusMutation = useAdminUpdateReportStatus();
  const banUserFromReportMutation = useBanUserFromReport();
  const deleteGroupFromReportMutation = useDeleteGroupFromReport();
  const deleteMsgFromReportMutation = useDeleteMsgFromReport();

  const invalidate = (keys: string[]) => {
    keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      await deleteUserMutation.mutateAsync({ id });
      invalidate(["/api/admin/users", "/api/admin/stats"]);
      toast({ title: "User deleted" });
    } catch { toast({ variant: "destructive", title: "Failed to delete user" }); }
  };

  const handleBanUser = async (id: number, banned: boolean) => {
    try {
      await banUserMutation.mutateAsync({ id, data: { banned } });
      invalidate(["/api/admin/users", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: banned ? "User banned" : "User unbanned" });
    } catch { toast({ variant: "destructive", title: "Failed to update ban status" }); }
  };

  const handleChangeRole = async (id: number, role: "student" | "admin") => {
    try {
      await changeRoleMutation.mutateAsync({ id, data: { role } });
      invalidate(["/api/admin/users", "/api/admin/logs"]);
      toast({ title: `Role changed to ${role}` });
    } catch { toast({ variant: "destructive", title: "Failed to change role" }); }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    try {
      await deleteGroupMutation.mutateAsync({ id });
      invalidate(["/api/admin/groups", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: "Group deleted" });
    } catch { toast({ variant: "destructive", title: "Failed to delete group" }); }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await deleteMessageMutation.mutateAsync({ id });
      invalidate(["/api/admin/messages", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: "Message deleted" });
    } catch { toast({ variant: "destructive", title: "Failed to delete message" }); }
  };

  const handleUpdateReportStatus = async (id: number, status: ReportStatus) => {
    try {
      await updateReportStatusMutation.mutateAsync({ id, data: { status } });
      invalidate(["/api/admin/reports", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: `Report marked as ${status}` });
    } catch { toast({ variant: "destructive", title: "Failed to update report" }); }
  };

  const handleBanUserFromReport = async (userId: number, reportId: number) => {
    if (!confirm(`Ban user #${userId}? They will lose access to the platform.`)) return;
    try {
      await banUserFromReportMutation.mutateAsync({ id: userId, data: { banned: true } });
      await updateReportStatusMutation.mutateAsync({ id: reportId, data: { status: "resolved" } });
      invalidate(["/api/admin/users", "/api/admin/reports", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: "User banned and report resolved" });
    } catch { toast({ variant: "destructive", title: "Failed to ban user" }); }
  };

  const handleDeleteGroupFromReport = async (groupId: number, reportId: number) => {
    if (!confirm("Delete reported group? This cannot be undone.")) return;
    try {
      await deleteGroupFromReportMutation.mutateAsync({ id: groupId });
      await updateReportStatusMutation.mutateAsync({ id: reportId, data: { status: "resolved" } });
      invalidate(["/api/admin/groups", "/api/admin/reports", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: "Group deleted and report resolved" });
    } catch { toast({ variant: "destructive", title: "Failed to delete group" }); }
  };

  const handleDeleteMessageFromReport = async (msgId: number, reportId: number) => {
    if (!confirm("Delete reported message?")) return;
    try {
      await deleteMsgFromReportMutation.mutateAsync({ id: msgId });
      await updateReportStatusMutation.mutateAsync({ id: reportId, data: { status: "resolved" } });
      invalidate(["/api/admin/messages", "/api/admin/reports", "/api/admin/stats", "/api/admin/logs"]);
      toast({ title: "Message deleted and report resolved" });
    } catch { toast({ variant: "destructive", title: "Failed to delete message" }); }
  };

  const filteredUsers = (users as any[])?.filter((u: any) =>
    !userSearch ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  ) ?? [];

  if (isMeLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-muted-foreground">Verifying admin access...</div>
    </div>
  );
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-muted-foreground">Platform management and analytics</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchUsers(); refetchGroups(); refetchMessages(); refetchReports(); refetchLogs(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">+{stats.newUsersThisWeek} this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium">Total Groups</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
              <p className="text-xs text-muted-foreground">+{stats.newGroupsThisWeek} this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium">Active Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGroupsToday}</div>
              <p className="text-xs text-muted-foreground">Active groups</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">Total sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium">Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
              <p className="text-xs text-amber-600 font-medium">{stats.pendingReports} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium">Banned Users</CardTitle>
              <Ban className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bannedUsers}</div>
              <p className="text-xs text-muted-foreground">Accounts banned</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="groups" className="gap-2"><BookOpen className="h-4 w-4" />Groups</TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />Messages
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Reports
            {(stats?.pendingReports ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{stats!.pendingReports}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" />Audit Logs</TabsTrigger>
        </TabsList>

        {/* ─── USERS ─── */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registered Users</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9 h-9"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u: any) => (
                      <TableRow key={u.id} className={u.isBanned ? "opacity-60 bg-muted/30" : ""}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{u.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{u.name}</div>
                          {u.role === "admin" && (
                            <Badge variant="secondary" className="mt-0.5 text-xs gap-1">
                              <Shield className="h-3 w-3" />Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{u.email}</TableCell>
                        <TableCell className="text-sm">{u.faculty}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          {u.isBanned
                            ? <Badge variant="destructive" className="text-xs">Banned</Badge>
                            : <Badge variant="outline" className="text-xs text-green-600 border-green-200">Active</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="sm"
                              title={u.isBanned ? "Unban user" : "Ban user"}
                              className={u.isBanned ? "text-green-600 hover:bg-green-50" : "text-amber-600 hover:bg-amber-50"}
                              onClick={() => handleBanUser(u.id, !u.isBanned)}
                              disabled={u.id === (me as any)?.id}
                            >
                              {u.isBanned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                            <Select
                              value={u.role ?? "student"}
                              onValueChange={(v) => handleChangeRole(u.id, v as "student" | "admin")}
                              disabled={u.id === (me as any)?.id}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost" size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === (me as any)?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GROUPS ─── */}
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Platform Groups ({(groups as any[])?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groups as any[])?.map((g: any) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{g.id}</TableCell>
                        <TableCell className="font-medium max-w-[180px] truncate">{g.title}</TableCell>
                        <TableCell><Badge variant="outline">{g.subject}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">#{g.createdBy}</TableCell>
                        <TableCell className="text-sm">{format(new Date(g.dateTime), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={g.type === "online" ? "default" : "secondary"} className="capitalize text-xs">
                            {g.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{g.memberCount}/{g.maxMembers}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteGroup(g.id)}
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

        {/* ─── MESSAGES ─── */}
        <TabsContent value="messages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Message Moderation</CardTitle>
              <Button
                variant={msgFlaggedOnly ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setMsgFlaggedOnly(v => !v)}
              >
                <Flag className="h-4 w-4" />
                {msgFlaggedOnly ? "Showing flagged only" : "Show flagged only"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">ID</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(messages as any[])?.map((m: any) => (
                      <TableRow key={m.id} className={m.isFlagged ? "bg-amber-50/50" : ""}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{m.id}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="truncate text-sm">{m.content}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{m.groupTitle}</TableCell>
                        <TableCell className="text-sm">{m.user?.name ?? `#${m.userId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(m.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          {m.isFlagged
                            ? <Badge variant="destructive" className="gap-1 text-xs"><Flag className="h-3 w-3" />Flagged</Badge>
                            : <Badge variant="outline" className="text-xs text-green-600 border-green-200">Clean</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteMessage(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(messages as any[])?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {msgFlaggedOnly ? "No flagged messages" : "No messages"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── REPORTS ─── */}
        <TabsContent value="reports">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Reports</CardTitle>
              <Select value={reportFilter} onValueChange={v => setReportFilter(v as ReportFilter)}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">ID</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports as any[])?.map((r: any) => {
                      const cfg = STATUS_CONFIG[r.status as ReportStatus] ?? STATUS_CONFIG.pending;
                      return (
                        <TableRow key={r.id} className={r.status === "pending" ? "bg-amber-50/30" : ""}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                          <TableCell className="text-sm font-medium">{r.reporter?.name ?? `#${r.reporterId}`}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">{r.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">#{r.targetId}</TableCell>
                          <TableCell>
                            <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded-full">
                              {r.reason.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[160px]">
                            {r.description
                              ? <p className="text-xs text-muted-foreground truncate" title={r.description}>{r.description}</p>
                              : <span className="text-xs text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs gap-1 ${cfg.badgeClass}`}>
                              {cfg.icon}
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {/* Status change dropdown */}
                              <Select
                                value={r.status}
                                onValueChange={v => handleUpdateReportStatus(r.id, v as ReportStatus)}
                              >
                                <SelectTrigger className="h-7 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="reviewed">Reviewed</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Type-specific action buttons */}
                              {r.type === "user" && r.status !== "resolved" && (
                                <Button
                                  variant="ghost" size="sm"
                                  title="Ban reported user"
                                  className="text-amber-600 hover:bg-amber-50 h-7 px-2"
                                  onClick={() => handleBanUserFromReport(r.targetId, r.id)}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {r.type === "group" && r.status !== "resolved" && (
                                <Button
                                  variant="ghost" size="sm"
                                  title="Delete reported group"
                                  className="text-destructive hover:bg-destructive/10 h-7 px-2"
                                  onClick={() => handleDeleteGroupFromReport(r.targetId, r.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {r.type === "message" && r.status !== "resolved" && (
                                <Button
                                  variant="ghost" size="sm"
                                  title="Delete reported message"
                                  className="text-destructive hover:bg-destructive/10 h-7 px-2"
                                  onClick={() => handleDeleteMessageFromReport(r.targetId, r.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!(reports as any[])?.length && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No reports found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── AUDIT LOGS ─── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">ID</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target Type</TableHead>
                      <TableHead>Target ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs as any[])?.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{l.id}</TableCell>
                        <TableCell className="text-sm font-medium">{l.admin?.name ?? `#${l.adminId}`}</TableCell>
                        <TableCell>
                          <Badge
                            variant={l.action.startsWith("DELETE") || l.action.startsWith("BAN") ? "destructive" : "secondary"}
                            className="text-xs font-mono"
                          >
                            {l.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{l.targetType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">#{l.targetId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(l.createdAt), "MMM d, yyyy HH:mm:ss")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(logs as any[])?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No admin actions recorded yet
                        </TableCell>
                      </TableRow>
                    )}
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
