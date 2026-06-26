"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Bell, Search } from "lucide-react";

const breadcrumbMap: Record<string, { label: string; parent?: string }> = {
  "/dashboard": { label: "Overview" },
  "/dashboard/leads": { label: "Leads", parent: "Overview" },
  "/dashboard/calls": { label: "Call Logs", parent: "Overview" },
  "/dashboard/faqs": { label: "Knowledge Base", parent: "Overview" },
  "/dashboard/settings": { label: "Settings", parent: "Overview" },
};

export function SiteHeader() {
  const pathname = usePathname();
  const current = breadcrumbMap[pathname] ?? { label: "Dashboard" };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4">
      {/* Left side: trigger + breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {current.parent && (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    {current.parent}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm font-medium">
                {current.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center: Search bar */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 text-sm bg-muted/40 border-border/50 focus-visible:ring-1 focus-visible:ring-ring/30 rounded-lg"
          />
        </div>
      </div>

      {/* Right side: Icons cluster */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Bell className="size-4" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-blue-500" />
        </Button>

        {/* User Avatar */}
        <Avatar className="size-7 ml-1 cursor-pointer ring-1 ring-border/50 hover:ring-border transition-all">
          <AvatarImage src="" alt="Admin" />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            SA
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
