// src/components/ThemeSelect.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Check, ChevronDown } from "lucide-react";

export default function ThemeSelect() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const html = document.documentElement;
    setTheme(html.classList.contains("dark") ? "dark" : "light");
  }, []);

  const handleSelect = (value) => {
    const html = document.documentElement;
    if (value === "dark") {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setTheme(value);
    setOpen(false);
  };

  const options = [
    { 
      label: t("parametresGeneral.LightMode"), 
      value: "light", 
      icon: Sun,
      iconColor: "text-yellow-400"
    },
    { 
      label: t("parametresGeneral.DarkMode"), 
      value: "dark", 
      icon: Moon,
      iconColor: "text-gray-200"
    }
  ];

  const currentOption = options.find(opt => opt.value === theme);
  const CurrentIcon = currentOption?.icon;

  return (
    <div className="relative w-60">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full bg-white dark:bg-[#2E2F2F] border border-gray-300 dark:border-gray-600 p-3 rounded-md text-myBlack dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          {CurrentIcon && <CurrentIcon className={`w-5 h-5 ${currentOption?.iconColor}`} />}
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
              const isSelected = theme === opt.value;
              const Icon = opt.icon;
              
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
                    <Icon className={`w-5 h-5 ${opt.iconColor}`} />
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