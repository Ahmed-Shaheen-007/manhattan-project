import { useParams, Link } from "wouter";
import { useGetMe, useGetUser, useGetUserGroups, useUpdateProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BookOpen, Calendar, MapPin, Monitor, Edit2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  name: z.string().min(2),
  faculty: z.string().min(2),
  academicYear: z.coerce.number().min(1).max(10),
  subjectsOfInterest: z.string()
});

function EditProfileDialog({ user, open, setOpen }: { user: any, open: boolean, setOpen: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      faculty: user.faculty,
      academicYear: user.academicYear,
      subjectsOfInterest: user.subjectsOfInterest?.join(", ") || "",
    }
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: {
          name: values.name,
          faculty: values.faculty,
          academicYear: values.academicYear,
          subjectsOfInterest: values.subjectsOfInterest.split(",").map(s => s.trim()).filter(Boolean)
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      setOpen(false);
      toast({ title: "Profile updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update profile" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="faculty"
              render={({ field }) => (
                <FormItem><FormLabel>Faculty</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem><FormLabel>Academic Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subjectsOfInterest"
              render={({ field }) => (
                <FormItem><FormLabel>Subjects of Interest (comma separated)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>Save Changes</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Profile() {
  const params = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  
  const { data: me, isLoading: meLoading } = useGetMe();
  
  // If no ID param, viewing own profile
  const targetId = params.id ? parseInt(params.id, 10) : me?.id;
  const isOwnProfile = me?.id === targetId;

  const { data: user, isLoading: userLoading } = useGetUser(targetId as number, {
    query: { enabled: !!targetId && !isOwnProfile }
  });

  const { data: groups, isLoading: groupsLoading } = useGetUserGroups(targetId as number, {
    query: { enabled: !!targetId }
  });

  const profileUser = isOwnProfile ? me : user;

  if (meLoading || userLoading || groupsLoading) {
    return <div className="p-8">Loading profile...</div>;
  }

  if (!profileUser) {
    return <div className="p-8">User not found</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center overflow-hidden border-t-8 border-t-primary">
            <CardContent className="pt-8 pb-6 px-6">
              <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-background shadow-md">
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {profileUser.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold tracking-tight mb-1">{profileUser.name}</h2>
              <p className="text-muted-foreground mb-4">{profileUser.email}</p>
              
              {isOwnProfile && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setEditOpen(true)}>
                  <Edit2 className="h-4 w-4" /> Edit Profile
                </Button>
              )}
              
              <div className="mt-8 text-left space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Faculty</p>
                  <p className="font-medium">{profileUser.faculty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Academic Year</p>
                  <p className="font-medium">Year {profileUser.academicYear}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Joined</p>
                  <p className="font-medium">{profileUser.createdAt ? format(new Date(profileUser.createdAt), "MMM yyyy") : "Unknown"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {profileUser.subjectsOfInterest && profileUser.subjectsOfInterest.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profileUser.subjectsOfInterest.map((subject, i) => (
                    <Badge key={i} variant="secondary">{subject}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Study Groups ({groups?.length || 0})
          </h3>
          
          <div className="grid gap-4">
            {groups && groups.length > 0 ? (
              groups.map(group => (
                <Card key={group.id} className="hover-elevate transition-all">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div>
                      <h4 className="font-bold text-lg mb-1">
                        <Link href={`/groups/${group.id}`} className="hover:underline">
                          {group.title}
                        </Link>
                      </h4>
                      <p className="text-sm font-medium text-primary mb-2">{group.subject}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(group.dateTime), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          {group.type === "online" ? <Monitor className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {group.type === "online" ? "Online" : "In Person"}
                        </span>
                      </div>
                    </div>
                    <Link href={`/groups/${group.id}`}>
                      <Button variant="secondary" size="sm" className="w-full sm:w-auto">View</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-muted/30 border-dashed py-8 text-center">
                <CardContent>
                  <p className="text-muted-foreground mb-4">No active study groups.</p>
                  {isOwnProfile && (
                    <Link href="/groups">
                      <Button variant="outline">Find Groups to Join</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {isOwnProfile && <EditProfileDialog user={me} open={editOpen} setOpen={setEditOpen} />}
    </div>
  );
}
