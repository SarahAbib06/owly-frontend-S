import { useState } from "react";
import { conversationsMock } from "../data/conversationsMock.js";
import ConversationItem from "./ConversationItem";
import { SlidersHorizontal, Search, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ConversationList({ onSelect, onNewChat }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const extendedList = [
    ...conversationsMock,
    ...conversationsMock,
    ...conversationsMock,
    ...conversationsMock,
  ];

  const filteredList = extendedList.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="h-screen bg-myWhite dark:bg-neutral-900 flex flex-col">

      {/* ==== HEADER ==== */}
      <div className="px-4 pt-3 sm:px-6 sm:pt-4 sm:pb-2 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Owly
        </h2>
        {/* === BOUTON NOUVELLE DISCUSSION (+) === */}
          <button
            onClick={onNewChat}
            className="
              rounded-xl shrink-0
             
              text-yellow-500
              bg-[#f0f0f0] dark:bg-[#2E2F2F]
              hover:bg-gray-200 dark:hover:bg-neutral-700
              transition
               p-2.5 md:p-3
            "
            title="Nouvelle discussion"
          >
            <Plus size={18} />
          </button>




      </div>

      {/* ==== BARRE DE RECHERCHE ==== */}
      <div className="px-4 sm:px-6 pt-2 pb-4">
        <div className="flex items-center gap-3 w-full min-w-0">

          {/* Search Input */}
          <div
            className="
              flex items-center gap-3 flex-1 min-w-0
              bg-[#f0f0f0] dark:bg-[#2E2F2F]
              rounded-xl px-3
              h-9 md:h-10
            "
          >
            <Search size={18} className="text-gray-400 shrink-0" />

            <input
              type="text"
              placeholder={t("messages.searchFriends")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                flex-1 min-w-0 bg-transparent outline-none text-sm
                placeholder-gray-500 dark:placeholder-gray-400
              "
            />
          </div>

          

          {/* Filter Button */}
          <button
            className="
              rounded-xl shrink-0
              bg-[#f0f0f0] dark:bg-[#2E2F2F]
              hover:bg-gray-200 dark:hover:bg-neutral-700
              p-2.5 md:p-3
            "
          >
            <SlidersHorizontal
              size={18}
              className="text-gray-600 dark:text-gray-300"
            />
          </button>

        </div>
      </div>

      {/* ==== LISTE SCROLLABLE ==== */}
      <div className="px-2 pb-28 md:pb-6 overflow-y-auto space-y-2 md:space-y-2.5 conv-scroll">
        {filteredList.map((c, index) => (
          <div
            key={c.id + index}
            onClick={() => {
              setSelectedId(c.id);
              onSelect(c);
            }}
          >
            <ConversationItem {...c} selected={selectedId === c.id} />
          </div>
        ))}
      </div>

    </aside>
  );
}
