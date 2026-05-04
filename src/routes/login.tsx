import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-2 font-bold"><Sparkles className="w-5 h-5 text-accent" /> SmartReceipt AI</div>
        <div>
          <h2 className="text-3xl font-bold">Welcome back.</h2>
          <p className="text-primary-foreground/70 mt-2 max-w-sm">Your AI finance coach is ready to help you save smarter this month.</p>
        </div>
        <div className="text-xs text-primary-foreground/50">Trusted by students across Malaysia 🇲🇾</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use your email and password.</p>
          </div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <Button type="submit" variant="navy" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          <p className="text-sm text-muted-foreground text-center">No account? <Link to="/signup" className="text-primary font-medium">Create one</Link></p>
        </form>
      </div>
    </div>
  );
}