import {
  Avatar,
  Button,
  Card,
  Divider,
  Input,
  Modal,
  Spacer,
  useToasts,
  Text,
} from "@geist-ui/core";
import { api } from "~/utils/api";
import AvatarWithStatus from "../avatar";
import { BaseSyntheticEvent, ChangeEvent, useEffect, useState } from "react";
import {
  ArrowLeftCircle,
  ArrowRight,
  Checkbox,
  CheckboxFill,
  Emoji,
  Plus,
  UserPlus,
} from "@geist-ui/icons";
import { Prisma, User } from "@prisma/client";
import { Session } from "next-auth/core/types";

type Conversation = Prisma.ConversationGetPayload<{
  include: {
    members: { include: { user: true } };
  };
}>;

type addmembersprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;
  myUser: User;
  conv: Conversation;
  session: Session;
};
let inputValue: string | undefined;
export default function AddMembersModal({
  showMenu,
  setMenu,
  myUser,
  conv,
  session,
}: addmembersprops) {
  const [input, setInput] = useState<string | undefined>();

  const [query, setQuery] = useState<string | undefined>();

  const [people, setPeople] = useState<Array<User>>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();

  const utils = api.useContext();

  let persons = [...people];
  let index = 0;
  const { data: contacts } = api.agenda.get.useQuery({
    userId: session.user.id,
    input: query,
    limit: 10,
  });

  const { data: membersIds } = api.group.getIds.useQuery({
    convId: conv?.id,
  });

  const addMembers = api.group.addMembers.useMutation();

  useEffect(() => {
    const timeOutId = setTimeout(() => setQuery(input), 300);

    return () => clearTimeout(timeOutId);
  }, [input]);

  const addHandler = () => {
    const theUsers: Array<string> = [];
    if (people && people.length > 0)
      for (let i = 0; i < people.length; i++) {
        theUsers.push(people[i]!.id);
      }

    addMembers.mutate({
      convId: conv.id,
      users: theUsers,
    });
    setLoading(true);
  };

  useEffect(() => {
    if (addMembers.isSuccess) {
      persons = [];
      setPeople([]);
      setLoading(false);
      setMenu(false);
    }
  }, [addMembers.isSuccess]);

  return (
    <Modal
      visible={showMenu}
      onClose={() => {
        setMenu(false);
        persons = [];
        setPeople([]);
      }}
      className="flex h-fit"
    >
      <div>
        <div className="flex h-fit flex-wrap gap-2 overflow-y-scroll px-1 py-1 text-xs">
          {people?.map((contact, i) => (
            <div
              className="flex h-6 flex-col justify-center gap-1 rounded-lg p-2 outline  outline-1 outline-offset-1 outline-gray-500"
              key={i}
            >
              {contact?.name}
            </div>
          ))}
        </div>
        <div className="py-2">
          <Input
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setInput(e.currentTarget.value);
            }}
            onKeyUp={(e: BaseSyntheticEvent) => {
              setInput(e.currentTarget.value as string); // eslint-disable-line @typescript-eslint/no-unsafe-member-access
            }}
            value={input}
            width="100%"
            marginTop={1}
            placeholder="Caută"
          />
        </div>
        <Divider className="absolute top-2 w-full" />
      </div>

      <Modal.Content className="flex h-full w-full flex-col gap-3 overflow-y-scroll">
        {contacts?.users
          .filter(
            (user) =>
              user.id !== "system" &&
              !user.blocked.includes(myUser.id) &&
              !membersIds?.includes(user.id) &&
              !myUser.blocked.includes(user.id)
          )
          .map((contact, i) => (
            <Card
              className="cursor-pointer"
              key={i}
              onClick={() => {
                isChecked(persons, contact.id)
                  ? (index = persons.indexOf(findUser(persons, contact.id)!)) &&
                    index === 0
                    ? (persons = [])
                    : persons?.splice(index, 1)
                  : persons.push(contact) && setInput("");

                setPeople(persons);
              }}
            >
              <div className="flex flex-row items-center gap-4">
                <div>
                  {isChecked(persons, contact.id) ? (
                    <CheckboxFill size={32} />
                  ) : (
                    <Checkbox size={32} />
                  )}
                </div>
                <div>
                  <AvatarWithStatus
                    contact={contact}
                    interactive={false}
                    w={"40px"}
                    h={"40px"}
                  />
                </div>
                <div className="flex w-[70%] flex-col">
                  <div className="text-lg font-semibold">{contact?.name}</div>
                </div>
              </div>
            </Card>
          ))}
      </Modal.Content>
      <Modal.Action
        passive
        onClick={() => {
          setMenu(false);
          persons = [];
          setPeople([]);
        }}
      >
        Închide
      </Modal.Action>

      <Modal.Action
        onClick={() => {
          if (!loading)
            people.length > 0
              ? addHandler()
              : setToast({
                  text: "Selectează cel puțin o persoană.",
                  type: "warning",
                });
        }}
      >
        {!loading ? <UserPlus size={22} /> : null}
        <Spacer w={0.5} inline />
        {loading ? "Se încarcă" : "Adaugă membrii"}
      </Modal.Action>
    </Modal>
  );
}

function isChecked(people: Array<User>, userId: string) {
  for (let i = 0; i < people.length; i++) {
    if (people[i]?.id === userId) {
      return true;
    }
  }

  return false;
}

function findUser(people: Array<User>, userId: string) {
  for (let i = 0; i < people.length; i++) {
    if (people[i]?.id === userId) {
      return people[i];
    }
  }

  return null;
}
