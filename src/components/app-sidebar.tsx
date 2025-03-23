
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  UserCircle,
  Users,
  LogOut,
  UserCog,
  Blocks,
  ChevronsUpDown,
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/lib/supabase-provider";

interface AppSidebarProps {
  children?: React.ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  const location = useLocation();
  const { supabase } = useSupabase();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full" asChild>
            <SidebarMenuButton variant="outline" size="lg" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback>O</AvatarFallback>
                </Avatar>
                <span className="font-medium">Organization</span>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild className="flex items-center gap-2">
              <Link to="/settings/members">
                <UserCog className="h-4 w-4" /> Manage members
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="flex items-center gap-2">
              <Link to="/settings/integrations">
                <Blocks className="h-4 w-4" /> Integrations
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location.pathname === "/" || location.pathname.includes("/projects")}
                      tooltip="Projects"
                      className="justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Projects</span>
                      </div>
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* This will be filled with projects later */}
                    {children}
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.includes("/teams")}
                  tooltip="Teams"
                >
                  <Link to="/teams">
                    <Users />
                    <span>Teams</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.includes("/settings")}
                  tooltip="Settings"
                >
                  <Link to="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="w-full justify-between" tooltip="Profile">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Profile</span>
                  <span className="text-xs text-muted-foreground">user@example.com</span>
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex flex-row items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium">User</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">user@example.com</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="flex items-center gap-2">
              <Link to="/profile">
                <UserCircle className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
