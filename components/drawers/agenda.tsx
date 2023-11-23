import {
  Card,
  Drawer,
  Text,
  Modal,
  Spacer,
  Button,
  Badge,
  Input,
  Select,
} from "@geist-ui/core";
import { ChevronRight, MessageCircle, Plus, Slash, X } from "@geist-ui/icons";
import {
  useState,
  useEffect,
  ChangeEvent,
  BaseSyntheticEvent,
  useRef,
} from "react";
import UserInfoModal from "../modals/userInfoModal";
import { User } from "@prisma/client";
import { api } from "~/utils/api";
import AvatarWithStatus from "../avatar";
import { Session } from "next-auth/core/types";
import { Capacitor } from "@capacitor/core";

type AgendaDrawerProps = {
  setState: ({ ...props }: any) => void;
  session: Session;
  setMuteWeb: ({ ...props }: any) => void;
};

export default function AgendaDrawer({
  setState,
  session,
  setMuteWeb,
}: AgendaDrawerProps) {
  const [show, setShow] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [dm, setDm] = useState<React.JSX.Element | null>(null);
  const [theContact, setContact] = useState<User | null>(null);
  const [input, setInput] = useState<string | undefined>();
  const [query, setQuery] = useState<string | undefined>();
  const [depSelect, setSelectedDep] = useState<string | string[] | undefined>();

  const [index, setIndex] = useState(0);
  const scrollHeight = useRef<number | null>(null);
  const [contacts, setContacts] = useState<Array<User>>([]);
  let usersdiv: HTMLElement | null;

  const { data: myUser } = api.user.get.useQuery({
    userId: session?.user.id,
  });

  const users = api.agenda.get.useInfiniteQuery(
    {
      userId: session?.user.id,
      input: query,
      dep: depSelect as string,
      limit: 15,
    },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const { data: departments } = api.task.getDepartments.useQuery({
    userDep: myUser?.departmentName as string,
  });

  useEffect(() => {
    usersdiv = document.getElementById("users");
    handleScroll();
    usersdiv?.addEventListener("scroll", handleScroll);
    return () => {
      usersdiv?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (Capacitor.getPlatform() === "web")
      if (dm) setMuteWeb("true");
      else setMuteWeb("false");
  }, [dm]);

  useEffect(() => {
    if (users.data && users.isSuccess && !users.isFetchingNextPage) {
      if (query && query !== "" && myUser) {
        users.data.pages[index]?.users
          ? setContacts(
              users.data.pages[index]!.users.filter(
                (user) =>
                  user.id !== "system" &&
                  !user.blocked.includes(myUser.id) &&
                  user.id !== myUser.id
              )!
            )
          : null;
      } else if (depSelect !== "" && myUser) {
        users.data.pages[index]?.users
          ? setContacts(
              users.data.pages[index]!.users.filter(
                (user) =>
                  user.id !== "system" &&
                  !user.blocked.includes(myUser.id) &&
                  user.id !== myUser.id
              )!
            )
          : null;
      } else if (users.data && myUser) {
        if (users.data.pages.length > index && index === 0) {
          console.log(contacts);
          for (let i = 0; i < users.data.pages.length; i++) {
            contacts.push(...users.data.pages[i]!.users);
          }
          setContacts([
            ...contacts.filter(
              (user) =>
                user.id !== "system" &&
                !user.blocked.includes(myUser.id) &&
                user.id !== myUser.id
            )!,
          ]);
        } else {
          users.data.pages[index]?.users
            ? contacts || index === 0
              ? setContacts(
                  contacts.concat(
                    users.data.pages[index]!.users.filter(
                      (user) =>
                        user.id !== "system" &&
                        !user.blocked.includes(myUser.id) &&
                        user.id !== myUser.id
                    )!
                  )
                )
              : setContacts(
                  users.data.pages[index]!.users.filter(
                    (user) =>
                      user.id !== "system" &&
                      !user.blocked.includes(myUser.id) &&
                      user.id !== myUser.id
                  )!
                )
            : null;
        }
      } else setContacts([]);
    }
    usersdiv = document.getElementById("users");
  }, [users.isSuccess, users.isFetchingNextPage, depSelect, query]);

  useEffect(() => {
    setIndex(0);

    if (input === "") setContacts([]);

    const timeOutId = setTimeout(() => setQuery(input), 300);

    return () => clearTimeout(timeOutId);
  }, [input]);

  const depChange = (value: string | string[]) => {
    setIndex(0);
    setSelectedDep(value);
  };

  const handleScroll = () => {
    usersdiv = document.getElementById("users");
    const scrollPosition = usersdiv?.scrollTop; // => scroll position

    if (usersdiv)
      if (
        usersdiv.scrollTop > usersdiv.scrollHeight - 865 &&
        !users.isLoading &&
        !users.isFetchingNextPage
      ) {
        scrollHeight.current = usersdiv.scrollHeight;

        setIndex(users.data ? users.data.pages.length : index + 1);
        void users.fetchNextPage();
      }
  };

  return (
    <div>
      <div
        className={
          dm
            ? "hidden"
            : "w-98 mx-5 flex h-full max-h-screen  flex-col overflow-auto"
        }
        onScroll={() => handleScroll()}
        id="users"
      >
        <div
          id="title"
          className="my-5 items-center justify-center text-center text-2xl"
        >
          Agendă
        </div>
        <Input
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setInput(e.currentTarget.value);
          }}
          onKeyUp={(e: BaseSyntheticEvent) => {
            setInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          }}
          width="100%"
          marginTop={1}
          placeholder="Caută"
        />
        <div className="flex flex-row gap-2">
          <Select
            placeholder="Departament"
            marginTop={0.5}
            value={depSelect}
            onChange={depChange}
          >
            <Select.Option value="">Toate</Select.Option>
            {departments?.map((entry, i) => (
              <Select.Option key={i} value={entry.name}>
                {entry.name}
              </Select.Option>
            ))}
          </Select>
        </div>
        {/* <div className="absolute left-0 top-0 m-4">
        <Button
          iconRight={<Plus />}
          auto
          onClick={() => {
            setShowAdd(true);
          }}
          px={0.6}
          scale={2 / 3}
        />
      </div> */}

        <div id="content" className="flex flex-col gap-4 py-3">
          {contacts?.map((contact, i) => (
            <Card
              className="cursor-pointer"
              key={i}
              onClick={() => {
                setContact(contact);
                window.history.pushState(null, "", window.location.pathname);
                setShow(true);
              }}
            >
              <div className="flex flex-row gap-2">
                <div className="grid items-center">
                  <AvatarWithStatus
                    contact={contact}
                    interactive={false}
                    w={"50px"}
                    h={"50px"}
                  />
                </div>
                <div className="flex w-[70%] flex-col">
                  <div className="text-lg font-semibold">{contact.name}</div>
                  <div className="text-sm">
                    {limit(contact.departmentName + " / " + contact.role, 25)}
                  </div>
                </div>
                <div className="relative right-0 flex items-center">
                  <ChevronRight />
                </div>
              </div>
            </Card>
          ))}
          <div>
            {theContact ? (
              <UserInfoModal
                contact={theContact}
                show={show}
                setShow={setShow}
                setDm={setDm}
                page={"agenda"}
                session={session}
              />
            ) : null}
          </div>
          <div>
            <Modal
              height="90vh"
              visible={showAdd}
              onClose={() => setShowAdd(false)}
            >
              <Modal.Title>Adaugă contact</Modal.Title>
              <Modal.Content className="overflow-y-scroll">
                <Text className="text-md" p>
                  Nume:
                </Text>
                <Input width="100%" placeholder="Ex: Trifan" />
                <Text className="text-md" p>
                  Prenume:
                </Text>
                <Input width="100%" placeholder="Ex: Lucian" />
                <Text className="text-md" p>
                  Imagine profil:
                </Text>
                <input
                  type="file"
                  accept="image/*"
                  width="100%"
                  placeholder=""
                />
                <Text className="text-md" p>
                  Număr telefon:
                </Text>
                <Input width="100%" />
                <Text className="text-md" p>
                  Departament:
                </Text>
                <Select placeholder="Alegeți">
                  <Select.Option value="1">Toate</Select.Option>
                  <Select.Option value="2">Cameriste</Select.Option>
                  <Select.Option value="3">Management</Select.Option>
                  <Select.Option value="4">Curatenie</Select.Option>
                </Select>
                <Text className="text-md" p>
                  Post:
                </Text>
                <Select placeholder="Alegeți">
                  <Select.Option value="1">Camerist</Select.Option>
                  <Select.Option value="2">Inginer</Select.Option>
                  <Select.Option value="3">Casier</Select.Option>
                  <Select.Option value="4">Ospatar</Select.Option>
                </Select>
              </Modal.Content>
              <Modal.Action passive onClick={() => setShowAdd(false)}>
                Înapoi
              </Modal.Action>

              <Modal.Action>
                <Plus />
                <Spacer w={0.5} inline />
                Adaugă
              </Modal.Action>
            </Modal>
          </div>
        </div>
        <Spacer h={3} />
      </div>
      {dm}
    </div>
  );
}

function limit(string = "", limit = 0) {
  if (string.length >= limit) {
    return string.substring(0, limit) + "....";
  } else {
    return string.substring(0, limit);
  }
}
