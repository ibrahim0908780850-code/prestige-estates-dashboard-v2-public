import { trpc } from "@/lib/trpc";
import { ArrowRight, KeyRound, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({ fullName: "", email: "", password: "" });
  const loginMutation = trpc.estate.auth.login.useMutation({ onSuccess: ({ user }) => { utils.estate.auth.me.setData(undefined, user); setLocation(user.role === "admin" ? "/admin" : "/"); }, onError: error => toast.error(error.message) });
  const registerMutation = trpc.estate.auth.register.useMutation({ onSuccess: ({ user }) => { utils.estate.auth.me.setData(undefined, user); toast.success("تم إنشاء الحساب بنجاح"); setLocation("/"); }, onError: error => toast.error(error.message) });
  const pending = loginMutation.isPending || registerMutation.isPending;
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mode === "login" ? loginMutation.mutate(login) : registerMutation.mutate(register); };
  const loginMode = mode === "login";
  return <div className="grid min-h-screen place-items-center bg-[#050505] px-5 py-10 text-white" dir="rtl"><div className="w-full max-w-md rounded-2xl border border-white/[.1] bg-[#111111] p-7 shadow-2xl sm:p-9"><button onClick={() => setLocation("/")} className="flex items-center gap-2 text-sm text-muted transition hover:text-primary"><ArrowRight className="h-4 w-4" />العودة إلى العقارات</button><div className="mt-9 grid h-12 w-12 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">{loginMode ? <KeyRound /> : <UserPlus />}</div><p className="section-label mt-6">Prestige Estates</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl">{loginMode ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1><p className="mt-3 text-sm leading-7 text-muted">{loginMode ? "أدخل بريدك الإلكتروني وكلمة السر للانتقال إلى حسابك." : "سينشأ حسابك بصلاحية زائر لتصفح العقارات."}</p><form onSubmit={submit} className="mt-7 space-y-4">{!loginMode && <input className="input-luxury" value={register.fullName} onChange={event => setRegister({ ...register, fullName: event.target.value })} placeholder="الاسم الكامل" required autoComplete="name" />}<input className="input-luxury" type="email" value={loginMode ? login.email : register.email} onChange={event => loginMode ? setLogin({ ...login, email: event.target.value }) : setRegister({ ...register, email: event.target.value })} placeholder="البريد الإلكتروني" required autoComplete="email" /><input className="input-luxury" type="password" minLength={loginMode ? 1 : 6} value={loginMode ? login.password : register.password} onChange={event => loginMode ? setLogin({ ...login, password: event.target.value }) : setRegister({ ...register, password: event.target.value })} placeholder="كلمة السر" required autoComplete={loginMode ? "current-password" : "new-password"} /><button className="btn-primary w-full" disabled={pending}>{pending ? "جارٍ التحقق..." : loginMode ? "تسجيل الدخول" : "إنشاء الحساب"}</button></form><p className="mt-6 text-center text-sm text-muted">{loginMode ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"} <button onClick={() => setMode(loginMode ? "register" : "login")} className="font-bold text-primary hover:text-[#f0d58f]">{loginMode ? "إنشاء حساب جديد" : "تسجيل الدخول"}</button></p></div></div>;
}
