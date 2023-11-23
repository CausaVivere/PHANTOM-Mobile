import { Card } from "@geist-ui/core";
import AvatarWithStatus from "../avatar";
import {
  ArrowRightCircle,
  Bookmark,
  CheckCircle,
  MessageCircle,
  Slash,
} from "@geist-ui/icons";
import moment from "moment";
import { Prisma, User } from "@prisma/client";
import { api } from "~/utils/api";
import { useState } from "react";

type Task = Prisma.TaskGetPayload<{
  include: { creator: true; carrier: true };
}>;

type taskcardprops = {
  setTask: ({ ...props }: any) => void;
  setShow: ({ ...props }: any) => void;
  task: Task;
  myuser: User;
};

export default function TaskCard({
  setTask,
  setShow,
  task,
  myuser,
}: taskcardprops) {
  const status = api.task.getTaskStatus.useQuery({ id: task.id });

  return (
    <Card
      className="cursor-pointer"
      onClick={() => {
        console.log(task.creatorId, myuser.id, task.carrierId);
        setTask(task);
        setShow(true);
      }}
    >
      <div className="flex flex-row gap-2">
        <div className={getStatus(status?.data?.status)?.class}></div>
        <div className="grid items-center">
          <AvatarWithStatus
            contact={
              status?.data?.carrier ? status?.data?.carrier : task.creator
            }
            interactive={false}
            w={"50px"}
            h={"50px"}
          />
        </div>

        <div className="flex w-[70%] flex-col truncate px-2">
          <div className="font-bold">{task.title}</div>
          <div>{task.description}</div>
          <div>{getStatus(status?.data?.status)?.label}</div>
          <div>{task.departmentName}</div>
        </div>

        <div className="relative right-0 ml-auto w-fit flex-col items-center justify-center">
          {myuser ? (
            task.bookmarked.includes(myuser?.id) ? (
              <Bookmark className="absolute right-0 top-0" />
            ) : null
          ) : null}
        </div>
        <div className="relative -bottom-4 -right-2 ml-auto w-fit flex-col items-center py-2 ">
          <div className="absolute bottom-0 right-0 ml-auto truncate py-1 text-sm">
            {String(moment(task.dateAdded).startOf("seconds").fromNow())}
          </div>
        </div>
      </div>
    </Card>
  );
}

function getStatus(status: string | undefined) {
  if (!status)
    return {
      label: "În așteptare",
      class: "relative bottom-0 right-0 w-2 rounded-sm bg-red-500",
      buttons: {
        message: {
          label: "Trimite mesaj",
        },
        action: {
          label: "Preia",
          icon: ArrowRightCircle,
          status: "in_progress",
        },
      },
    };
  switch (status) {
    case "awaiting":
      return {
        label: "În așteptare",
        class: "relative bottom-0 right-0 w-2 rounded-sm bg-red-500",
        buttons: {
          message: {
            label: "Trimite mesaj",
          },
          action: {
            label: "Preia",
            icon: ArrowRightCircle,
            status: "in_progress",
          },
        },
      };
    case "in_progress":
      return {
        label: "În progres",
        class: "relative bottom-0 right-0 w-2 rounded-sm bg-yellow-500",
        buttons: {
          message: {
            label: "Trimite mesaj",
            icon: MessageCircle,
          },
          action: {
            label: "Realizat",
            icon: CheckCircle,
            status: "complete",
          },
        },
      };
    case "complete":
      return {
        label: "Realizată",
        class: "relative bottom-0 right-0 w-2 rounded-sm bg-emerald-500",
        buttons: {
          message: {
            label: "Trimite mesaj",
            icon: MessageCircle,
            handler: () => {
              <></>;
            },
          },
          action: {
            label: "Sterge",
            icon: Slash,
            status: "complete",
          },
        },
      };

    default:
      break;
  }
}
