"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between safe-pt">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">{title ?? "TradieMate"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notifications">
            <Bell className="w-5 h-5" />
          </Link>
        </Button>
        <UserButton  />
      </div>
    </header>
  );
}
