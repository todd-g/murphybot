"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  FolderOpen,
  Search,
  Clock,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Manage",
      url: "/browse",
      icon: FolderOpen,
      isActive: true,
      items: [
        {
          title: "Browse & Edit",
          url: "/browse",
        },
        {
          title: "Quick Capture",
          url: "/capture",
        },
      ],
    },
    {
      title: "Find",
      url: "/search",
      icon: Search,
      items: [
        {
          title: "Search",
          url: "/search",
        },
        {
          title: "Ask AI",
          url: "/ask",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Activity",
      url: "/activity",
      icon: Clock,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar()

  const handleClick = () => {
    setOpenMobile(false)
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" onClick={handleClick}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="MurphyBot"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MurphyBot</span>
                  <span className="truncate text-xs">Second Brain</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
