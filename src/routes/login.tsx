import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Phone, ChevronRight, UserPlus, LogIn, Eye, EyeOff, KeyRound } from "lucide-react";
import logo from "@/assets/logo.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "প্রবেশ করুন — কৃষক বন্ধু" }] }),
});

function LoginPage() {
  const navigate = useNavigate();

  // --- Login states ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setInterval(() => setOtpCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  // --- Register states ---
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [loading, setLoading] = useState(false);

  const afterLogin = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { data: p } = await supabase
      .from("profiles").select("district").eq("id", data.session.user.id).maybeSingle();
    navigate({ to: p?.district ? "/dashboard" : "/register" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Google সাইন-ইন ব্যর্থ"); setLoading(false); return; }
    if (r.redirected) return;
    await afterLogin();
    setLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    await afterLogin();
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phone) return toast.error("ফোন নম্বর দিন");
    if (otpCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    setOtpCooldown(30);
    toast.success("OTP পাঠানো হয়েছে");
  };

  const handleForgotPassword = async () => {
    if (!email) return toast.error("আগে আপনার ইমেইল লিখুন");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) return toast.error("রিসেট লিংক পাঠানো যায়নি");
    toast.success("পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে");
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    await afterLogin();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      return toast.error("পাসওয়ার্ড মিলছে না");
    }
    if (regPassword.length < 6) {
      return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    if (data.session) {
      toast.success("অ্যাকাউন্ট তৈরি হয়েছে! প্রোফাইল সম্পূর্ণ করুন।");
      await afterLogin();
    } else {
      toast.success("অ্যাকাউন্ট তৈরি হয়েছে! আপনার ইমেইল চেক করে কনফার্মেশন লিংকে ক্লিক করুন, তারপর প্রবেশ করুন।", { duration: 8000 });
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="flex flex-col items-center gap-3 px-6 pt-12 pb-8" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/25 overflow-hidden">
          <img src={logo} alt="কৃষক বন্ধু লোগো" width={56} height={56} decoding="async" className="h-14 w-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">কৃষক বন্ধু</h1>
        <p className="text-sm text-white/85">আপনার কৃষি সঙ্গী</p>
      </header>

      <div className="flex-1 px-6 py-6 -mt-4">
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 text-base font-semibold gap-3 border-2"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google দিয়ে চালিয়ে যান
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">অথবা</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="login" className="text-base gap-2"><LogIn className="h-4 w-4" />প্রবেশ করুন</TabsTrigger>
              <TabsTrigger value="register" className="text-base gap-2"><UserPlus className="h-4 w-4" />নিবন্ধন করুন</TabsTrigger>
            </TabsList>

            {/* ===== LOGIN TAB ===== */}
            <TabsContent value="login" className="mt-4">
              <Tabs defaultValue="email">
                <TabsList className="grid w-full grid-cols-2 h-11 mb-4">
                  <TabsTrigger value="email" className="text-sm gap-2"><Mail className="h-4 w-4" />ইমেইল</TabsTrigger>
                  <TabsTrigger value="phone" className="text-sm gap-2"><Phone className="h-4 w-4" />ফোন</TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <form onSubmit={handleEmailLogin} className="space-y-3">
                    <div>
                      <Label htmlFor="login-email" className="text-base">ইমেইল</Label>
                      <Input id="login-email" type="email" required value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 text-base mt-1" placeholder="you@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="login-pwd" className="text-base">পাসওয়ার্ড</Label>
                      <div className="relative mt-1">
                        <Input id="login-pwd" type={showPassword ? "text" : "password"} required minLength={6} value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 text-base pr-12" placeholder="••••••" />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted"
                          aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <button type="button" onClick={handleForgotPassword} disabled={loading} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <KeyRound className="h-3.5 w-3.5" /> পাসওয়ার্ড ভুলে গেছেন?
                      </button>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 text-base font-bold gap-2">
                      প্রবেশ করুন <ChevronRight className="h-5 w-5" />
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="phone">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="login-phone" className="text-base">ফোন নম্বর</Label>
                      <Input id="login-phone" type="tel" value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 text-base mt-1" placeholder="+8801XXXXXXXXX" />
                    </div>
                    {otpSent && (
                      <div>
                        <Label htmlFor="login-otp" className="text-base">OTP কোড</Label>
                        <Input id="login-otp" inputMode="numeric" value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="h-12 text-base mt-1 tracking-widest text-center" placeholder="123456" />
                        <button type="button" onClick={handleSendOtp} disabled={loading || otpCooldown > 0} className="mt-2 text-xs font-semibold text-primary hover:underline disabled:text-muted-foreground">
                          {otpCooldown > 0 ? `${otpCooldown} সেকেন্ড পর আবার পাঠান` : "OTP আবার পাঠান"}
                        </button>
                      </div>
                    )}
                    <Button
                      type="button"
                      disabled={loading}
                      className="w-full h-14 text-base font-bold gap-2"
                      onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                    >
                      {otpSent ? "যাচাই করুন" : "OTP পাঠান"} <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ===== REGISTER TAB ===== */}
            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <Label htmlFor="reg-email" className="text-base">ইমেইল</Label>
                  <Input id="reg-email" type="email" required value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-12 text-base mt-1" placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="reg-pwd" className="text-base">পাসওয়ার্ড</Label>
                  <Input id="reg-pwd" type="password" required minLength={6} value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="h-12 text-base mt-1" placeholder="••••••" />
                </div>
                <div>
                  <Label htmlFor="reg-confirm" className="text-base">পাসওয়ার্ড নিশ্চিত করুন</Label>
                  <Input id="reg-confirm" type="password" required minLength={6} value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className="h-12 text-base mt-1" placeholder="••••••" />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 text-base font-bold gap-2">
                  নিবন্ধন করুন <ChevronRight className="h-5 w-5" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          প্রবেশ করার মাধ্যমে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন
        </p>
      </div>
    </main>
  );
}
