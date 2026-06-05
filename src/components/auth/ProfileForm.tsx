"use client";

import { useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, LogOut, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(session?.user?.name || "");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });

      if (res.status === 401) {
        toast({
          title: "Error",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/login"; }, 1500);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update profile");
      }

      const updatedUser = await res.json();

      // Force session refresh so the new name shows in sidebar/avatar
      await update({ name: updatedUser.name });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.status === 401) {
        toast({
          title: "Error",
          description: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/login"; }, 1500);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload avatar");
      }

      const data = await res.json();

      // Force session refresh so the new avatar shows everywhere
      await update({ avatar: data.avatarUrl });

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm">
        <div className="p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex items-center gap-6">
          <div className="relative group">
            <Avatar className="size-20 ring-4 ring-primary/20 ring-offset-2 ring-offset-card group-hover:scale-105 transition-transform duration-500">
              <AvatarImage
                src={session?.user?.avatar || "/images/user-avatar.png"}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/10 to-[#A29BFE]/10 text-primary dark:text-[#A29BFE]">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Upload avatar"
            >
              {isUploading ? (
                <Loader2 className="size-6 text-white animate-spin" />
              ) : (
                <Camera strokeWidth={1.2} className="size-6 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {session?.user?.name || "User"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {session?.user?.email}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
              Click avatar to upload a new photo
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm">
        <div className="p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 space-y-4">
          <h3 className="text-sm font-extrabold text-foreground border-b border-border/15 pb-2">Profile Information</h3>
          
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-10.5 rounded-xl border-border/40 focus-visible:ring-primary/20 focus-visible:border-primary bg-background/30 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1">Email</Label>
            <Input
              id="email"
              value={session?.user?.email || ""}
              disabled
              className="h-10.5 rounded-xl bg-muted/40 border-border/20 text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="rounded-xl border-border/40 focus-visible:ring-primary/20 focus-visible:border-primary bg-background/30 backdrop-blur-sm"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="group/btn relative w-full h-11 flex items-center justify-between rounded-full bg-primary hover:bg-primary/95 text-white font-extrabold shadow-md shadow-primary/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] px-6 cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-white" />
                  Saving...
                </span>
              ) : (
                <>
                  <span className="text-xs tracking-tight">Save Changes</span>
                  <div className="flex size-7 items-center justify-center rounded-full bg-white/15 dark:bg-white/10 group-hover/btn:bg-white/25 transition-all duration-500">
                    <ChevronRight strokeWidth={1.2} className="size-4 text-white group-hover/btn:translate-x-0.5 transition-transform" />
                  </div>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[2rem] shadow-sm">
        <div className="p-6 rounded-[calc(2rem-4px)] bg-[#ffffff]/50 dark:bg-[#0c0c1b]/50 backdrop-blur-2xl border border-white/20 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-foreground">Sign Out</h3>
            <p className="text-xs text-muted-foreground">
              Sign out of your account
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="group/btn relative h-10 flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:scale-105 active:scale-95 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] px-5 font-bold"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut strokeWidth={1.2} className="size-4 mr-1 transition-transform group-hover/btn:translate-x-0.5" />
                Sign Out
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
