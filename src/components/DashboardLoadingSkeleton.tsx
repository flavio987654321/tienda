export default function DashboardLoadingSkeleton() {
  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden [color-scheme:light]">
      {/* Sidebar skeleton */}
      <aside className="fixed left-0 top-0 h-full w-14 bg-white border-r border-gray-100 flex flex-col z-40">
        <div className="flex items-center h-[61px] px-[15px] border-b border-gray-100">
          <div className="w-6 h-6 rounded-lg bg-gray-200 animate-pulse" />
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center px-3 py-2.5">
              <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-100 space-y-1">
          <div className="flex items-center px-3 py-2">
            <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="flex items-center px-3 py-2">
            <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Contenido skeleton */}
      <main className="ml-14 flex-1 flex flex-col bg-gray-50 overflow-y-auto">
        <div className="flex justify-end px-4 pt-3 pb-0">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="flex-1 p-4 pt-2 space-y-5">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-4 w-56 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          <div className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
