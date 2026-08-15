import { ChevronDown, Heart, LogIn, LogOut, Menu, Settings, UserCircle } from "lucide-react";
import { useState } from "react";

type User = { name: string; email: string; role: "visitor" | "admin" } | null;

type Props = {
  user: User;
  onNavigate: (id: string) => void;
  onLogin: () => void;
  onAdmin: () => void;
  onLogout: () => void;
  onMenu: () => void;
};

export function MainHeader({ user, onNavigate, onLogin, onAdmin, onLogout, onMenu }: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const initial = user?.name.trim().charAt(0).toUpperCase() || "";
  const openFavorites = () => {
    setAccountOpen(false);
    onNavigate("favorites");
  };

  return <>
    <aside className="fixed left-0 top-1/2 z-50 hidden -translate-y-1/2 border-y border-r border-primary/25 bg-[#10110f]/95 py-4 shadow-2xl backdrop-blur-xl lg:block">
      <div className="flex flex-col gap-3">
        <button onClick={user?.role === "admin" ? onAdmin : user ? () => setAccountOpen(true) : onLogin} className="group flex flex-col items-center gap-2 px-3 text-[10px] text-white/70 transition hover:text-primary">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-primary/45 bg-primary/10 font-[family-name:var(--font-display)] text-lg text-primary">{user ? initial : <LogIn className="h-4 w-4" />}</span>
          <span>{user ? user.name.split(" ")[0] : "تسجيل دخول"}</span>
        </button>
        {user && <button onClick={onLogout} className="flex flex-col items-center gap-1 px-3 text-[10px] text-white/35 transition hover:text-primary"><LogOut className="h-4 w-4" />خروج</button>}
      </div>
    </aside>
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[.06] bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center border border-primary/55 font-[family-name:var(--font-display)] text-xl text-primary">P</span><span className="hidden font-[family-name:var(--font-display)] text-xl sm:block">PRESTIGE <span className="text-primary">ESTATES</span></span></button>
        <nav className="hidden gap-8 text-sm text-white/75 lg:flex"><button onClick={() => onNavigate("home")}>الرئيسية</button><button onClick={() => onNavigate("properties")}>العقارات</button><button onClick={() => onNavigate("collections")}>المجموعات</button><button onClick={() => onNavigate("services")}>الخدمات</button><button onClick={() => onNavigate("contact")}>تواصل</button></nav>
        <div className="relative flex items-center gap-3">
          {user ? <button onClick={() => setAccountOpen(value => !value)} title="الحساب" aria-expanded={accountOpen} className="flex items-center gap-2 rounded-full border border-primary/45 bg-primary/10 px-2 py-1 text-primary"><span className="grid h-9 w-9 place-items-center rounded-full font-[family-name:var(--font-display)] text-lg">{initial}</span><ChevronDown className="h-4 w-4" /></button> : null}
          <button onClick={onMenu} className="lg:hidden" aria-label="القائمة"><Menu /></button>
          {user && accountOpen && <div className="absolute left-0 top-14 w-72 rounded-2xl border border-primary/20 bg-[#111412] p-4 text-right shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 border-b border-white/[.08] pb-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-lg font-bold text-black">{initial}</span><div className="min-w-0"><p className="truncate font-bold text-white">{user.name}</p><p className="truncate text-xs text-white/55">{user.email}</p></div></div>
            <div className="mt-3 space-y-1"><button onClick={openFavorites} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/75 transition hover:bg-white/[.06] hover:text-primary"><Heart className="h-4 w-4" />العقارات المفضلة</button>{user.role === "admin" && <button onClick={() => { setAccountOpen(false); onAdmin(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/75 transition hover:bg-white/[.06] hover:text-primary"><Settings className="h-4 w-4" />لوحة الإدارة</button>}<button onClick={() => { setAccountOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-rose-200/80 transition hover:bg-rose-300/10"><LogOut className="h-4 w-4" />تسجيل الخروج</button></div>
          </div>}
        </div>
      </div>
    </header>
  </>;
}

export function AccountIcon() { return <UserCircle className="h-4 w-4" />; }

export default MainHeader;
