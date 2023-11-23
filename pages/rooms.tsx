import { Badge, Button, Table, Text } from "@geist-ui/core";
import RoomsTable from "~/components/rooms_table";
import { useState, useEffect } from "react";
import { Grid, List } from "@geist-ui/icons";

export default function Rooms() {
  const [view, setView] = useState<string | undefined>();

  useEffect(() => {
    const vw = localStorage.getItem("roomsView");
    if (!vw) {
      localStorage.setItem("roomsView", "table");
    } else {
      setView(vw);
    }
  }, []);

  useEffect(() => {
    view && localStorage.setItem("roomsView", view);
  }, [view]);

  function changeView() {
    if (view === "table") {
      setView("grid");
    } else {
      setView("table");
    }
  }
  return (
    <>
      <div className="w-full">
        <div className="mb-8 flex gap-2">
          <Button>Adaugă cameră</Button>
          <Button
            width="content"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            className="flexitems-center justify-center"
            type="warning-light"
            onClick={changeView}
          >
            {view === "table" ? (
              <List className="h-5 w-5" />
            ) : (
              <Grid className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="relative mt-8 overflow-x-auto sm:rounded-lg">
          {view && <RoomsTable view={view} />}
        </div>
      </div>
    </>
  );
}
