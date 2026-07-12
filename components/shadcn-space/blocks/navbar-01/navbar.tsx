"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { SaralLogoMark } from "@/assets/logo/logo";
import { ArrowUpRight, TextAlignJustify } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type NavigationSection = {
  title: string;
  href: string;
};

const navigationData: NavigationSection[] = [
  { title: "How it works", href: "#how-it-works" },
  { title: "Features", href: "#features" },
  { title: "Product", href: "#product" },
  { title: "Use cases", href: "#use-cases" },
  { title: "FAQ", href: "#faq" },
];

const SaralLogo = ({ sticky }: { sticky: boolean }) => (
  <a
    href="#"
    className={cn(
      "flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight transition-colors duration-300 hover:opacity-90",
      sticky ? "text-[var(--color-text-primary)]" : "text-white"
    )}
  >
    <SaralLogoMark size={32} fill={sticky ? "#000000" : "#ffffff"} />
    <span style={{ fontFamily: 'var(--font-garamond), "ITC Garamond Book Narrow", Georgia, serif' }}>
      Saral AI
    </span>
  </a>
);

const GetStartedButton = ({ className }: { className?: string }) => (
  <a href="/login" className="inline-block">
    <Button className={cn("relative text-sm font-medium rounded-full h-10 p-1 ps-5 pe-12 group transition-all duration-500 hover:ps-12 hover:pe-5 w-fit overflow-hidden bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] hover:bg-[var(--color-dark-bg)]/90 border-0 shadow-sm cursor-pointer", className)}>
      <span className="relative z-10 transition-all duration-500 hover:cursor-pointer">
        Get started
      </span>
      <div className="absolute right-1.5 w-7 h-7 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-34px)] group-hover:rotate-45">
        <ArrowUpRight size={14} className="stroke-[2.5]" />
      </div>
    </Button>
  </a>
);

const Navbar = () => {
  const [sticky, setSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Products");
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const handleScroll = useCallback(() => {
    setSticky(window.scrollY >= 50);
  }, []);

  const handleResize = useCallback(() => {
    if (window.innerWidth >= 768) setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleScroll, handleResize]);

  const currentSpotlight = hoveredNav ?? activeNav;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-300 w-full py-4">
      <div className="max-w-[1160px] mx-auto w-full px-4 md:px-8">
        <nav
          className={cn(
            "w-full flex items-center h-fit justify-between gap-3.5 lg:gap-6 transition-all duration-500",
            sticky
              ? "px-5 py-2.5 bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] rounded-full"
              : "bg-transparent border-transparent"
          )}
        >
          <SaralLogo sticky={sticky} />

          <div>
            <NavigationMenu className={cn("max-lg:hidden p-0.5 rounded-full transition-colors duration-300 border-0", 
              sticky ? "bg-[var(--color-surface-alt)]" : "bg-white/10 backdrop-blur-xs"
            )}>
              <NavigationMenuList className="flex gap-0" onMouseLeave={() => setHoveredNav(null)}>
                {navigationData.map((navItem) => {
                  const isSpotlight = navItem.title === currentSpotlight;
                  return (
                    <NavigationMenuItem key={navItem.title}>
                      <NavigationMenuLink
                        href={navItem.href}
                        onMouseEnter={() => setHoveredNav(navItem.title)}
                        onClick={() => setActiveNav(navItem.title)}
                        className={cn(
                          "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-300 tracking-normal cursor-pointer border-0 select-none",
                          isSpotlight 
                            ? (sticky 
                              ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs" 
                              : "bg-white text-[#1a1a1a] shadow-xs")
                            : (sticky 
                              ? "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" 
                              : "bg-transparent text-white/80 hover:text-white")
                        )}
                      >
                        {navItem.title}
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <GetStartedButton className="hidden lg:flex" />

          <div className="lg:hidden">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger className={cn(
                "rounded-full border p-2.5 outline-none flex items-center justify-center cursor-pointer transition-all duration-300",
                sticky 
                  ? "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              )}>
                <TextAlignJustify size={20} />
                <span className="sr-only">Menu</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1.5 shadow-md"
              >
                {navigationData.map((item) => (
                  <DropdownMenuItem key={item.title} className="rounded-lg">
                    <a href={item.href} className="w-full cursor-pointer text-sm font-medium text-[var(--color-text-primary)]">{item.title}</a>
                  </DropdownMenuItem>
                ))}
                <div className="border-t border-[var(--color-border)] my-1.5 pt-1.5 px-1">
                  <a href="/login" className="flex items-center justify-center w-full bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] text-xs font-semibold py-2 rounded-full hover:opacity-90 transition-opacity">
                    Get started
                  </a>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
