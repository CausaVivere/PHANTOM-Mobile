import {
  Avatar,
  Badge,
  Modal,
  Button,
  Spacer,
  Text,
  Input,
  Textarea,
  Select,
  useToasts,
  Divider,
} from "@geist-ui/core";
import { Plus } from "@geist-ui/icons";
import { User } from "@prisma/client";
import { Session } from "next-auth/core/types";
import React, {
  BaseSyntheticEvent,
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import { api } from "~/utils/api";

type TaskAddProps = {
  show: boolean;
  setShow: ({ ...props }: any) => void;
  session: Session;
  myUser: User;
};

export default function TaskAdd({
  show,
  setShow,
  session,
  myUser,
}: TaskAddProps) {
  const { data: departments } = api.task.getDepartments.useQuery({
    userDep: myUser.departmentName,
  });
  const [selectedValue, setSelectedValue] = useState<
    string | string[] | undefined
  >();
  const [titleInput, setTitle] = useState<string | undefined>();
  const [descInput, setDesc] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const { setToast } = useToasts();

  const titleError = () =>
    setToast({
      text: "Titlul nu poate fi lasat gol.",
      type: "warning",
    });
  const depError = () =>
    setToast({
      text: "Va rugam selectati un departament.",
      type: "warning",
    });

  const addTask = api.task.addTask.useMutation();

  const utils = api.useContext();
  const handleChange = (value: string | string[]) => {
    setSelectedValue(value);
  };

  const sendHandler = () => {
    if (titleInput === "" || titleInput === undefined) {
      titleError();
    } else if (
      selectedValue === undefined &&
      myUser.departmentName === "Management"
    ) {
      depError();
    } else {
      addTask.mutate({
        department:
          myUser.departmentName === "Management"
            ? (selectedValue as string)
            : myUser.departmentName,
        userId: myUser.id,
        title: titleInput,
        desc: descInput,
      });

      setLoading(true);
    }
  };

  useEffect(() => {
    if (addTask.isSuccess) {
      setTitle("");
      setDesc("");
      setSelectedValue(undefined);
      setLoading(false);
      setShow(false);
    }
  }, [addTask.isSuccess]);

  return (
    <Modal visible={show} onClose={() => setShow(false)}>
      <Modal.Title>Adăugați sarcină</Modal.Title>

      <Divider />
      <Modal.Content width="100%" className="w-full">
        <Text className="text-md" p>
          Titlu:
        </Text>
        <Input
          width="100%"
          placeholder="Ex: Curăță camera 21"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setTitle(e.currentTarget.value);
          }}
          onKeyUp={(e: BaseSyntheticEvent) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            setTitle(e.currentTarget.value as string);
          }}
        />
        {myUser.departmentName === "Management" ? (
          <div>
            <Text className="text-md" p>
              Departament:
            </Text>
            <Select
              value={selectedValue}
              onChange={handleChange}
              placeholder="Alegeți"
            >
              {departments?.map((entry, i) => (
                <Select.Option key={i} value={entry?.name}>
                  {entry?.name}
                </Select.Option>
              ))}
            </Select>{" "}
          </div>
        ) : null}
        <Text className="text-md" p>
          Descriere:
        </Text>
        <Textarea
          width="100%"
          height="120px"
          placeholder="Ex: Clientul a vărsat suc pe covor"
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            setDesc(e.currentTarget.value);
          }}
          onKeyUp={(e: BaseSyntheticEvent) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            setDesc(e.currentTarget.value as string);
          }}
        />
      </Modal.Content>
      <Modal.Action passive onClick={() => setShow(false)}>
        Înapoi
      </Modal.Action>

      <Modal.Action
        onClick={() => {
          if (!loading) sendHandler();
        }}
      >
        {!loading ? <Plus /> : null}
        <Spacer w={0.5} inline />
        {loading ? "Se încarcă" : "Adaugă"}
      </Modal.Action>
    </Modal>
  );
}
