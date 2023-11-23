import { Card, Divider, Input, Modal, Spacer, useToasts } from "@geist-ui/core";
import { api } from "~/utils/api";
import AvatarWithStatus from "../avatar";
import { BaseSyntheticEvent, ChangeEvent, useEffect, useState } from "react";
import { Checkbox, CheckboxFill, Send } from "@geist-ui/icons";
import { Message, Prisma, User } from "@prisma/client";
import { set } from "nprogress";
import { Session } from "next-auth/core/types";

type forwardprops = {
  showMenu: boolean;
  setMenu: ({ ...props }: any) => void;
  myUser: User;
  msg: Message;
  conv: Conversation;
  session: Session;
};

type Conversation = Prisma.ConversationGetPayload<{
  include: { members: { select: { user: true } } };
}>;

export default function ForwardModal({
  showMenu,
  setMenu,
  myUser,
  msg,
  conv,
  session,
}: forwardprops) {
  const [input, setInput] = useState<string | undefined>();
  const [query, setQuery] = useState<string | undefined>();
  const [isSearching, setSearching] = useState(false);
  const [people, setPeople] = useState<Array<Conversation>>([]);
  const { setToast } = useToasts();
  const [results, setResults] =
    useState<Array<(User & object) | Conversation>>();
  const [loading, setLoading] = useState<boolean>(false);
  const utils = api.useContext();

  let persons = [...people];
  let index = 0;
  const { data: contacts, isFetched } = api.agenda.get.useQuery({
    userId: session?.user.id,
    input: query,
    limit: 6,
  });
  const { data: convs } = api.chat.getConvsForwards.useQuery({
    userId: myUser.id,
    take: 5,
  });
  const { data: groups, isSuccess } = api.chat.getGroupsWithUser.useQuery({
    userId: myUser.id,
    input: query,
    take: 5,
  });

  const { data: member } = api.group.getMember.useQuery({
    userId: session?.user.id,
    convId: conv.id,
  });
  const theconv = api.chat.getConvForwards.useMutation();
  const send = api.chat.sendForwards.useMutation();

  useEffect(() => {
    setPeople(persons);
  }, [convs]);

  useEffect(() => {
    const newarray: Array<(User & object) | Conversation> = [];
    if (contacts && groups)
      setResults(
        newarray
          .concat(
            contacts.users.filter(
              (user) =>
                user.id !== "system" &&
                !user.blocked.includes(myUser.id) &&
                !myUser.blocked.includes(user.id)
            )!
          )
          .concat(groups.filter((conv) => conv.blocked.length < 1))
      ); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
  }, [groups, contacts]);

  useEffect(() => {
    void utils.chat.getLastMessage.invalidate();
    persons = [];
    setPeople([]);
    theconv.data = null;
    setLoading(false);
    if (send.isSuccess) setMenu(false);
  }, [send.isSuccess]);

  useEffect(() => {
    if (theconv.data != null && theconv.data != undefined) {
      persons.push(theconv.data!); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
      setPeople(persons);

      setInput("");
    }
  }, [theconv.isSuccess]);

  useEffect(() => {
    const timeOutId = setTimeout(() => setQuery(input), 300);
    if (input === "" || input === undefined) {
      setSearching(false);
    } else {
      setSearching(true);
    }

    return () => clearTimeout(timeOutId);
  }, [input]);

  const sendHandler = () => {
    if (people.length > 0) {
      send.mutate({
        people: people,
        userId: myUser.id,
        memberId: member!.id,
        originalUserId: msg.from_userId,
        msg: msg.message ? msg.message : "",
        media: msg.media,
      });
      setLoading(true);
    } else
      setToast({
        text: "Vă rugăm să selectați cel puțin un contact.",
        type: "warning",
      });
  };

  const convHandler = (contactId: string) => {
    theconv.mutate({
      userId: session?.user.id,
      contactId: contactId,
    });
  };

  return (
    <Modal
      visible={showMenu}
      onClose={() => {
        setMenu(false);
        persons = [];
        setPeople([]);
        theconv.data = null;
      }}
      className="flex"
    >
      <div className="flex h-fit flex-wrap gap-2 overflow-y-scroll px-1 py-1 text-xs">
        {people?.map((conv, i) => (
          <div
            className="flex h-6 flex-col justify-center gap-1 rounded-lg p-2  outline  outline-1 outline-offset-1 outline-gray-500"
            key={i}
          >
            {getUser(conv, myUser)?.name}{" "}
          </div>
        ))}
      </div>
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
      <Divider className="absolute top-2 w-full" />
      <Modal.Content className="flex h-full w-full flex-col gap-3 overflow-y-scroll">
        {isSearching
          ? results?.map((contact, i) => (
              <Card
                className="cursor-pointer"
                key={i}
                onClick={() => {
                  if (isUser(contact)) {
                    if (findConvByUserId(convs!, contact.id)! != null) {
                      persons.includes(findConvByUserId(convs!, contact.id)!)
                        ? (index = persons.indexOf(
                            findConvByUserId(convs!, contact.id)!
                          )) && index === 0
                          ? (persons = [])
                          : persons?.splice(index, 1)
                        : persons.push(findConvByUserId(convs!, contact.id)!);
                      setPeople(persons);
                      setInput("");
                    } else {
                      convHandler(contact.id);
                    }
                  } else {
                    persons.includes(findConvById(convs!, contact.id)!)
                      ? (index = persons.indexOf(
                          findConvById(convs!, contact.id)!
                        )) && index === 0
                        ? (persons = [])
                        : persons?.splice(index, 1)
                      : persons.push(findConvById(convs!, contact.id)!);
                    setPeople(persons);
                    setInput("");
                  }
                }}
              >
                <div className="flex flex-row gap-4 ">
                  <div>
                    {contact ? (
                      isUser(contact) ? (
                        persons.includes(
                          findConvByUserId(convs!, contact.id)!
                        ) ? (
                          <CheckboxFill size={32} />
                        ) : (
                          <Checkbox size={32} />
                        )
                      ) : persons.includes(
                          findConvById(convs!, contact.id)!
                        ) ? (
                        <CheckboxFill size={32} />
                      ) : (
                        <Checkbox size={32} />
                      )
                    ) : null}
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
                    <div className="text-lg font-semibold">
                      {contact ? contact.name : null}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          : convs?.map((contact, i) => (
              <Card
                className="cursor-pointer"
                key={i}
                onClick={() => {
                  persons.includes(contact)
                    ? (index = persons.indexOf(contact)) && index === 0
                      ? (persons = [])
                      : persons?.splice(index, 1)
                    : persons.push(contact);
                  setPeople(persons);
                }}
              >
                <div className="flex flex-row items-center gap-4">
                  <div>
                    {persons.includes(contact) ? (
                      <CheckboxFill size={32} />
                    ) : (
                      <Checkbox size={32} />
                    )}
                  </div>
                  <div>
                    <AvatarWithStatus
                      contact={convs ? getUser(contact, myUser)! : myUser}
                      interactive={false}
                      w={"40px"}
                      h={"40px"}
                    />
                  </div>
                  <div className="flex w-[70%] flex-col">
                    <div className="text-lg font-semibold">
                      {getUser(contact, myUser)?.name}
                    </div>
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
          theconv.data = null;
        }}
      >
        Închide
      </Modal.Action>
      <Modal.Action
        onClick={() => {
          if (!loading) sendHandler();
        }}
      >
        {!loading ? <Send size={22} /> : null}
        <Spacer w={0.5} inline />
        {loading ? "Se încarcă" : "Trimite"}
      </Modal.Action>
    </Modal>
  );
}

function isUser(obj: User | Conversation): obj is User {
  return "userId" in obj && "email" in obj;
}

function getUser(contact: Conversation, myUser: User) {
  if (contact)
    if (contact.isGroup) {
      return contact;
    } else {
      if (contact.members[0]?.user.id === myUser.id) {
        return contact.members[1]?.user as User;
      } else {
        return contact.members[0]?.user as User;
      }
    }
}

function findConvById(people: Array<Conversation>, id: string) {
  for (let i = 0; i < people.length; i++) {
    if (people[i]?.id == id) {
      return people[i];
    }
  }

  return null;
}

function findConvByUserId(people: Array<Conversation>, userId: string) {
  for (let i = 0; i < people.length; i++) {
    if (
      (people[i]?.members[0]?.user.id === userId && !people[i]?.isGroup) ||
      (people[i]?.members[1]?.user.id === userId && !people[i]?.isGroup)
    ) {
      return people[i];
    }
  }

  return null;
}
