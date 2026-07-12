"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Phone,
  BookOpen,
  LogOut,
  ChevronsUpDown,
  User2,
  Bot,
} from "lucide-react";
import { SaralLogoMark } from "@/assets/logo/logo";
import { createClient } from "@/utils/supabase/client";

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
    title: "Clinic",
    items: [
      {
        title: "Call Logs",
        url: "/dashboard/calls",
        icon: Phone,
      },
      {
        title: "Case Cards",
        url: "/dashboard/leads",
        icon: Users,
      },
      {
        title: "Clinic FAQ/Config",
        url: "/dashboard/faqs",
        icon: BookOpen,
      },
      {
        title: "Agents",
        url: "/dashboard/agents",
        icon: Bot,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState("admin@saral.ai");
  const [businessName, setBusinessName] = useState("Admin");

  const isActive = (url: string) => pathname.startsWith(url);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUser(session: any) {
      if (!session?.access_token) return;
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          if (user) {
            setEmail(user.email || "admin@saral.ai");
            setBusinessName(user.business_name || "Admin");
          }
        }
      } catch (err) {
        console.error("Failed to load user info in sidebar", err);
      }
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUser(session);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUser(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      {/* Logo / Brand */}
      <SidebarHeader className="border-b border-border/60 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12 rounded-lg px-2 text-[#555555] bg-transparent hover:bg-[#f5a623] hover:text-black transition-colors duration-150">
              <Link href="/dashboard/calls" className="flex items-center gap-2.5" aria-label="Saral AI Clinic Voice AI">
                <SaralLogoMark size={28} fill="#000000" className="shrink-0" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight text-base" style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
                    Saral AI
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Clinic Voice AI
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
                  const active = isActive(item.url);
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

      {/* Footer - user menu */}
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
                    <AvatarImage src="" alt={businessName} />
                    <AvatarFallback className="rounded-lg bg-foreground text-background text-xs font-semibold">
                      {businessName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                    <span className="truncate font-semibold text-sm">{businessName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {email}
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
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
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
