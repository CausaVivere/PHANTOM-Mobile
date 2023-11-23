import { Text } from "@geist-ui/core";
import {
  Calendar,
  BookOpen,
  Home,
  PieChart,
  Settings,
  LogOut,
  Target,
  Users,
} from "@geist-ui/icons";
import type { Icon } from "@geist-ui/icons";
import Link from "next/link";
import { api } from "~/utils/api";

export default function Sidebar() {
  const { data: numbers } = api.rooms.count.useQuery();
  const menu: MenuItem[] = [
    {
      name: "Principal",
      links: [
        { label: "Statistici", path: "/", icon: PieChart },
        {
          label: "Camere",
          path: "/rooms",
          badge: String(numbers) + " libere" || "0 libere",
          icon: Home,
        },
        {
          label: "Rezervări",
          path: "/reservations",
          badge: "0",
          icon: Calendar,
        },
        { label: "Agendă", path: "/agenda", icon: BookOpen },
      ],
    },
    {
      name: "Personal",
      links: [
        { label: "Sarcini", path: "/tasks", icon: Target },
        { label: "Angajați", path: "/employees", icon: Users },
      ],
    },
    {
      name: "Setări",
      links: [
        { label: "Setări", path: "/settings", icon: Settings },
        { label: "Deconectare", path: "/log-out", icon: LogOut },
      ],
    },
  ];
  return (
    <div className="flex min-h-screen w-[320px] flex-auto flex-shrink-0 flex-col antialiased">
      <div className="fixed left-0 top-0 flex h-full w-64 w-[320px] flex-col border-r">
        <div className="flex h-14 items-center justify-center border-b">
          <div className="text-lg font-semibold">Hotel Management</div>
        </div>
        <div className="flex-grow overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col space-y-1 py-4">
            {menu.map((item, i) => (
              <div key={i}>
                <div className="px-5">
                  <div className="flex h-8 flex-row items-center">
                    <div className="text-sm font-light tracking-wide">
                      {item.name}
                    </div>
                  </div>
                </div>
                <div>
                  {item.links.map((link, i) => (
                    <Link
                      href={link.path}
                      key={i}
                      className="relative flex h-11 flex-row items-center border-l-4 border-transparent pr-6  hover:border-indigo-500 hover:bg-gray-50 hover:text-gray-800 focus:outline-none"
                    >
                      <span className="ml-4 inline-flex items-center justify-center">
                        {link.icon && <link.icon className="h-5 w-5" />}
                      </span>
                      <span className="ml-2 truncate text-sm tracking-wide">
                        {link.label}
                      </span>
                      {link.badge && (
                        <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium tracking-wide text-indigo-500">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type MenuItem = {
  name: string;
  links: {
    label: string;
    path: string;
    badge?: string | undefined;
    badgeColor?: string;
    icon: Icon;
  }[];
};
