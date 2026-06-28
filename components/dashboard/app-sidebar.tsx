"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Phone,
  BookOpen,
  Settings,
  LogOut,
  ChevronsUpDown,
  User2,
} from "lucide-react";
import { SaralLogoMark } from "@/assets/logo/logo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  {
    title: "Main",
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "Leads",
        url: "/dashboard/leads",
        icon: Users,
      },
      {
        title: "Call Logs",
        url: "/dashboard/calls",
        icon: Phone,
      },
      {
        title: "Knowledge Base",
        url: "/dashboard/faqs",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "General",
    items: [
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (url: string, exact?: boolean) => {
    if (exact) return pathname === url;
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      {/* Logo / Brand */}
      <SidebarHeader className="border-b border-border/60 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12 rounded-lg px-2 text-[#555555] bg-transparent hover:bg-[#f5a623] hover:text-black transition-colors duration-150">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <SaralLogoMark size={28} fill="#000000" className="shrink-0" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight text-base" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
                    Saral AI
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Voice AI Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="py-2">
        {navItems.map((group) => (
          <SidebarGroup key={group.title} className="px-2 py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pb-1">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.url, item.exact);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className="h-9 rounded-lg px-3 text-sm font-medium text-[#555555] bg-transparent hover:bg-[#f5a623] hover:text-black data-[active=true]:bg-transparent data-[active=true]:text-[#555555] data-[active=true]:hover:bg-[#f5a623] data-[active=true]:hover:text-black transition-colors duration-150"
                      >
                        <Link href={item.url} className="flex items-center gap-2.5">
                          <item.icon className="size-4 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer — user menu */}
      <SidebarFooter className="border-t border-border/60 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-10 rounded-lg px-2 data-[state=open]:bg-muted"
                >
                  <Avatar className="size-7 rounded-lg shrink-0">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback className="rounded-lg bg-foreground text-background text-xs font-semibold">
                      SA
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                    <span className="truncate font-semibold text-sm">Admin</span>
                    <span className="truncate text-xs text-muted-foreground">
                      admin@saral.ai
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-52 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2">
                  <User2 className="size-4 text-muted-foreground" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
