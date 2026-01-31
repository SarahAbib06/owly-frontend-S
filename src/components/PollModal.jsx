// frontend/src/components/PollModal.jsx
import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Lock,
  CheckSquare,
  ChartBar,
} from "lucide-react";
import { motion } from "framer-motion";

export default function PollModal({ isOpen, onClose, onCreate, loading }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔄 handleSubmit appelé");

    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      alert("Le sondage doit avoir au moins 2 options valides");
      return;
    }

    const pollData = {
      question: question.trim(),
      options: validOptions,
      isMultiChoice,
      isAnonymous,
      expiresAt: expiresAt || undefined,
    };

    console.log("📤 Données du sondage:", pollData);

    try {
      await onCreate(pollData);
      resetForm();
    } catch (error) {
      console.error("Erreur création sondage:", error);
    }
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setIsMultiChoice(false);
    setIsAnonymous(false);
    setExpiresAt("");
  };

  if (!isOpen) return null;

  // Vérifier si le formulaire est valide
  const isValidForm =
    question.trim() && options.filter((o) => o.trim()).length >= 2;

  console.log("📊 État du formulaire:", {
    question: question.trim(),
    optionsCount: options.filter((o) => o.trim()).length,
    isValid: isValidForm,
    loading,
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
      >
        <div className="max-h-[85vh] flex flex-col">
          <div className="p-6 overflow-y-auto flex-grow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <ChartBar
                    className="text-myYellow dark:text-yellow-400"
                    size={20}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    Créer un sondage
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Partagez votre question avec le groupe
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question du sondage *
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Quelle date pour la réunion ?"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white resize-none"
                  rows="2"
                  required
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options ({options.length}/6) *
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                          required={index < 2}
                        />
                      </div>
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 flex items-center gap-2 text-sm text-myYellow hover:text-yellow-500 transition"
                  >
                    <Plus size={16} />
                    Ajouter une option
                  </button>
                )}
              </div>

              {/* Paramètres */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paramètres
                </label>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckSquare
                      size={18}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Choix multiples
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Les participants peuvent sélectionner plusieurs options
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMultiChoice}
                      onChange={(e) => setIsMultiChoice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-myYellow"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock
                      size={18}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Sondage anonyme
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Les votes seront anonymes
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-myYellow"></div>
                  </label>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar
                      size={18}
                      className="text-gray-600 dark:text-gray-400"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Date d'expiration (optionnel)
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Le sondage se fermera automatiquement à cette date
                      </p>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              {/* Indicateur de validation */}
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                * Champs requis
              </div>
            </form>
          </div>

          {/* Boutons - TOUJOURS VISIBLES EN BAS */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!isValidForm || loading}
                className={`
                  flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2
                  ${
                    !isValidForm || loading
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-myYellow hover:bg-yellow-500 text-black"
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <ChartBar size={18} />
                    Créer le sondage
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
