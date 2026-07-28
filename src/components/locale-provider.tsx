"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Locale = "zh" | "en";
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: (zh: string, en: string) => string }>({ locale: "zh", setLocale: () => undefined, t: (zh) => zh });
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale,setLocaleState]=useState<Locale>("zh");
  useEffect(()=>{const saved=localStorage.getItem("locale");if(saved==="en")setLocaleState("en")},[]);
  function setLocale(next:Locale){setLocaleState(next);localStorage.setItem("locale",next);document.documentElement.lang=next==="zh"?"zh-CN":"en";}
  return <LocaleContext.Provider value={{locale,setLocale,t:(zh,en)=>locale==="zh"?zh:en}}>{children}</LocaleContext.Provider>;
}
export function useLocale(){return useContext(LocaleContext)}
