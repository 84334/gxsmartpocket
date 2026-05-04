import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email to confirm.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-2 font-bold"><Sparkles className="w-5 h-5 text-accent" /> SmartReceipt AI</div>
        <div>
          <h2 className="text-3xl font-bold">Take control in 60 seconds.</h2>
          <p className="text-primary-foreground/70 mt-2 max-w-sm">Snap a receipt, see exactly where your RM goes, and start saving.</p>
        </div>
        <div className="text-xs text-primary-foreground/50">Free to start • No card required</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div><h1 className="text-2xl font-bold">Create account</h1><p className="text-sm text-muted-foreground">Start tracking smarter today.</p></div>
          <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
          <Button type="submit" variant="navy" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
          <p className="text-sm text-muted-foreground text-center">Have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}