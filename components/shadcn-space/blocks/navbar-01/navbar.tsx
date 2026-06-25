"use client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { ArrowUpRight, TextAlignJustify } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type NavigationSection = {
  title: string;
  href: string;
};

const navigationData: NavigationSection[] = [
  { title: "Products", href: "#" },
  { title: "Services", href: "#" },
  { title: "Apps", href: "#" },
  { title: "Pricing", href: "#" },
  { title: "About", href: "#" },
];

const SaralLogo = ({ sticky }: { sticky: boolean }) => (
  <a
    href="#"
    className={cn(
      "flex items-center gap-2 font-display text-2xl font-bold tracking-tight transition-colors duration-300 hover:opacity-90",
      sticky ? "text-[var(--color-text-primary)]" : "text-white"
    )}
  >
    <svg
      width="26"
      height="36"
      viewBox="0 0 26 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-colors duration-300", sticky ? "text-[var(--color-text-primary)]" : "text-white")}
    >
      <path
        d="m7.25 10.86 6 3.366 6-3.367m-12 20.176v-6.721l-6-3.367m24 0-6 3.367v6.72M1.61 14.42l11.64 6.54 11.64-6.54M13.25 34V20.947m12 5.18v-10.36c0-.454-.124-.9-.358-1.293a2.63 2.63 0 0 0-.975-.947l-9.333-5.18a2.73 2.73 0 0 0-2.667 0l-9.333 5.18a2.63 2.63 0 0 0-.976.947 2.54 2.54 0 0 0-.358 1.293v10.36c0 .454.124.9.358 1.293s.57.72.976.947l9.333 5.18a2.73 2.73 0 0 0 2.667 0l9.333-5.18a2.63 2.63 0 0 0 .975-.947 2.53 2.53 0 0 0 .358-1.293"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span>Saral AI</span>
  </a>
);

const GetStartedButton = ({ className }: { className?: string }) => (
  <Button className={cn("relative text-sm font-medium rounded-full h-10 p-1 ps-5 pe-12 group transition-all duration-500 hover:ps-12 hover:pe-5 w-fit overflow-hidden bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] hover:bg-[var(--color-dark-bg)]/90 border-0 shadow-sm cursor-pointer", className)}>
    <span className="relative z-10 transition-all duration-500 hover:cursor-pointer">
      Get started
    </span>
    <div className="absolute right-1.5 w-7 h-7 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-34px)] group-hover:rotate-45">
      <ArrowUpRight size={14} className="stroke-[2.5]" />
    </div>
  </Button>
);

const Navbar = () => {
  const [sticky, setSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
            <NavigationMenu className={cn("max-lg:hidden p-0.5 rounded-full border transition-colors duration-300", 
              sticky ? "bg-[var(--color-surface-alt)] border-[var(--color-border)]" : "bg-white/10 border-white/10 backdrop-blur-xs"
            )}>
              <NavigationMenuList className="flex gap-0">
                {navigationData.map((navItem) => {
                  const isActive = navItem.title === "Products";
                  return (
                    <NavigationMenuItem key={navItem.title}>
                      <NavigationMenuLink
                        href={navItem.href}
                        className={cn(
                          "px-4 py-1.5 text-sm font-medium rounded-full transition duration-300 tracking-normal border cursor-pointer",
                          isActive 
                            ? (sticky 
                              ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] shadow-xs" 
                              : "bg-white text-[var(--color-text-primary)] border-white shadow-xs")
                            : (sticky 
                              ? "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] hover:border-[var(--color-border)] border-transparent" 
                              : "text-white/80 hover:text-white hover:bg-white/10 hover:border-white/10 border-transparent")
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
                  <a href="#get-started" className="flex items-center justify-center w-full bg-[var(--color-dark-bg)] text-[var(--color-dark-text)] text-xs font-semibold py-2 rounded-full hover:opacity-90 transition-opacity">
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
