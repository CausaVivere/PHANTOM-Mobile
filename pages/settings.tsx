import { Card, Text, useTheme } from "@geist-ui/core";
import {
  Bell,
  BellOff,
  LogOut,
  Moon,
  Sun,
  User,
  Volume2,
  VolumeX,
} from "@geist-ui/icons";
import { Session } from "next-auth/core/types";
import { signOut } from "next-auth/react";
import { useState } from "react";
import ChatSettings from "~/components/modals/chatSettings";

type settingsProps = {
  mode: string;
  setMode: ({ ...props }: any) => void;
  session: Session;
};

export default function SettingsPage({
  mode,
  setMode,
  session,
}: settingsProps) {
  const [showSettings, setSettings] = useState(false);

  const savedMuteSounds =
    typeof window !== "undefined" && window.localStorage
      ? localStorage.getItem("muteSounds")
      : undefined;
  const [muteSounds, setMuteSounds] = useState(
    savedMuteSounds ? savedMuteSounds : "false"
  );

  const savedMuteNotifs =
    typeof window !== "undefined" && window.localStorage
      ? localStorage.getItem("muteNotifs")
      : undefined;
  const [muteNotifs, setMuteNotifs] = useState(
    savedMuteNotifs ? savedMuteNotifs : "false"
  );

  const theme = useTheme();

  return (
    <div>
      <div className={showSettings ? "hidden" : "z-40"}>
        <div
          id="title"
          className="my-5 items-center justify-center text-center text-2xl"
        >
          Setări
        </div>

        <div id="content">
          <div className="mx-3 flex flex-col gap-2">
            <Card
              className="flex cursor-pointer flex-row"
              onClick={() => {
                if (mode === "dark") {
                  setMode("light");
                  if (typeof window !== "undefined" && window.localStorage)
                    localStorage.setItem("theme", "light");
                } else {
                  setMode("dark");
                  if (typeof window !== "undefined" && window.localStorage)
                    localStorage.setItem("theme", "dark");
                }
              }}
            >
              <div className="mx-2 flex flex-row items-center gap-4">
                {mode === "dark" ? <Moon size={25} /> : <Sun size={25} />}
                <div>Schimbă tema</div>
              </div>
            </Card>
            <Card
              className="flex cursor-pointer flex-row"
              onClick={() => {
                window.history.pushState(null, "", window.location.pathname);
                setSettings(true);
              }}
            >
              <div className="mx-2 flex flex-row items-center gap-4">
                <User size={25} />
                <div>Setări profil și mesagerie</div>
              </div>
            </Card>
            <Card
              className="flex cursor-pointer flex-row"
              onClick={() => {
                if (muteSounds === "false") {
                  setMuteSounds("true");
                  if (typeof window !== "undefined" && window.localStorage)
                    localStorage.setItem("muteSounds", "true");
                } else {
                  setMuteSounds("false");
                  if (typeof window !== "undefined" && window.localStorage)
                    localStorage.setItem("muteSounds", "false");
                }
              }}
            >
              <div className="mx-2 flex flex-row items-center gap-4">
                {muteSounds === "false" ? (
                  <Volume2 size={25} />
                ) : (
                  <VolumeX size={25} />
                )}
                <div>
                  {muteSounds === "false"
                    ? "Dezactivați efectele sonore"
                    : "Activați efectele sonore"}
                </div>
              </div>
            </Card>
            <Card
              className="flex cursor-pointer flex-row"
              onClick={() => {
                if (muteNotifs === "false") {
                  setMuteNotifs("true");
                  if (typeof window !== "undefined" && window.localStorage)
                    localStorage.setItem("muteNotifs", "true");
                } else {
                  setMuteNotifs("false");
                  if (typeof window !== "undefined" && window.localStorage)
                    localStorage.setItem("muteNotifs", "false");
                }
              }}
            >
              <div className="mx-2 flex flex-row items-center gap-4">
                {muteNotifs === "false" ? (
                  <Bell size={25} />
                ) : (
                  <BellOff size={25} />
                )}
                <div>
                  {muteNotifs === "false"
                    ? "Dezactivați sunetele de notificare"
                    : "Activați sunetele de notificare"}
                </div>
              </div>
            </Card>
            <Card
              className="flex cursor-pointer flex-row"
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={async () => {
                void (await signOut({ redirect: false }));
                window.location.reload();
              }}
            >
              <div className="mx-2 flex flex-row items-center gap-4">
                <LogOut size={25} />
                <div>Deconectare</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <div className="z-50">
        {showSettings ? (
          <ChatSettings
            session={session}
            show={showSettings}
            setShow={setSettings}
          />
        ) : null}
      </div>
    </div>
  );
}
