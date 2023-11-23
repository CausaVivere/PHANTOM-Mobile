import { useState, useEffect } from "react";
import { Badge, Card, Select } from "@geist-ui/core";
import { api } from "~/utils/api";
import { Home } from "@geist-ui/icons";

export default function RoomsTable({ view }: { view: string }) {
  const [query, setQuery] = useState<string | undefined>();
  const [debouncedQuery, setDebouncedQuery] = useState<string | undefined>();

  const [typeId, setTypeId] = useState<string | string[] | undefined>();
  const [status, setStatus] = useState<string | string[] | undefined>();

  useEffect(() => {
    const timeOutId = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeOutId);
  }, [query]);

  const { data: rooms, isLoading } = api.rooms.get.useQuery({
    number: debouncedQuery,
    status: status as string,
    typeId: typeId as string,
  });
  const { data: types } = api.rooms.getTypes.useQuery();

  return (
    <>
      <label htmlFor="table-search" className="sr-only">
        Search
      </label>
      <div className="relative mt-1 flex w-full items-center gap-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-gray-500 dark:text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            ></path>
          </svg>
        </div>
        <input
          type="text"
          id="table-search"
          className="block w-80 rounded-lg border border-gray-300 bg-gray-50 p-2.5 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500  dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută după numărul camerei"
        />
        <Select
          placeholder="Statusul camerei"
          onChange={(val) => setStatus(val == "" ? undefined : val)}
        >
          <Select.Option value="">Scoate filtru</Select.Option>
          {Object.entries(statuses).map((entry, i) => (
            <Select.Option key={i} value={entry[0]}>
              {entry[1].label}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Tipul camerei"
          onChange={(val) => setTypeId(val == "" ? undefined : val)}
        >
          <Select.Option value="">Scoate filtru</Select.Option>
          {types?.map((type, i) => (
            <Select.Option key={i} value={type.id}>
              {type.typeName}
            </Select.Option>
          ))}
        </Select>
      </div>

      {view === "table" ? (
        <table className="mt-4 w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Etaj
              </th>
              <th scope="col" className="px-6 py-3">
                Număr camera
              </th>
              <th scope="col" className="px-6 py-3">
                Status
              </th>
              <th scope="col" className="px-6 py-3">
                Tip cameră
              </th>
              <th scope="col" className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rooms?.map((room, i) => (
              <tr
                key={i}
                className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white"
                >
                  {room.floor}
                </th>
                <td className="px-6 py-4">{room.number}</td>
                <td className="px-6 py-4">
                  <Badge
                    style={{ backgroundColor: statuses[room.status].color }}
                  >
                    {statuses[room.status].label}
                  </Badge>
                </td>
                <td className="px-6 py-4">{room.type.typeName}</td>
                <td className="px-6 py-4 text-right">
                  <a
                    href="#"
                    className="font-medium text-blue-600 hover:underline dark:text-blue-500"
                  >
                    Modifică
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-8 grid grid-cols-4 gap-4">
          {rooms?.map((room, i) => (
            <Card
              hoverable
              style={{
                backgroundColor: statuses[room.status].color,
                color: "white",
              }}
              className="flex min-h-[140px] flex-col items-center justify-center text-center"
              key={i}
            >
              <div className="flex items-center justify-center">
                <Home />
              </div>
              <div className="font-semibold">
                Camera {room.number}, etajul {room.floor}
              </div>
              <div>{statuses[room.status].label}</div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

const statuses = {
  FREE: { label: "Liberă", color: "#6dce87" },
  OCCUPIED: { label: "Ocupată", color: "#DC3855" },
  RESERVED: { label: "Rezervată", color: "#f4c430" },
  UNPREPARED: { label: "Nepregătită", color: "#734f96" },
  CLEANING: { label: "In proces de curățare", color: "#0095c6" },
  SERVICEABLE: { label: "Necesită curățenie", color: "#577340" },
};
