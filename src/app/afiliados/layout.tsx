import TermsUpdateBanner from "@/components/TermsUpdateBanner";
import AfiliadosNav from "./AfiliadosNav";

export default function AfiliadosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AfiliadosNav />
      <div className="px-4 pt-3 max-w-5xl mx-auto"><TermsUpdateBanner /></div>
      {children}
    </>
  );
}
