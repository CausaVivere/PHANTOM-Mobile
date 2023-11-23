import {
  Drawer,
  Text,
  Button,
  Input,
  Select,
  Divider,
  Spacer,
} from "@geist-ui/core";
import { Plus, X } from "@geist-ui/icons";
import React, {
  BaseSyntheticEvent,
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import TaskModal from "../modals/taskModal";
import TaskAdd from "../modals/addTaskModal";

import { api } from "~/utils/api";
import { Prisma } from "@prisma/client";
import TaskCard from "../elements/taskCard";
import { UseTRPCMutationResult } from "@trpc/react-query/dist/shared/hooks/types";
import { useSession } from "next-auth/react";
import { Session } from "next-auth/core/types";
import { Capacitor } from "@capacitor/core";

type TaskDrawerProps = {
  setState: ({ ...props }: any) => void;
  notifTask: UseTRPCMutationResult<any, any, any, any>;
  session: Session;
  setMuteWeb: ({ ...props }: any) => void;
};

type Task = Prisma.TaskGetPayload<{
  include: { creator: true; carrier: true };
}>;

// type Departament = Prisma.DepartmentGetPayload<{
//   include: { tasks: { include: { creator: true; carrier: true } } };
// }>;

export default function TasksDrawer({
  setState,
  notifTask,
  session,
  setMuteWeb,
}: TaskDrawerProps) {
  const [show, setShow] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [dm, setDm] = useState<React.JSX.Element | null>(null);
  const [theTask, setTask] = useState<Task | null>(null);
  const [input, setInput] = useState<string | undefined>();
  const [query, setQuery] = useState<string | undefined>();
  const [isSearching, setSearching] = useState(false);
  const [depSelect, setSelectedDep] = useState<string | string[] | undefined>();
  const [statusSelect, setStatus] = useState<string | string[] | undefined>();

  const [index, setIndex] = useState(0);
  const scrollHeight = useRef<number | null>(null);
  const [tasks, setTasks] = useState<Array<Task>>([]);
  let tasksdiv: HTMLElement | null;

  const utils = api.useContext();

  const { data: myuser } = api.user.get.useQuery({
    userId: session?.user.id,
  });

  const tasksQuery = api.task.get.useInfiniteQuery(
    {
      department: depSelect as string,
      userDep: myuser?.departmentName as string,
      status: statusSelect as string,
      input: query,
      limit: 15,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const { data: depNames } = api.task.getDepartments.useQuery({
    userDep: myuser?.departmentName as string,
  });

  const { data: bookmarkTasks } = api.task.getBookmarked.useQuery({
    userId: session.user.id,
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (notifTask.data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access , @typescript-eslint/no-unsafe-argument
      setTask(notifTask.data);
      setShow(true);
    }
  }, [notifTask.data]);

  useEffect(() => {
    if (Capacitor.getPlatform() === "web")
      if (dm) setMuteWeb("true");
      else setMuteWeb("false");
  }, [dm]);

  api.task.onAddTask.useSubscription(
    { department: myuser?.departmentName as string },
    {
      onData(task) {
        if (tasks && !isSearching) {
          if (
            task.departmentName === depSelect ||
            depSelect === "" ||
            !depSelect
          ) {
            if (
              task.status === statusSelect ||
              statusSelect === "" ||
              !statusSelect
            ) {
              setTasks([task, ...tasks]);
              void utils.task.get.invalidate();
              void utils.task.getTaskStatus.invalidate();
              void utils.task.getModalTask.invalidate();
            }
          }
        }
      },
      onError(err) {
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.task.onDeleteTask.useSubscription(
    { department: myuser?.departmentName as string },
    {
      onData(task) {
        if (tasks) {
          if (
            task.departmentName === depSelect ||
            depSelect === "" ||
            !depSelect
          ) {
            if (
              task.status === statusSelect ||
              statusSelect === "" ||
              !statusSelect
            ) {
              setTasks(tasks.filter((sometask) => sometask.id !== task.id));
              void utils.task.get.invalidate();
              void utils.task.getTaskStatus.invalidate();
              void utils.task.getModalTask.invalidate();
              void utils.task.getBookmarked.invalidate();
            }
          }
        }
      },
      onError(err) {
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  api.task.taskUpdates.useSubscription(
    { department: myuser?.departmentName as string },
    {
      onData(task) {
        const newtasks = tasks;
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i]?.id === task.id) {
            newtasks[i] = task;
          }
        }

        if (bookmarkTasks)
          for (let i = 0; i < bookmarkTasks.length; i++) {
            if (bookmarkTasks[i]?.id === task.id) {
              void utils.task.getBookmarked.invalidate();
            }
          }

        setTasks(newtasks);
        void utils.task.getTaskStatus.invalidate();
        void utils.task.getModalTask.invalidate();
      },
      onError(err) {
        // we might have missed a message - invalidate cache
        // utils.post.infinite.invalidate();
      },
    }
  );

  useEffect(() => {
    tasksdiv = document.getElementById("tasks");
    handleScroll();
    tasksdiv?.addEventListener("scroll", handleScroll);
    return () => {
      tasksdiv?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    console.log("tasks", isSearching);
    if (tasksQuery.data && !tasksQuery.isFetchingNextPage)
      if (index === 0 && !isSearching) {
        for (let i = 0; i < tasksQuery.data.pages.length; i++) {
          tasks.push(...tasksQuery.data.pages[i]!.tasks);
        }
        setTasks([...tasks]);
      } else if (index > 0 && !isSearching) {
        tasksQuery.data.pages[index]?.tasks
          ? tasks
            ? setTasks(tasks.concat(tasksQuery.data.pages[index]!.tasks))
            : setTasks(tasksQuery.data.pages[index]!.tasks)
          : null;
      } else if (tasksQuery.data) {
        console.log(" ");
        tasksQuery.data.pages[index]?.tasks
          ? setTasks(tasksQuery.data.pages[index]!.tasks)
          : null;
      } else setTasks([]);
    tasksdiv = document.getElementById("tasks");
  }, [
    tasksQuery.isSuccess,
    tasksQuery.isFetchingNextPage,
    depSelect,
    statusSelect,
    query,
  ]);

  useEffect(() => {
    setIndex(0);
    if (input === "") setTasks([]);

    const timeOutId = setTimeout(() => setQuery(input), 300);
    if (input === "" || input === undefined) {
      setSearching(false);
    } else {
      setSearching(true);
    }

    return () => clearTimeout(timeOutId);
  }, [input]);

  const depChange = (value: string | string[]) => {
    setIndex(0);
    setTasks([]);
    setSelectedDep(value);
  };

  const statusChange = (value: string | string[]) => {
    setIndex(0);
    setTasks([]);
    setStatus(value);
  };
  // const utils = api.useContext();

  const handleScroll = () => {
    tasksdiv = document.getElementById("tasks");
    const scrollPosition = tasksdiv?.scrollTop; // => scroll position

    if (tasksdiv)
      if (
        tasksdiv.scrollTop > tasksdiv.scrollHeight - 865 &&
        !tasksQuery.isLoading &&
        !tasksQuery.isFetchingNextPage
      ) {
        scrollHeight.current = tasksdiv.scrollHeight;

        setIndex(tasksQuery.data ? tasksQuery.data.pages.length : index + 1);
        void tasksQuery.fetchNextPage();
      }
  };

  return (
    <div>
      <div
        className={
          dm
            ? "hidden"
            : "w-98 mx-5 flex h-full max-h-screen flex-col overflow-auto"
        }
        onScroll={() => handleScroll()}
        id="tasks"
      >
        <div
          id="title"
          className="my-5 items-center justify-center text-center text-2xl"
        >
          Sarcini
        </div>
        <Input
          width="100%"
          marginTop={1}
          placeholder="Caută"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setInput(e.currentTarget.value);
          }}
          onKeyUp={(e: BaseSyntheticEvent) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            setInput(e.currentTarget.value as string);
          }}
        />
        <div className="flex max-w-md flex-col ">
          {myuser?.departmentName === "Management" ? (
            <Select
              value={depSelect}
              onChange={depChange}
              placeholder="Departament"
              marginTop={0.5}
            >
              <Select.Option value="">Toate</Select.Option>
              {depNames?.map((entry, i) => (
                <Select.Option key={i} value={entry?.name}>
                  {entry?.name}
                </Select.Option>
              ))}
            </Select>
          ) : null}
          <Select
            value={statusSelect}
            onChange={statusChange}
            placeholder="Status"
            marginTop={0.5}
          >
            <Select.Option value="">Toate</Select.Option>
            <Select.Option value={"awaiting"}>Nepreluata</Select.Option>
            <Select.Option value={"in_progress"}>In progres</Select.Option>
            <Select.Option value={"complete"}>Realizata</Select.Option>
          </Select>
        </div>
        {/* <div className="absolute right-0 top-0 m-4">
        <Button
          iconRight={<X />}
          auto
          onClick={() => {
            setState(() => ({ tasks: false }));
          }}
          px={0.6}
          scale={2 / 3}
        />
      </div> */}
        <div
          className={
            Capacitor.getPlatform() === "ios"
              ? "absolute left-0 top-4 z-30 m-4"
              : "absolute left-0 top-0 z-30 m-4"
          }
        >
          <Button
            iconRight={<Plus />}
            auto
            onClick={() => {
              setShowAdd(true);
            }}
            px={0.6}
            scale={2 / 3}
          />
        </div>
        <div id="content" className="flex flex-col gap-4 py-3">
          <div className="flex flex-col gap-4">
            {isSearching ? (
              <Divider>
                <Text small>Rezultate</Text>
              </Divider>
            ) : (
              <Divider>
                <Text small>Salvate</Text>
              </Divider>
            )}
            {!isSearching
              ? bookmarkTasks?.map((task, i) => (
                  <div key={i}>
                    {myuser ? (
                      <TaskCard
                        setShow={setShow}
                        setTask={setTask}
                        task={task}
                        myuser={myuser}
                      />
                    ) : null}
                  </div>
                ))
              : null}
          </div>

          {!isSearching ? (
            <Divider>
              <Text small>{depSelect}</Text>
            </Divider>
          ) : null}
          <div className="flex flex-col gap-4">
            {tasks.map((task, i) => (
              <div key={i}>
                {myuser ? (
                  <TaskCard
                    setShow={setShow}
                    setTask={setTask}
                    task={task}
                    myuser={myuser}
                    key={i}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div>
            {theTask && myuser ? (
              <TaskModal
                task={theTask}
                show={show}
                setShow={setShow}
                setDm={setDm}
                setParentState={setState}
                myUser={myuser}
                session={session}
              />
            ) : null}
          </div>
          <div>
            {myuser ? (
              <TaskAdd
                myUser={myuser}
                session={session}
                show={showAdd}
                setShow={setShowAdd}
              />
            ) : null}
          </div>
        </div>
        <Spacer h={1} />
      </div>

      {dm}
    </div>
  );
}
