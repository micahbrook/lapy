import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">TradieMate</span>
      </div>
      {children}
      <p className="mt-8 text-xs text-gray-500 text-center">
        Built for Australian tradies · ABN-ready · WHS compliant
      </p>
    </div>
  );
}
