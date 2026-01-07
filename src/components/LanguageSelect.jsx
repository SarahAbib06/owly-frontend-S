// src/components/LanguageSelect.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export default function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const options = [
    { label: t("parametresGeneral.English"), value: "en", flag: "🇬🇧" },
    { label: t("parametresGeneral.French"), value: "fr", flag: "🇫🇷" }
  ];

  const handleSelect = (value) => {
    i18n.changeLanguage(value);
    setOpen(false);
  };

  const currentOption = options.find(opt => opt.value === i18n.language);

  return (
    <div className="relative w-60">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full bg-white dark:bg-[#2E2F2F] border border-gray-300 dark:border-gray-600 p-3 rounded-md text-myBlack dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">{currentOption?.flag}</span>
          {currentOption?.label}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 w-full bg-white dark:bg-[#2E2F2F] border border-gray-300 dark:border-gray-600 mt-1 rounded-md shadow-lg z-50 overflow-hidden"
          >
            {options.map((opt) => {
              const isSelected = i18n.language === opt.value;
              
              return (
                <motion.div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center justify-between
                    text-myBlack dark:text-white
                    ${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{opt.flag}</span>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-4 h-4 text-[#F9EE34]" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}