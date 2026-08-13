import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BedDouble, Building2, CheckCircle2, ChevronLeft, CircleUserRound, DoorOpen, House, KeyRound, LogIn, MapPin, Menu, Phone, Sparkles, SquareDashed, UserPlus, Users, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const HERO_URL = "/manus-storage/prestige-estates-hero_4c13f790.jpg";

const statusLabel = { available: "متاح", reserved: "محجوز", sold: "تم البيع" } as const;
const statusStyle = {
  available: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  reserved: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  sold: "border-rose-300/25 bg-rose-300/10 text-rose-200",
} as const;

function formatPrice(price: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(price);
}

export default function Home() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user, logout } = useAuth();
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = trpc.estate.properties.list.useQuery();
  const { data: agents = [], error: agentsError } = trpc.estate.agents.list.useQuery();
  const { data: company, error: companyError } = trpc.estate.company.get.useQuery();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({ fullName: "", email: "", password: "" });

  const loginMutation = trpc.estate.auth.login.useMutation({
    onSuccess: ({ user: nextUser }) => {
      utils.estate.auth.me.setData(undefined, nextUser);
      setAuthMode(null);
      setLogin({ email: "", password: "" });
      if (nextUser.role === "admin") {
        setLocation("/admin");
      } else {
        toast.success("مرحبًا بك، يمكنك الآن تصفح العقارات.");
        document.getElementById("properties")?.scrollIntoView({ behavior: "smooth" });
      }
    },
    onError: error => toast.error(error.message),
  });

  const registerMutation = trpc.estate.auth.register.useMutation({
    onSuccess: ({ user: nextUser }) => {
      utils.estate.auth.me.setData(undefined, nextUser);
      setAuthMode(null);
      setRegister({ fullName: "", email: "", password: "" });
      toast.success("تم إنشاء حسابك كزائر بنجاح.");
      document.getElementById("properties")?.scrollIntoView({ behavior: "smooth" });
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!authMode) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setAuthMode(null);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [authMode]);

  const scrollTo = (target: string) => {
    setMobileMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
  };

  const phone = company?.phone?.replace(/[^+\d]/g, "") || "";
  const whatsapp = company?.whatsapp?.replace(/\D/g, "") || "";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[82px] flex-col items-center border-l border-white/[.08] bg-[#0b0d0c]/92 py-7 backdrop-blur-xl lg:flex">
        <button onClick={() => scrollTo("top")} className="group flex h-11 w-11 items-center justify-center rounded-xl border border-primary/45 text-xl font-bold text-primary transition hover:bg-primary/10" aria-label="الصفحة الرئيسية">
          <span className="font-[family-name:var(--font-display)]">P</span>
        </button>
        <div className="mt-9 flex flex-1 flex-col items-center gap-6">
          <RailButton label="الرئيسية" icon={House} onClick={() => scrollTo("top")} />
          <RailButton label="العقارات" icon={Building2} onClick={() => scrollTo("properties")} />
          <RailButton label="الوكلاء" icon={Users} onClick={() => scrollTo("agents")} />
        </div>
        <div className="flex flex-col items-center gap-4">
          {user?.role === "admin" ? (
            <RailButton label="لوحة المدير" icon={Sparkles} onClick={() => setLocation("/admin")} active />
          ) : user ? (
            <RailButton label="تسجيل الخروج" icon={LogIn} onClick={() => logout().then(() => toast.success("تم تسجيل الخروج"))} />
          ) : (
            <RailButton label="تسجيل الدخول" icon={LogIn} onClick={() => setAuthMode("login")} active />
          )}
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/[.08] bg-[#0b0d0c]/75 px-5 py-4 backdrop-blur-xl lg:right-[82px] lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="فتح القائمة"><Menu className="h-6 w-6" /></button>
          <button onClick={() => scrollTo("top")} className="flex items-center gap-3 text-right">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-primary/50 font-[family-name:var(--font-display)] text-lg font-bold text-primary">P</span>
            <span className="font-[family-name:var(--font-display)] text-lg tracking-wide">PRESTIGE <span className="text-primary">ESTATES</span></span>
          </button>
          <nav className="hidden items-center gap-7 text-sm text-white/70 lg:flex">
            <button className="transition hover:text-primary" onClick={() => scrollTo("top")}>الرئيسية</button>
            <button className="transition hover:text-primary" onClick={() => scrollTo("properties")}>العقارات</button>
            <button className="transition hover:text-primary" onClick={() => scrollTo("agents")}>الوكلاء</button>
            <button className="transition hover:text-primary" onClick={() => scrollTo("contact")}>تواصل معنا</button>
          </nav>
          <div className="flex items-center gap-3">
            {phone && <a className="hidden items-center gap-2 text-xs text-primary sm:flex" href={`tel:${phone}`}><Phone className="h-4 w-4" />{company?.phone}</a>}
            {user ? <button onClick={() => user.role === "admin" ? setLocation("/admin") : logout()} className="btn-ghost-gold !px-3 !py-2 text-xs">{user.role === "admin" ? "لوحة المدير" : "خروج"}</button> : <button onClick={() => setAuthMode("login")} className="btn-gold !px-4 !py-2 text-xs">تسجيل الدخول</button>}
          </div>
        </div>
      </header>

      <main className="lg:mr-[82px]">
        <section id="top" className="relative flex min-h-[760px] items-end overflow-hidden pb-24 pt-32 sm:min-h-[800px]">
          <img src={HERO_URL} alt="فيلا معاصرة فاخرة" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="hero-overlay absolute inset-0" />
          <div className="site-grain pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-10">
            <div className="max-w-2xl text-right">
              <p className="section-label fade-up">وجهات منتقاة بعناية</p>
              <div className="gold-hairline mt-5 h-px w-20 fade-up fade-delay-1" />
              <h1 className="mt-7 font-[family-name:var(--font-display)] text-5xl leading-[1.15] text-white sm:text-6xl lg:text-7xl fade-up fade-delay-1">تفاصيل تصنع <span className="gold-gradient-text italic">أسلوب حياة</span> استثنائيًا.</h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/68 sm:text-lg fade-up fade-delay-2">نقدّم مجموعة من العقارات التي تجمع بين الموقع المتميز، التصميم الرفيع، وفرص التملك ذات القيمة طويلة الأجل.</p>
              <div className="mt-9 flex flex-wrap gap-3 fade-up fade-delay-2">
                <button onClick={() => scrollTo("properties")} className="btn-gold">استكشف العقارات <ChevronLeft className="h-4 w-4" /></button>
                {!user && <button onClick={() => setAuthMode("register")} className="btn-ghost-gold">أنشئ حسابًا</button>}
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-5 right-5 mx-auto grid max-w-7xl grid-cols-3 border-t border-white/15 pt-5 text-center sm:left-10 sm:right-10 sm:max-w-7xl sm:text-right">
            <HeroMetric value="منتقى" label="كل عقار" />
            <HeroMetric value="وضوح" label="في البيانات" />
            <HeroMetric value="ثقة" label="في التجربة" />
          </div>
        </section>

        <section id="properties" className="relative px-5 py-24 sm:px-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-primary/40 to-transparent" />
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-xl">
                <p className="section-label">مختارات المنصة</p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">عقارات ترتقي <span className="italic text-primary">بالتوقعات</span></h2>
              </div>
              <p className="max-w-sm text-sm leading-7 text-muted">كل وجهة في هذه المجموعة اختيرت لتقدّم توازنًا استثنائيًا بين الموقع، التصميم، وإمكانات التملك.</p>
            </div>

            {propertiesError ? <QueryError message="تعذر تحميل العقارات الآن. يرجى تحديث الصفحة بعد لحظات." /> : propertiesLoading ? <PropertySkeleton /> : properties.length === 0 ? <EmptyProperties onLogin={() => setAuthMode("login")} user={user} /> : (
              <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {properties.map(property => (
                  <article key={property.id} className="property-card overflow-hidden rounded-2xl border border-white/[.08] bg-card">
                    <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
                      <img src={property.imageUrl} alt={property.name} className="property-photo h-full w-full object-cover" />
                      <span className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[11px] font-bold ${statusStyle[property.status]}`}>{statusLabel[property.status]}</span>
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 to-transparent" />
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight">{property.name}</h3>
                        <span className="whitespace-nowrap text-sm font-bold text-primary">{formatPrice(Number(property.price))}</span>
                      </div>
                      <p className="mt-3 flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4 text-primary" />{property.region}</p>
                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[.07] pt-4 text-xs text-white/65">
                        <span className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-primary" />{property.bedrooms} غرف</span>
                        <span className="flex items-center gap-2"><SquareDashed className="h-4 w-4 text-primary" />{property.area.toLocaleString("ar-SA")} م²</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="agents" className="border-y border-white/[.07] bg-[#0e1210] px-5 py-24 sm:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl">
              <p className="section-label">خبرة قريبة منك</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">تواصل مع <span className="italic text-primary">وكلائنا</span></h2>
            </div>
            {agentsError ? <QueryError message="تعذر تحميل بيانات الوكلاء الآن. يرجى المحاولة لاحقًا." /> : agents.length ? <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{agents.map(agent => <article key={agent.id} className="surface-panel rounded-2xl p-6"><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full border border-primary/30 bg-primary/10 font-[family-name:var(--font-display)] text-lg text-primary">{agent.fullName.charAt(0)}</span><div><h3 className="font-bold">{agent.fullName}</h3><p className="mt-1 text-xs text-muted">{agent.title || "مستشار عقاري"}</p></div></div><a href={`tel:${agent.phone.replace(/[^+\d]/g, "")}`} className="mt-6 flex items-center gap-2 text-sm text-primary transition hover:text-gold-soft"><Phone className="h-4 w-4" />{agent.phone}</a></article>)}</div> : <p className="mt-8 max-w-md text-sm leading-7 text-muted">يجري إعداد فريق الاستشارات الخاص بنا بعناية لضمان تجربة شخصية في كل خطوة.</p>}
          </div>
        </section>

        <section id="contact" className="px-5 py-24 sm:px-10">
          <div className="surface-panel mx-auto grid max-w-7xl overflow-hidden rounded-3xl lg:grid-cols-[1fr_.72fr]">
            <div className="p-8 sm:p-12"><p className="section-label">ابدأ محادثة خاصة</p><h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">هل وجدت عقارًا يلفت انتباهك؟</h2><p className="mt-6 max-w-lg leading-8 text-muted">فريقنا مستعد لترتيب استشارة متخصصة والإجابة عن استفساراتك حول العقارات المتاحة.</p></div>
            <div className="flex flex-col justify-center gap-4 border-t border-white/[.08] bg-primary/[.045] p-8 lg:border-r lg:border-t-0 sm:p-12">
              {phone && <a href={`tel:${phone}`} className="btn-gold"><Phone className="h-4 w-4" />اتصال مباشر</a>}
              {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn-ghost-gold"><DoorOpen className="h-4 w-4" />تواصل عبر واتساب</a>}
              {!phone && !whatsapp && <p className="text-sm leading-7 text-muted">{companyError ? "تعذر تحميل قنوات التواصل حاليًا. يرجى المحاولة لاحقًا." : "نعمل على تفعيل قناة اتصال خاصة تضمن لك استشارة مخصصة وهادئة."}</p>}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[.08] px-5 py-8 text-center text-xs text-muted lg:mr-[82px] sm:px-10"><span className="font-[family-name:var(--font-display)] text-base text-white">{company?.companyName || "Prestige Estates"}</span><span className="mx-3 text-primary">•</span>منصة عقارية بتصميم مدروس</footer>

      {mobileMenuOpen && <div className="fixed inset-0 z-50 bg-[#0b0d0c] p-6 lg:hidden"><div className="flex items-center justify-between"><button className="flex items-center gap-3 text-right" onClick={() => scrollTo("top")}><span className="grid h-10 w-10 place-items-center rounded-lg border border-primary/50 font-[family-name:var(--font-display)] text-primary">P</span><span className="font-[family-name:var(--font-display)] text-lg">PRESTIGE <span className="text-primary">ESTATES</span></span></button><button onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق القائمة"><X /></button></div><nav className="mt-16 flex flex-col gap-7 font-[family-name:var(--font-display)] text-3xl"><button className="text-right" onClick={() => scrollTo("top")}>الرئيسية</button><button className="text-right" onClick={() => scrollTo("properties")}>العقارات</button><button className="text-right" onClick={() => scrollTo("agents")}>الوكلاء</button><button className="text-right" onClick={() => scrollTo("contact")}>تواصل معنا</button></nav><div className="mt-auto pt-14">{user?.role === "admin" ? <button onClick={() => setLocation("/admin")} className="btn-gold w-full">لوحة المدير</button> : !user ? <button onClick={() => { setMobileMenuOpen(false); setAuthMode("login"); }} className="btn-gold w-full">تسجيل الدخول</button> : <button onClick={() => logout()} className="btn-ghost-gold w-full">تسجيل الخروج</button>}</div></div>}

      {authMode && <AuthModal mode={authMode} close={() => setAuthMode(null)} login={login} setLogin={setLogin} register={register} setRegister={setRegister} onLogin={event => { event.preventDefault(); loginMutation.mutate(login); }} onRegister={event => { event.preventDefault(); registerMutation.mutate(register); }} pending={loginMutation.isPending || registerMutation.isPending} switchMode={() => setAuthMode(authMode === "login" ? "register" : "login")} />}
    </div>
  );
}

function RailButton({ label, icon: Icon, onClick, active = false }: { label: string; icon: typeof House; onClick: () => void; active?: boolean }) {
  return <button title={label} onClick={onClick} className={`group relative grid h-10 w-10 place-items-center rounded-xl transition ${active ? "bg-primary text-primary-foreground" : "text-white/45 hover:bg-white/[.06] hover:text-primary"}`}><Icon className="h-5 w-5" /><span className="pointer-events-none absolute right-12 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#141916] px-3 py-1.5 text-[10px] text-white shadow-xl group-hover:block">{label}</span></button>;
}

function HeroMetric({ value, label }: { value: string; label: string }) { return <div><strong className="block font-[family-name:var(--font-display)] text-xl text-primary sm:text-2xl">{value}</strong><span className="mt-1 block text-[10px] text-white/50 sm:text-xs">{label}</span></div>; }

function PropertySkeleton() { return <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-white/[.07] bg-card"><div className="h-56 bg-gradient-to-br from-primary/[.11] via-white/[.045] to-transparent" /><div className="space-y-4 p-6"><div className="h-5 w-2/3 rounded bg-white/[.08]" /><div className="h-3 w-1/2 rounded bg-white/[.05]" /><div className="h-px bg-primary/15" /></div></div>)}</div>; }

function QueryError({ message }: { message: string }) { return <div className="mt-12 rounded-2xl border border-rose-300/20 bg-rose-300/[.05] px-6 py-7 text-center text-sm leading-7 text-rose-100/80">{message}</div>; }

function EmptyProperties({ onLogin, user }: { onLogin: () => void; user: { role: "visitor" | "admin" } | null }) { return <div className="surface-panel mt-12 flex min-h-72 flex-col items-center justify-center rounded-2xl px-6 text-center"><Building2 className="h-10 w-10 text-primary" /><h3 className="mt-5 font-[family-name:var(--font-display)] text-2xl">اختيارات جديدة في الطريق</h3><p className="mt-3 max-w-md text-sm leading-7 text-muted">نعكف حاليًا على انتقاء وجهات استثنائية تليق بتطلعات عملائنا. عُد قريبًا لاكتشاف مجموعتنا القادمة.</p>{!user && <button onClick={onLogin} className="btn-ghost-gold mt-6">تسجيل الدخول</button>}</div>; }

function AuthModal({ mode, close, login, setLogin, register, setRegister, onLogin, onRegister, pending, switchMode }: { mode: "login" | "register"; close: () => void; login: { email: string; password: string }; setLogin: (value: { email: string; password: string }) => void; register: { fullName: string; email: string; password: string }; setRegister: (value: { fullName: string; email: string; password: string }) => void; onLogin: (event: FormEvent<HTMLFormElement>) => void; onRegister: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; switchMode: () => void }) {
  const isLogin = mode === "login";
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isLogin ? "تسجيل الدخول" : "إنشاء حساب"}><div className="surface-panel relative w-full max-w-md rounded-3xl p-7 sm:p-9"><button onClick={close} className="absolute left-5 top-5 text-white/50 transition hover:text-white" aria-label="إغلاق"><X className="h-5 w-5" /></button><div className="grid h-11 w-11 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">{isLogin ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}</div><p className="section-label mt-6">Prestige Estates</p><h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">{isLogin ? "أهلاً بعودتك" : "ابدأ رحلتك معنا"}</h2><p className="mt-3 text-sm leading-7 text-muted">{isLogin ? "أدخل بيانات حسابك للوصول إلى المنصة." : "سيتم إنشاء حسابك بصلاحية زائر لتصفح العقارات."}</p>{isLogin ? <form className="mt-7 space-y-4" onSubmit={onLogin}><input className="input-luxury" type="email" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} placeholder="البريد الإلكتروني" required autoComplete="email" /><input className="input-luxury" type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} placeholder="كلمة السر" required autoComplete="current-password" /><button className="btn-gold w-full" disabled={pending}>{pending ? "جارٍ التحقق..." : "تسجيل الدخول"}<LogIn className="h-4 w-4" /></button></form> : <form className="mt-7 space-y-4" onSubmit={onRegister}><input className="input-luxury" value={register.fullName} onChange={e => setRegister({ ...register, fullName: e.target.value })} placeholder="الاسم الكامل" required autoComplete="name" /><input className="input-luxury" type="email" value={register.email} onChange={e => setRegister({ ...register, email: e.target.value })} placeholder="البريد الإلكتروني" required autoComplete="email" /><input className="input-luxury" type="password" minLength={6} value={register.password} onChange={e => setRegister({ ...register, password: e.target.value })} placeholder="كلمة السر (6 أحرف على الأقل)" required autoComplete="new-password" /><button className="btn-gold w-full" disabled={pending}>{pending ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}<CircleUserRound className="h-4 w-4" /></button></form>}<p className="mt-6 text-center text-xs text-muted">{isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"} <button onClick={switchMode} className="font-bold text-primary hover:text-gold-soft">{isLogin ? "أنشئ حسابًا" : "تسجيل الدخول"}</button></p></div></div>;
}
