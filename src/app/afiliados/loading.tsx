import { Loader2 } from "lucide-react";

export default function VendedorasLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );
}
