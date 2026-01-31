// src/hooks/usePolls.js
import { useState, useEffect, useCallback } from "react";
import socketService from "../services/socketService";
import { useAuth } from "./useAuth";
import { pollService } from "../services/pollService";

export const usePolls = (conversationId) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastErrorTime, setLastErrorTime] = useState(null);

  const normalizePoll = (poll) => {
    if (!poll) return null;

    console.log("🔄 Normalisation du sondage:", {
      id: poll._id || poll.id,
      question: poll.question,
      optionsCount: poll.options?.length,
      votersCount: poll.voters?.length,
      rawPoll: poll,
    });

    // Si c'est déjà un ObjectId ou une chaîne, retourner null
    if (typeof poll === "string" || (poll._id && !poll.question)) {
      console.log("⚠️ Le sondage est un ObjectId, pas un objet complet:", poll);
      return null;
    }

    const normalizedPoll = {
      _id: poll._id || poll.id,
      conversationId: poll.conversationId,
      createdBy: poll.createdBy,
      question: poll.question || "",
      isMultiChoice: poll.isMultiChoice || false,
      isAnonymous: poll.isAnonymous || false,
      isClosed: poll.isClosed || false,
      totalVotes: poll.totalVotes || 0,
      voters: [],
      createdAt: poll.createdAt || new Date().toISOString(),
      expiresAt: poll.expiresAt,
    };

    // Normaliser le créateur
    if (poll.createdBy) {
      if (typeof poll.createdBy === "object") {
        normalizedPoll.createdBy = {
          _id: poll.createdBy._id,
          username: poll.createdBy.username || "Utilisateur",
          profilePicture:
            poll.createdBy.profilePicture || "/default-avatar.png",
        };
      } else {
        normalizedPoll.createdBy = {
          _id: poll.createdBy,
          username: "Utilisateur",
          profilePicture: "/default-avatar.png",
        };
      }
    }

    // Normaliser les votants du sondage
    if (poll.voters && Array.isArray(poll.voters)) {
      console.log(`👥 ${poll.voters.length} votants à normaliser`);
      normalizedPoll.voters = poll.voters.map((voter) => {
        if (typeof voter === "string") {
          return {
            _id: voter,
            username: "Utilisateur",
            profilePicture: "/default-avatar.png",
          };
        }
        if (voter && typeof voter === "object") {
          return {
            _id: voter._id || voter,
            username: voter.username || "Utilisateur",
            profilePicture: voter.profilePicture || "/default-avatar.png",
          };
        }
        return {
          _id: `unknown_${Date.now()}`,
          username: "Utilisateur",
          profilePicture: "/default-avatar.png",
        };
      });
    } else {
      normalizedPoll.voters = [];
    }

    // Normaliser les options avec leurs votants
    if (poll.options && Array.isArray(poll.options)) {
      console.log(`📦 ${poll.options.length} options à normaliser`);

      normalizedPoll.options = poll.options.map((option, index) => {
        // Normaliser les votants de l'option
        const optionVoters = option.voters || [];
        const normalizedVoters = optionVoters.map((voter) => {
          if (typeof voter === "string") {
            // Trouver le votant dans la liste normalisée
            const foundVoter = normalizedPoll.voters.find(
              (v) => String(v._id) === String(voter)
            );
            if (foundVoter) return foundVoter;

            return {
              _id: voter,
              username: "Utilisateur",
              profilePicture: "/default-avatar.png",
            };
          }
          if (voter && typeof voter === "object") {
            return {
              _id: voter._id || voter,
              username: voter.username || "Utilisateur",
              profilePicture: voter.profilePicture || "/default-avatar.png",
            };
          }
          return {
            _id: `unknown_voter_${index}_${Date.now()}`,
            username: "Utilisateur",
            profilePicture: "/default-avatar.png",
          };
        });

        return {
          _id: option._id || `option_${index}_${Date.now()}`,
          text: option.text || `Option ${index + 1}`,
          voters: normalizedVoters,
          voteCount: option.voteCount || normalizedVoters.length,
        };
      });
    } else {
      console.log("⚠️ Pas d'options ou options non-array:", poll.options);
      normalizedPoll.options = [];
    }

    console.log("✅ Sondage normalisé final:", normalizedPoll);
    return normalizedPoll;
  };

  const fetchPolls = useCallback(async () => {
    if (!conversationId) {
      console.warn("❌ fetchPolls: Aucun conversationId");
      return;
    }

    console.log(`🔄 Chargement sondages pour conversation: ${conversationId}`);
    setLoading(true);
    setError(null);

    try {
      const pollsData = await pollService.getConversationPolls(conversationId);
      console.log("📥 Sondages reçus du backend:", {
        count: pollsData.length,
        polls: pollsData,
      });

      const normalizedPolls = pollsData
        .map(normalizePoll)
        .filter((p) => p !== null);
      console.log("✅ Sondages normalisés:", {
        count: normalizedPolls.length,
        polls: normalizedPolls,
      });

      setPolls(normalizedPolls);
    } catch (err) {
      console.error("❌ Erreur chargement sondages:", {
        message: err.message,
        stack: err.stack,
        conversationId,
      });
      setError("Erreur lors du chargement des sondages: " + err.message);
      setLastErrorTime(Date.now());
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // ÉCOUTE SOCKET - VERSION CORRIGÉE
  useEffect(() => {
    if (!socketService.socket || !conversationId) {
      console.log("⚠️ Socket ou conversationId manquant");
      return;
    }

    console.log("🔌 Configuration écouteurs socket pour sondages");

    const handleNewMessage = async (msg) => {
      console.log("📨 Nouveau message socket:", {
        type: msg.typeMessage,
        conversationId: msg.conversationId,
        hasPollRef: !!msg.pollRef,
        hasPoll: !!msg.poll,
        hasContentPoll: !!msg.content?.poll,
      });

      if (msg.typeMessage !== "poll") return;

      const msgConvId = msg.conversationId?.toString();
      if (msgConvId !== conversationId.toString()) return;

      console.log("🎯 Message de sondage pour cette conversation");

      let pollData = msg.pollRef || msg.poll || msg.content?.poll;

      // Si on reçoit seulement l'ID du sondage
      if (typeof pollData === "string") {
        console.log(
          `⚠️ pollRef est un ID string : ${pollData}. Récupération complète...`
        );
        try {
          const response = await pollService.getPoll(pollData);
          pollData = response.poll || response;
          console.log("✅ Sondage récupéré via API:", pollData);
        } catch (err) {
          console.error(
            "❌ Impossible de récupérer le sondage manquant :",
            err
          );
          return;
        }
      }

      if (!pollData || !pollData._id) {
        console.log("⚠️ Pas de données de sondage valides");
        return;
      }

      const normalized = normalizePoll(pollData);
      if (!normalized) return;

      setPolls((prev) => {
        const exists = prev.some((p) => p._id === normalized._id);
        if (exists) {
          console.log("🔄 Mise à jour sondage existant:", normalized._id);
          return prev.map((p) =>
            p._id === normalized._id ? { ...p, ...normalized } : p
          );
        }
        console.log("➕ Ajout nouveau sondage:", normalized._id);
        return [normalized, ...prev].sort(
          (a, b) =>
            new Date(b.createdAt || b.timestamp) -
            new Date(a.createdAt || a.timestamp)
        );
      });
    };

    const handlePollUpdated = ({ poll }) => {
      console.log("🔄 Sondage mis à jour via socket:", {
        id: poll._id,
        question: poll.question,
        votersCount: poll.voters?.length,
      });
      if (!poll) return;
      const normalized = normalizePoll(poll);
      if (!normalized) return;

      setPolls((prev) =>
        prev.map((p) =>
          p._id === normalized._id ? { ...p, ...normalized } : p
        )
      );
    };

    const handlePollClosed = ({ pollId, poll }) => {
      console.log("🔚 Sondage fermé:", pollId);
      if (poll) {
        const normalized = normalizePoll(poll);
        if (normalized) {
          setPolls((prev) =>
            prev.map((p) =>
              p._id === normalized._id ? { ...p, ...normalized } : p
            )
          );
        }
      } else {
        setPolls((prev) =>
          prev.map((p) => (p._id === pollId ? { ...p, isClosed: true } : p))
        );
      }
    };

    const handlePollDeleted = ({ pollId }) => {
      console.log("🗑️ Sondage supprimé:", pollId);
      setPolls((prev) => prev.filter((p) => p._id !== pollId));
    };

    // Gestion des événements socket pour les sondages
    socketService.socket.on("new_message", handleNewMessage);
    socketService.socket.on("poll_updated", handlePollUpdated);
    socketService.socket.on("poll_closed", handlePollClosed);
    socketService.socket.on("poll_deleted", handlePollDeleted);

    return () => {
      console.log("🧹 Nettoyage écouteurs socket");
      socketService.socket.off("new_message", handleNewMessage);
      socketService.socket.off("poll_updated", handlePollUpdated);
      socketService.socket.off("poll_closed", handlePollClosed);
      socketService.socket.off("poll_deleted", handlePollDeleted);
    };
  }, [conversationId]);

  // Fonctions CRUD avec gestion d'erreur améliorée
  const createPoll = async (pollData) => {
    console.log("📝 Création d'un sondage:", {
      question: pollData.question,
      optionsCount: pollData.options?.length,
      conversationId: pollData.conversationId || conversationId,
    });

    try {
      const dataToSend = {
        ...pollData,
        conversationId: pollData.conversationId || conversationId,
      };

      if (!dataToSend.conversationId) {
        throw new Error("Impossible de déterminer la conversation");
      }

      console.log("📤 Envoi au backend:", dataToSend);
      const response = await pollService.createPoll(dataToSend);
      console.log("✅ Réponse du backend:", response);

      if (response.poll) {
        const normalized = normalizePoll(response.poll);
        if (normalized) {
          setPolls((prev) => [normalized, ...prev]);
        }
      }

      return response;
    } catch (err) {
      console.error("❌ Erreur création sondage:", {
        message: err.message,
        stack: err.stack,
        pollData,
      });
      setError(err.message);
      setLastErrorTime(Date.now());
      throw err;
    }
  };

  // ✅ FONCTION VOTE CORRECTE
  const votePoll = async (pollId, optionIndexes) => {
    console.log("🗳️ Vote pour sondage:", {
      pollId,
      optionIndexes,
      userId: user?._id || user?.id,
      typeOfOptionIndexes: typeof optionIndexes,
      isArray: Array.isArray(optionIndexes),
    });

    try {
      const response = await pollService.votePoll(pollId, optionIndexes);
      console.log("✅ Réponse du vote:", {
        success: response.success,
        pollId: response.poll?._id,
        totalVotes: response.poll?.totalVotes,
        votersCount: response.poll?.voters?.length,
      });

      // Mettre à jour localement
      if (response.poll) {
        const normalized = normalizePoll(response.poll);
        if (normalized) {
          setPolls((prev) =>
            prev.map((p) =>
              p._id === normalized._id ? { ...p, ...normalized } : p
            )
          );
        }
      }

      return response;
    } catch (err) {
      console.error("❌ Erreur vote sondage dans usePolls:", {
        message: err.message,
        pollId,
        optionIndexes,
        error: err,
        stack: err.stack,
      });

      const errorMessage = err.message || "Erreur lors du vote";
      setError(errorMessage);
      setLastErrorTime(Date.now());
      throw err;
    }
  };

  const closePoll = async (pollId) => {
    console.log("🔚 Fermeture sondage:", pollId);

    try {
      const response = await pollService.closePoll(pollId);
      console.log("✅ Réponse fermeture:", response);

      // Mettre à jour localement avec les données complètes si disponibles
      if (response.poll) {
        const normalized = normalizePoll(response.poll);
        if (normalized) {
          setPolls((prev) =>
            prev.map((p) =>
              p._id === normalized._id ? { ...p, ...normalized } : p
            )
          );
        } else {
          setPolls((prev) =>
            prev.map((p) => (p._id === pollId ? { ...p, isClosed: true } : p))
          );
        }
      } else {
        setPolls((prev) =>
          prev.map((p) => (p._id === pollId ? { ...p, isClosed: true } : p))
        );
      }

      return response;
    } catch (err) {
      console.error("❌ Erreur fermeture sondage:", {
        message: err.message,
        pollId,
        error: err,
      });
      setError(err.message);
      setLastErrorTime(Date.now());
      throw err;
    }
  };

  const deletePoll = async (pollId) => {
    console.log("🗑️ Suppression sondage:", pollId);

    try {
      const response = await pollService.deletePoll(pollId);
      console.log("✅ Réponse suppression:", response);

      // Mettre à jour localement
      setPolls((prev) => prev.filter((p) => p._id !== pollId));

      return response;
    } catch (err) {
      console.error("❌ Erreur suppression sondage:", {
        message: err.message,
        pollId,
        error: err,
      });
      setError(err.message);
      setLastErrorTime(Date.now());
      throw err;
    }
  };

  const getPollById = useCallback(
    (pollId) => {
      const found = polls.find((p) => p._id === pollId);
      console.log("🔍 Recherche sondage", {
        pollId,
        trouvé: !!found,
        totalPolls: polls.length,
      });
      return found;
    },
    [polls]
  );

  // Fonction pour réessayer après une erreur
  const retryAfterError = useCallback(() => {
    if (lastErrorTime && Date.now() - lastErrorTime < 30000) {
      console.log("🔄 Réessai après erreur...");
      fetchPolls();
    }
  }, [lastErrorTime, fetchPolls]);

  // Fonction pour vérifier la validité d'un sondage
  const validatePoll = useCallback((poll) => {
    if (!poll) return false;

    const isValid =
      poll._id &&
      poll.question &&
      Array.isArray(poll.options) &&
      poll.options.length >= 2 &&
      poll.options.every((opt) => opt.text && opt.text.trim() !== "");

    console.log("✅ Validation sondage:", {
      id: poll._id,
      isValid,
      questionLength: poll.question?.length,
      optionsCount: poll.options?.length,
    });

    return isValid;
  }, []);

  // Nettoyer les sondages invalides
  const cleanInvalidPolls = useCallback(() => {
    console.log("🧹 Nettoyage des sondages invalides");
    setPolls((prev) => prev.filter(validatePoll));
  }, [validatePoll]);

  // Fonction pour obtenir les statistiques des sondages
  const getPollStats = useCallback(() => {
    const stats = {
      total: polls.length,
      open: polls.filter((p) => !p.isClosed).length,
      closed: polls.filter((p) => p.isClosed).length,
      votedByUser: polls.filter((p) =>
        p.voters?.some(
          (voter) => String(voter._id) === String(user?._id || user?.id)
        )
      ).length,
      createdByUser: polls.filter(
        (p) => String(p.createdBy._id) === String(user?._id || user?.id)
      ).length,
    };

    console.log("📊 Statistiques des sondages:", stats);
    return stats;
  }, [polls, user]);

  // Effet pour nettoyer périodiquement les sondages invalides
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (polls.length > 0) {
        cleanInvalidPolls();
      }
    }, 60000); // Toutes les minutes

    return () => clearInterval(cleanupInterval);
  }, [polls, cleanInvalidPolls]);

  return {
    polls,
    loading,
    error,
    createPoll,
    votePoll,
    closePoll,
    deletePoll,
    refetch: fetchPolls,
    getPollById,
    retryAfterError,
    cleanInvalidPolls,
    getPollStats,
    validatePoll,
  };
};
