import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetGroup, 
  useGetGroupMembers, 
  useJoinGroup, 
  useLeaveGroup,
  useGetMessages,
  useSendMessage,
  getGetGroupQueryKey,
  getGetGroupMembersQueryKey,
  useGetMe
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Monitor, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Send, 
  ArrowLeft,
  User as UserIcon
} from "lucide-react";

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useGetMe();
  const { data: group, isLoading: isGroupLoading } = useGetGroup(groupId, {
    query: { enabled: !!groupId }
  });
  const { data: members, isLoading: isMembersLoading } = useGetGroupMembers(groupId, {
    query: { enabled: !!groupId }
  });
  
  const { data: messages, isLoading: isMessagesLoading } = useGetMessages(groupId, undefined, {
    query: { 
      enabled: !!groupId && !!group?.isMember,
      refetchInterval: 3000
    }
  });

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const sendMutation = useSendMessage();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync({ id: groupId });
      queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
      queryClient.invalidateQueries({ queryKey: getGetGroupMembersQueryKey(groupId) });
      toast({ title: "Joined group successfully" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to join",
        description: error?.data?.error || "An error occurred"
      });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync({ id: groupId });
      queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
      queryClient.invalidateQueries({ queryKey: getGetGroupMembersQueryKey(groupId) });
      toast({ title: "Left group" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to leave",
        description: error?.data?.error || "An error occurred"
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    try {
      await sendMutation.mutateAsync({ 
        id: groupId, 
        data: { content: messageText } 
      });
      setMessageText("");
      // Don't need to invalidate as polling will catch it, but doing it makes it instant
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "messages"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send message",
      });
    }
  };

  if (isGroupLoading || isMembersLoading) {
    return <div className="p-8">Loading group details...</div>;
  }

  if (!group) {
    return <div className="p-8">Group not found.</div>;
  }

  const isFull = group.memberCount >= group.maxMembers;
  const canJoin = !group.isMember && !isFull;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <Link href="/groups">
        <Button variant="ghost" size="sm" className="mb-6 -ml-3 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="mb-2">{group.subject}</Badge>
                  <CardTitle className="text-3xl font-bold">{group.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Created by {group.creator?.name || "Unknown"} • {format(new Date(group.createdAt || ""), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex shrink-0">
                  {group.isMember ? (
                    <Button variant="destructive" onClick={handleLeave} disabled={leaveMutation.isPending}>
                      {leaveMutation.isPending ? "Leaving..." : "Leave Group"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleJoin} 
                      disabled={!canJoin || joinMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {joinMutation.isPending ? "Joining..." : isFull ? "Group Full" : "Join Group"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div>
                <h3 className="font-semibold text-lg mb-2">About this group</h3>
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(group.dateTime), "EEEE, MMMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(group.dateTime), "h:mm a")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {group.type === "online" ? (
                      <Monitor className="h-5 w-5 text-primary" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {group.type === "online" ? "Online" : group.location || "TBD"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Capacity</p>
                    <p className="text-sm text-muted-foreground">
                      {group.memberCount} / {group.maxMembers} members
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Section */}
          {group.isMember ? (
            <Card className="flex flex-col h-[500px]">
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> Group Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isMessagesLoading ? (
                    <div className="text-center text-muted-foreground p-4">Loading messages...</div>
                  ) : messages && messages.length > 0 ? (
                    messages.map((msg) => {
                      const isMe = msg.userId === user?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {msg.user?.name?.substring(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`px-4 py-2 rounded-2xl ${
                              isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                            }`}>
                              {!isMe && <div className="text-xs font-semibold mb-1 opacity-75">{msg.user?.name}</div>}
                              <p className="text-sm break-words">{msg.content}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1 px-10">
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                      <div className="p-4 bg-muted rounded-full">
                        <Send className="h-6 w-6 opacity-50" />
                      </div>
                      <p>No messages yet. Say hello!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t bg-card mt-auto">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!messageText.trim() || sendMutation.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Join to unlock chat</h3>
                <p className="text-muted-foreground">You need to be a member of this group to view and send messages.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Members ({group.memberCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members?.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Link href={`/profile/${member.id}`}>
                      <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link href={`/profile/${member.id}`} className="font-medium text-sm hover:underline">
                        {member.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{member.faculty}</p>
                    </div>
                    {member.id === group.createdBy && (
                      <Badge variant="outline" className="ml-auto text-[10px] uppercase">Creator</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
