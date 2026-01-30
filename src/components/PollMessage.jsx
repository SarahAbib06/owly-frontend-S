// src/components/PollMessage.jsx
import React, { useState, useEffect, useMemo } from "react";

const PollMessage = ({
  poll,
  onVote,
  currentUserId,
  onClose,
  onDelete,
  isCreator,
}) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVoters, setShowVoters] = useState({}); // État pour gérer l'affichage des votants par option

  // PROTECTION : si poll est invalide ou encore une string
  if (!poll || typeof poll === "string") {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 my-2 max-w-md">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Chargement du sondage...
        </div>
      </div>
    );
  }

  // Normaliser et valider les options du sondage
  const options = useMemo(() => {
    if (!poll) {
      console.log("❌ Aucun sondage fourni");
      return [];
    }

    // Récupérer les options depuis différents formats possibles
    let rawOptions = poll.options || poll.choices || [];

    // Si options est null ou undefined
    if (!rawOptions) {
      console.log("⚠️ Options vides ou null");
      return [];
    }

    // Si rawOptions n'est pas un tableau, essayer de le convertir
    if (!Array.isArray(rawOptions)) {
      console.log("⚠️ Options n'est pas un tableau, conversion...");
      if (typeof rawOptions === "string") {
        try {
          rawOptions = JSON.parse(rawOptions);
        } catch (e) {
          rawOptions = [];
        }
      } else if (typeof rawOptions === "object") {
        rawOptions = Object.values(rawOptions);
      } else {
        rawOptions = [];
      }
    }

    console.log("📦 Options après conversion:", rawOptions);

    // Normaliser chaque option
    const normalizedOptions = rawOptions.map((option, index) => {
      // Si l'option est une string
      if (typeof option === "string") {
        console.log(`📝 Option ${index} est une string: "${option}"`);
        return {
          text: option,
          voters: [],
          voteCount: 0,
          _id: `option_${index}_${Date.now()}`,
        };
      }

      // Si c'est un objet
      if (option && typeof option === "object") {
        // Normaliser les votants de l'option
        const optionVoters = option.voters || [];
        const normalizedVoters = optionVoters.map((voter) => {
          if (typeof voter === "string") {
            return {
              _id: voter,
              username: "Utilisateur",
              profilePicture: "/default-avatar.png",
            };
          }
          return {
            _id: voter._id || voter,
            username: voter.username || "Utilisateur",
            profilePicture: voter.profilePicture || "/default-avatar.png",
          };
        });

        const normalizedOption = {
          text:
            option.text ||
            option.optionText ||
            option.label ||
            `Option ${index + 1}`,
          voters: normalizedVoters,
          voteCount:
            option.voteCount || option.count || normalizedVoters.length,
          _id: option._id || option.id || `option_${index}_${Date.now()}`,
        };
        console.log(`📦 Option ${index} normalisée:`, normalizedOption);
        return normalizedOption;
      }

      // Fallback
      console.log(`⚠️ Option ${index} non reconnue:`, option);
      return {
        text: `Option ${index + 1}`,
        voters: [],
        voteCount: 0,
        _id: `option_${index}_${Date.now()}`,
      };
    });

    console.log("✅ Options normalisées finales:", normalizedOptions);
    return normalizedOptions;
  }, [poll]);

  // Normaliser les votants du sondage
  const voters = useMemo(() => {
    if (!poll || !poll.voters) return [];

    const rawVoters = poll.voters || [];
    return rawVoters.map((voter) => {
      if (typeof voter === "string") {
        return {
          _id: voter,
          username: "Utilisateur",
          profilePicture: "/default-avatar.png",
        };
      }
      return {
        _id: voter._id || voter,
        username: voter.username || "Utilisateur",
        profilePicture: voter.profilePicture || "/default-avatar.png",
      };
    });
  }, [poll]);

  // Vérifier si l'utilisateur a déjà voté
  useEffect(() => {
    if (!poll || !currentUserId) {
      setHasVoted(false);
      return;
    }

    console.log("🔍 Vérification si utilisateur a voté...");

    // Vérifier dans les voters du sondage
    const userVoted = voters.some((voter) => {
      return voter && String(voter._id) === String(currentUserId);
    });

    // Vérifier également dans chaque option
    let foundInOptions = false;
    if (!userVoted && options.length > 0) {
      for (const option of options) {
        const optionVoters = option.voters || [];
        const userVotedHere = optionVoters.some((voter) => {
          return voter && String(voter._id) === String(currentUserId);
        });

        if (userVotedHere) {
          foundInOptions = true;
          break;
        }
      }
    }

    const finalHasVoted = userVoted || foundInOptions;
    console.log("📊 Utilisateur a voté?:", finalHasVoted);
    setHasVoted(finalHasVoted);
  }, [poll, currentUserId, options, voters]);

  // Vérifier si le sondage est fermé
  const isExpired = poll?.expiresAt && new Date() > new Date(poll.expiresAt);
  const isClosed = poll?.isClosed || isExpired;

  // Calculer le total des votes
  const totalVotes = options.reduce(
    (sum, opt) => sum + (opt.voteCount || 0),
    0
  );

  // Vérifier les permissions
  const checkIsCreator = () => {
    if (!poll?.createdBy || !currentUserId) return false;

    const creatorId = poll.createdBy._id || poll.createdBy;
    return String(creatorId) === String(currentUserId);
  };

  const actualIsCreator =
    isCreator !== undefined ? isCreator : checkIsCreator();

  // Si le sondage est invalide, afficher un message
  if (!poll) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 my-2 max-w-md">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Sondage non disponible
        </div>
      </div>
    );
  }

  // Afficher un état de chargement si les options sont en cours de traitement
  if (options.length === 0 && !poll.isClosed) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 my-2 max-w-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const toggleOption = (index) => {
    if (hasVoted || isClosed || isProcessing) return;

    if (poll.isMultiChoice) {
      setSelectedOptions((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  // Fonction pour basculer l'affichage des votants d'une option
  const toggleVoters = (optionIndex) => {
    setShowVoters((prev) => ({
      ...prev,
      [optionIndex]: !prev[optionIndex],
    }));
  };

  // Fonction pour normaliser les informations des votants
  const getVoterInfo = (voter) => {
    // voter peut être un ObjectId, une string, ou un objet avec username/profilePicture
    if (!voter) return null;

    if (typeof voter === "string") {
      // C'est un ID - nous devons trouver l'utilisateur dans les données du sondage
      const voterId = voter;

      // Chercher dans les votants normalisés
      const foundVoter = voters.find((v) => String(v._id) === String(voterId));

      if (foundVoter) {
        return foundVoter;
      }

      return {
        _id: voterId,
        username: "Utilisateur",
        profilePicture: "/default-avatar.png",
      };
    }

    // Si voter est déjà un objet avec les informations
    return {
      _id: voter._id || voter,
      username: voter.username || "Utilisateur",
      profilePicture: voter.profilePicture || "/default-avatar.png",
    };
  };

  // ✅ FONCTION VOTE CORRECTE
  const handleVote = async () => {
    if (selectedOptions.length === 0 || !onVote || isProcessing) return;

    // Validation frontend : vérifier que les index sont valides
    const optionsValides = selectedOptions.every(
      (index) =>
        typeof index === "number" &&
        index >= 0 &&
        index < (poll.options?.length || 0)
    );

    if (!optionsValides) {
      alert("Erreur : une ou plusieurs options sélectionnées sont invalides.");
      return;
    }

    // Log de débogage
    console.log("🗳️ DEBUG - Données du vote:", {
      pollId: poll._id,
      selectedOptions: selectedOptions,
      pollOptionsCount: poll.options?.length,
      pollOptions: poll.options?.map((opt, idx) => `${idx}: ${opt.text}`),
      pollData: poll,
    });

    setIsProcessing(true);
    try {
      // ✅ Appeler onVote avec seulement selectedOptions
      await onVote(selectedOptions);
      setHasVoted(true);
      setSelectedOptions([]);
    } catch (error) {
      console.error("❌ DEBUG - Erreur détaillée vote:", {
        error: error,
        message: error.message,
        stack: error.stack,
      });
      alert("Erreur lors du vote: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePoll = async () => {
    if (!onClose) return;

    if (window.confirm("Voulez-vous vraiment fermer ce sondage ?")) {
      try {
        await onClose(poll._id);
      } catch (error) {
        console.error("Erreur lors de la fermeture:", error);
        alert("Erreur lors de la fermeture: " + error.message);
      }
    }
  };

  const handleDeletePoll = async () => {
    if (!onDelete) return;

    if (window.confirm("Voulez-vous vraiment supprimer ce sondage ?")) {
      try {
        await onDelete(poll._id);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression: " + error.message);
      }
    }
  };

  const getPercentage = (count) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 my-2 max-w-md">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl"></span>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {poll.question || "Sondage"}
          </h4>
        </div>

        {actualIsCreator && !isClosed && (
          <div className="flex gap-2">
            <button
              onClick={handleClosePoll}
              className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
              title="Fermer le sondage"
              disabled={isProcessing}
            >
              Fermer
            </button>
            <button
              onClick={handleDeletePoll}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Supprimer le sondage"
              disabled={isProcessing}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {options.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-500 dark:text-gray-400 mb-2">
              Aucune option disponible pour ce sondage
            </div>
            <div className="text-xs text-gray-400">
              ID du sondage: {poll._id}
            </div>
          </div>
        ) : (
          options.map((option, index) => {
            const voteCount = option.voteCount || 0;
            const percentage = getPercentage(voteCount);

            // Vérifier si l'utilisateur a voté pour cette option
            const userVotedHere = (option.voters || []).some((voter) => {
              return voter && String(voter._id) === String(currentUserId);
            });

            // Obtenir les informations des votants
            const voterInfos = option.voters || [];

            return (
              <div key={option._id || index} className="relative">
                <div
                  onClick={() => toggleOption(index)}
                  className={`p-3 rounded-lg border transition-all ${
                    hasVoted || isClosed || isProcessing
                      ? "cursor-default border-gray-200 dark:border-gray-600"
                      : "cursor-pointer hover:border-gray-700 dark:hover:border-gray-400 border-gray-300 dark:border-gray-600"
                  } ${
                    selectedOptions.includes(index)
                      ? "border-black dark:border-gray-300 bg-gray-100 dark:bg-gray-700"
                      : ""
                  } ${
                    userVotedHere
                      ? "border-myYellow dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {option.text || `Option ${index + 1}`}
                    </span>
                    {(hasVoted || isClosed) && (
                      <span className="text-xs font-semibold">
                        {percentage}%
                      </span>
                    )}
                  </div>

                  {/* Barre de progression */}
                  {(hasVoted || isClosed) && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          userVotedHere
                            ? "bg-myYellow dark:bg-yellow-500"
                            : "bg-gray-800"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}

                  {/* Nombre de votes et bouton pour voir les votants */}
                  {(hasVoted || isClosed) && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {voteCount} vote{voteCount !== 1 ? "s" : ""}
                      </div>

                      {/* Bouton pour voir les votants (uniquement si pas anonyme et il y a des votes) */}
                      {!poll.isAnonymous && voteCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVoters(index);
                          }}
                          className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                        >
                          {showVoters[index] ? (
                            <>
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                              Masquer
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                              Voir {voteCount} votant
                              {voteCount !== 1 ? "s" : ""}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Indicateur "Votre vote" */}
                  {userVotedHere && (
                    <div className="absolute -top-1 -right-1 bg-myYellow dark:bg-yellow-500 text-black text-[10px] px-1.5 py-0.5 rounded-full">
                      ✓
                    </div>
                  )}
                </div>

                {/* Indicateur pour les sondages anonymes */}
                {poll.isAnonymous && voteCount > 0 && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                    Sondage anonyme - les votants sont cachés
                  </div>
                )}

                {/* Section des votants (affichée conditionnellement) */}
                {showVoters[index] && voterInfos.length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Votants pour "{option.text || `Option ${index + 1}`}" :
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {voterInfos.map((voter, idx) => (
                        <div
                          key={voter._id || idx}
                          className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded"
                        >
                          <img
                            src={voter.profilePicture}
                            alt={voter.username}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              e.target.src = "/default-avatar.png";
                            }}
                          />
                          <span className="text-xs text-gray-800 dark:text-gray-200">
                            {voter.username}
                            {String(voter._id) === String(currentUserId) && (
                              <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">
                                (vous)
                              </span>
                            )}
                          </span>
                          {String(voter._id) ===
                            String(poll.createdBy?._id || poll.createdBy) && (
                            <span className="ml-auto text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                              Créateur
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""} total
          {poll.isAnonymous && " • Anonyme"}
          {poll.isMultiChoice && " • Choix multiple"}
        </span>
        {/* SUPPRIMÉ : le badge "En cours" qui s'affichait en vert */}
        {isClosed && (
          <span className="px-2 py-1 rounded-full text-xs bg-gray-600 text-white dark:bg-gray-600 dark:text-white">
            Fermé
          </span>
        )}
      </div>

      {/* Bouton Voter */}
      {!hasVoted && !isClosed && options.length > 0 && (
        <button
          onClick={handleVote}
          disabled={selectedOptions.length === 0 || isProcessing}
          className={`mt-4 w-full py-2 rounded-lg font-medium transition-colors ${
            selectedOptions.length === 0 || isProcessing
              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-myYellow hover:bg-yellow-500 text-black"
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-4 w-4 mr-2 text-black"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Traitement...
            </span>
          ) : (
            `Voter (${selectedOptions.length} sélectionné${
              selectedOptions.length !== 1 ? "s" : ""
            })`
          )}
        </button>
      )}
      

      {/* Message de remerciement en jaune */}
      {hasVoted && !isClosed && (
        <div className="mt-4 text-center text-sm text-yellow-600 dark:text-yellow-400"></div>
      )}

      {isClosed && !hasVoted && (
        <div className="mt-4 text-center text-sm text-yellow-600 dark:text-yellow-400">
          Ce sondage est maintenant fermé
        </div>
      )}
    </div>
  );
};

export default PollMessage;
