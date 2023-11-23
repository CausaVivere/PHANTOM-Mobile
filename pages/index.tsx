import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import {
  GeistProvider,
  CssBaseline,
  Button,
  useTheme,
  useToasts,
  Loading,
} from "@geist-ui/core";
import ProgressBar from "~/components/progress";
import Sidebar from "~/components/sidebar";
import ThemeButton from "~/components/buttons/themeButton";
import { api } from "~/utils/api";

import "nprogress/nprogress.css";
import BottomNav from "~/components/bottombar";
import { useEffect, useRef, useState } from "react";
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
import CompleteProfile from "./completeProfile";
import { Capacitor } from "@capacitor/core";

type homeprops = {
  setMode: ({ ...props }: any) => void;
};

export default function Home({ setMode }: homeprops) {
  const { data: session, status } = useSession();

  const [isComplete, setComplete] = useState(true);

  const myUser = api.user.getMutation.useMutation();

  const setToken = api.user.setToken.useMutation();

  const [pages, setPage] = useState("messages");
  const { setToast } = useToasts();

  const theme = useTheme();

  const statusUpdate = api.user.updateStatus.useMutation();

  const notifConv = api.chat.getSomeConvMutation.useMutation();

  const task = api.task.getSomeTask.useMutation();

  const utils = api.useContext();

  const [muteWeb, setMuteWeb] = useState("false");

  const msgAudioRef = useRef<HTMLAudioElement>(null);

  const newMsgPlay = () => {
    const muteNotifs =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("muteNotifs") === "false" ||
          localStorage.getItem("muteNotifs") === "true"
          ? localStorage.getItem("muteNotifs")
          : "false"
        : "false";
    if (msgAudioRef?.current && muteWeb === "false" && muteNotifs === "false") {
      void msgAudioRef.current.play();
    }
  };

  const taskAudioRef = useRef<HTMLAudioElement>(null);

  const newTaskPlay = () => {
    const muteNotifs =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("muteNotifs") === "false" ||
          localStorage.getItem("muteNotifs") === "true"
          ? localStorage.getItem("muteNotifs")
          : "false"
        : "false";
    if (taskAudioRef?.current && muteNotifs === "false") {
      void taskAudioRef.current.play();
    }
  };

  api.chat.onSendMessage.useSubscription(
    {
      userId: session?.user.id as string,
    },
    {
      onData(msg) {
        if (pages !== "messages") void utils.chat.getConvs.reset();
        if (
          Capacitor.getPlatform() === "web" &&
          msg.from_userId !== session?.user.id
        )
          newMsgPlay();
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.task.onAddTask.useSubscription(
    {
      department: myUser?.data?.departmentName as string,
    },
    {
      onData(task) {
        if (
          Capacitor.getPlatform() === "web" &&
          task.creatorId !== session?.user.id
        )
          newTaskPlay();
      },
      onError(err) {
        console.error("Subscription error:", err);
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.task.onAddTask.useSubscription(
    { department: myUser?.data?.departmentName as string },
    {
      onData(task) {
        if (pages !== "tasks") void utils.task.get.reset();
      },
      onError(err) {
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.task.onDeleteTask.useSubscription(
    { department: myUser?.data?.departmentName as string },
    {
      onData(task) {
        if (pages !== "tasks") void utils.task.get.reset();
      },
      onError(err) {
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  useEffect(() => {
    console.log(session);
    myUser.mutate({
      userId: session?.user.id as string,
    });
  }, [session]);

  useEffect(() => {
    if (session?.user)
      statusUpdate.mutate({
        userId: session.user.id,
        status: "online",
      });
  }, [pages]);

  useEffect(() => {
    if (session?.user) {
      statusUpdate.mutate({
        userId: session.user.id,
        status: "online",
      });
      register();

      void PushNotifications.checkPermissions().then((res) => {
        if (res.receive !== "granted") {
          void PushNotifications.requestPermissions().then((res) => {
            if (res.receive === "denied") {
              setToast({
                text: "Accesul la notificări a fost respins.",
                type: "error",
              });
            } else {
              setToast({
                text: "Accesul la notificări a fost acceptat.",
                type: "success",
              });
              register();
            }
          });
        } else {
          register();
        }
      });
      void LocalNotifications.requestPermissions();
    }
  }, [session]);

  const register = () => {
    console.log("Initializing HomePage");

    // Register with Apple / Google to receive push via APNS/FCM
    void PushNotifications.register();

    void PushNotifications.removeAllDeliveredNotifications();

    // On success, we should be able to receive notifications
    void PushNotifications.addListener("registration", (token: Token) => {
      // void showToast("Push registration success" + token.value);
      console.log("TOKEN ", token.value);
      console.info("TOKEN ", token.value);
      // if (myUser?.notificationToken !== token.value)
      setToken.mutate({
        userId: session?.user.id as string,
        token: token.value,
      });
    });

    // Some issue with our setup and push will not work
    void PushNotifications.addListener("registrationError", (error: any) => {
      alert("Error on registration: " + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    void PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.info(
          "NOTIFICATION: ",
          LocalNotifications.areEnabled(),
          LocalNotifications.checkPermissions(),
          notification.data.type // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        );

        if (
          notification.data.type === "task" // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        )
          void LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Math.random() * 2000000),
                title: notification.title!,
                body: notification.body!,
                iconColor: myUser?.data?.colors[0],
                channelId: "phantom-mobile-foreground",
                extra: notification.data, // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
              },
            ],
          });
        else if (
          getActiveConvId() !== notification.data.convId // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        )
          void LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Math.random() * 2000000),
                title: notification.title!,
                body: notification.body!,
                iconColor: myUser?.data?.colors[0],
                channelId: "phantom-mobile-foreground",
                extra: notification.data, // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
              },
            ],
          });
      }
    );

    // Method called when tapping on a notification
    void PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification: ActionPerformed) => {
        console.log(notification.actionId);
        if (notification.actionId === "tap") {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (notification.notification.data.type === "dm") {
            setPage("messages");
            notifConv.mutate({
              userId: session?.user.id as string,
              convId: notification.notification.data.convId, // eslint-disable-line @typescript-eslint/no-unsafe-member-access , @typescript-eslint/no-unsafe-assignment
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          } else if (notification.notification.data.type === "task") {
            setPage("tasks");
            task.mutate({ id: notification.notification.data.taskId }); // eslint-disable-line @typescript-eslint/no-unsafe-member-access , @typescript-eslint/no-unsafe-assignment
          }
        }
      }
    );

    void LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (notification: LocalActionPerformed) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (notification.notification.extra.type === "dm") {
          setPage("messages");
          notifConv.mutate({
            userId: session?.user.id as string,
            convId: notification.notification.extra.convId, // eslint-disable-line @typescript-eslint/no-unsafe-member-access , @typescript-eslint/no-unsafe-assignment
          });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (notification.notification.extra.type === "task") {
          setPage("tasks");
          task.mutate({ id: notification.notification.extra.taskId }); // eslint-disable-line @typescript-eslint/no-unsafe-member-access , @typescript-eslint/no-unsafe-assignment
        }
      }
    );

    const newForeGround: LocalChannel = {
      id: "phantom-mobile-foreground",
      name: "Phantom Mobile foreground notifications",
      description:
        "Handles notifications which appear in the foreground while using the app.",
      sound: "local.wav",
      importance: 5,
      visibility: 0,
      lights: true,
      lightColor: "#9b34eb",
      vibration: true,
    };

    void LocalNotifications.createChannel(newForeGround);

    const dmChannel: Channel = {
      id: "phantom-mobile-dm",
      name: "Phantom Mobile messages notifications",
      description:
        "Handles notifications for direct messages from other users or groups.",
      sound: "message.wav",
      importance: 4,
      visibility: 0,
      lights: true,
      lightColor: "#9b34eb",
      vibration: true,
    };

    void PushNotifications.createChannel(dmChannel);

    const taskChannel: Channel = {
      id: "phantom-mobile-tasks",
      name: "Phantom Mobile task notifications",
      description: "Handles notifications for tasks.",
      sound: "task.wav",
      importance: 5,
      visibility: 1,
      lights: true,
      lightColor: "#ed113d",
      vibration: true,
    };

    void PushNotifications.createChannel(taskChannel);
  };

  useEffect(() => {
    if (myUser.data) {
      if (!myUser.data.tag || !myUser.data.phone_number) {
        setComplete(false);
      } else {
        setComplete(true);
      }
    }
  }, [myUser]);

  if (status === "loading") {
    return (
      <div
        style={{ backgroundColor: theme.palette.background }}
        className="flex min-h-screen items-center justify-center"
      >
        <Loading>Loading</Loading>
      </div>
    );
  } else if (!session?.user.id) {
    // Handle unauthenticated state, e.g. render a SignIn component

    return <SignIn />;
  } else if (!isComplete)
    return <CompleteProfile myuser={myUser} session={session} />;
  else
    return (
      <SessionProvider session={session}>
        <ProgressBar />
        <CssBaseline />
        <div
          style={{ backgroundColor: theme.palette.background }}
          className={
            Capacitor.getPlatform() === "ios"
              ? "my-4 min-h-screen"
              : "min-h-screen"
          }
        >
          {/* <ThemeButton mode={mode} setMode={setMode} /> */}
          <div
            className={
              Capacitor.getPlatform() === "ios"
                ? "absolute right-0 top-4 z-50 m-4"
                : "absolute right-0 top-0 z-50 m-4"
            }
          >
            <Button
              icon={<Settings />}
              auto
              onClick={() => {
                setMuteWeb("false");
                setPage("settings");
              }}
              px={0.6}
              scale={2 / 3}
            />
          </div>
          <div className="flex flex-col">
            {pages === "agenda" ? (
              <AgendaDrawer
                setMuteWeb={setMuteWeb}
                session={session}
                setState={setPage}
              />
            ) : null}
            {pages === "messages" ? (
              <MessagesDrawer
                page={pages}
                session={session}
                setState={setPage}
                notifConv={notifConv}
                setMuteWeb={setMuteWeb}
              />
            ) : null}
            {pages === "tasks" ? (
              <TasksDrawer
                setMuteWeb={setMuteWeb}
                session={session}
                setState={setPage}
                notifTask={task}
              />
            ) : null}
            {pages === "settings" ? (
              <SettingsPage
                session={session}
                setMode={setMode}
                mode={theme.type}
              />
            ) : null}
            <div
              className={
                Capacitor.getPlatform() === "ios"
                  ? theme.type === "dark"
                    ? "fixed bottom-4 z-30 flex h-fit w-full items-center justify-center bg-gray-900"
                    : "fixed bottom-4 z-30 flex h-fit w-full items-center justify-center bg-gray-200"
                  : theme.type === "dark"
                  ? "fixed bottom-0 z-30 flex h-fit w-full items-center justify-center bg-gray-900"
                  : "fixed bottom-0 z-30 flex h-fit w-full items-center justify-center bg-gray-200"
              }
            >
              <BottomNav pages={pages} setPage={setPage} />
            </div>
          </div>
          {Capacitor.getPlatform() === "web" ? (
            <div>
              <audio
                ref={msgAudioRef}
                className="hidden"
                src="https://razvan-hotel-app-bucket.s3.eu-central-1.amazonaws.com/phantom-mobile+essentials/message.wav"
              />
              <audio
                ref={taskAudioRef}
                className="hidden"
                src="https://razvan-hotel-app-bucket.s3.eu-central-1.amazonaws.com/phantom-mobile+essentials/task.wav"
              />
            </div>
          ) : null}
        </div>
      </SessionProvider>
    );
}
