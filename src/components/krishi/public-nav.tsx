import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";
export function PublicNav() {
  return <nav aria-label="প্রধান মেনু" className="border-b border-border bg-background px-4 py-3"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
    <Link to="/" className="flex items-center gap-2 font-bold text-primary"><img src={logo} alt="" width={36} height={36} /> কৃষক বন্ধু</Link>
    <div className="flex flex-wrap items-center gap-1">
      <Button variant="ghost" asChild><Link to="/prices">বাজারদর</Link></Button>
      <Button variant="ghost" asChild><Link to="/vegetable-guide">ফসল গাইড</Link></Button>
      <Button asChild><Link to="/login">লগইন</Link></Button>
    </div>
  </div></nav>;
}