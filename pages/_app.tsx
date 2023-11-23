import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import {
  GeistProvider,
  CssBaseline,
  Button,
  useTheme,
  useToasts,
} from "@geist-ui/core";
import ProgressBar from "~/components/progress";
import Sidebar from "~/components/sidebar";
import ThemeButton from "~/components/buttons/themeButton";
import { api } from "~/utils/api";

import "~/styles/globals.css";
import "nprogress/nprogress.css";
import BottomNav from "~/components/bottombar";
import { useEffect, useState } from "react";
import AgendaDrawer from "~/components/drawers/agenda";
import MessagesDrawer from "~/components/drawers/messages";
import TasksDrawer from "~/components/drawers/tasks";
import { Settings } from "@geist-ui/icons";
import SettingsPage from "./settings";
import {
  PushNotificationSchema,
  PushNotifications,
  Token,
  ActionPerformed,
  Channel,
} from "@capacitor/push-notifications";
import {
  LocalNotifications,
  LocalNotificationSchema,
  ActionPerformed as LocalActionPerformed,
  Channel as LocalChannel,
} from "@capacitor/local-notifications";
import { getActiveConvId } from "~/components/drawers/directMessage";
import SignIn from "./api/auth/pages/sign-in";
import Home from ".";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const savedMode =
    typeof window !== "undefined" && window.localStorage
      ? localStorage.getItem("theme")
      : undefined;
  const [mode, setMode] = useState(savedMode ? savedMode : "dark");
  const theme = useTheme();
  return (
    <SessionProvider session={session}>
      <GeistProvider themeType={mode}>
        <ProgressBar />
        <CssBaseline />
        {/* <ThemeButton mode={mode} setMode={setMode} /> */}
        <div style={{ backgroundColor: theme.palette.background }}>
          <Home setMode={setMode} />
        </div>
      </GeistProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
