// frontend/src/components/OwlyQuiz.jsx
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import clickSound from "../assets/sounds/click.wav";
import winSound from "../assets/sounds/win.wav";
import loseSound from "../assets/sounds/lose.wav";

// ---- images
const BACKGROUND = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1350&q=80";
const OWLY_IMAGE = "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=600&q=60";
const PUZZLE_FINAL_IMAGE = "https://images.unsplash.com/photo-1593642532973-d31b6557fa68?auto=format&fit=crop&w=600&q=60";
const LEAVES_IMAGE = "https://images.unsplash.com/photo-1606788075760-9dbb0f1a9d6c?auto=format&fit=crop&w=600&q=60"; // image claire feuilles
const GLASS_IMAGE = "https://images.unsplash.com/photo-1572376518587-7c53a6d9d5a7?auto=format&fit=crop&w=600&q=60"; // placeholder verre

// ---- mémoire
const MEMORY_ICONS = ["🌿", "🌸", "⭐", "🐦"];

// ---- histoire
const STORY_PARAGRAPHS = [
  "Owly est né au cœur de la forêt d'Early, sous les étoiles. Petite chouette à l’œil vif, il passait ses nuits à écouter les vieux arbres. Un matin, il trouva un parchemin parlant d’un trésor caché — mais le parchemin disait clairement : « Seuls les plus malins pourront lire la suite. »",
  "Après le premier triomphe, Owly comprit que la forêt avait une logique — chemins, marques et signes laissés par les anciens. Il sut alors qu'il devait observer, retenir et agir au bon moment pour avancer.",
  "Les épreuves suivantes apprirent à Owly la patience et la mémoire : retenir une suite, déceler un symbole dans la pénombre et agir vite quand le temps lui manque. Chaque succès lui apportait un fragment de vérité.",
  "Avant le dernier défi, Owly rencontra des créatures fantastiques qui le testèrent sur son observation et son attention. Chaque défi réussit le rapprochait du secret de la forêt.",
  "Enfin, Owly découvrit la clairière des sages. Là, en assemblant tout ce qu'il avait appris, il trouva le secret : la forêt est vivante, et ses gardiens avaient préparé Owly pour protéger cette mémoire. Ainsi son histoire fut révélée."
];

// ---- puzzle pièces
const PUZZLE_PIECES = [
  { id: 0, order: 0 },
  { id: 1, order: 1 },
  { id: 2, order: 2 },
  { id: 3, order: 3 },
  { id: 4, order: 4 },
  { id: 5, order: 5 }
];

// ---- sons
function playSound(sound){
  try{
    const a=new Audio(sound);
    a.volume=0.75;
    a.play().catch(()=>{});
  }catch(e){}
}

// ---- utilitaires
function arraysEqual(a,b){
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false;
  return true;
}

function shuffle(array){
  return array.sort(()=>Math.random()-0.5);
}

function pieceBgPos(index){
  switch(index){
    case 0: return "0% 0%";
    case 1: return "50% 0%";
    case 2: return "100% 0%";
    case 3: return "0% 50%";
    case 4: return "50% 50%";
    case 5: return "100% 50%";
    default: return "0% 0%";
  }
}

// ---- style bouton
const btnStyle = {
  padding:"10px 20px",
  borderRadius:10,
  background:"#ffd54f",
  border:"none",
  cursor:"pointer",
  fontWeight:"700",
  fontSize:16
};

export default function OwlyQuiz(){

  const [stage,setStage]=useState("intro");
  const [storyIndex,setStoryIndex]=useState(0);
  const [challengeType,setChallengeType]=useState(null);

  const [pieces,setPieces]=useState([...PUZZLE_PIECES]);
  const [selected,setSelected]=useState(null);

  const [memorySeq,setMemorySeq]=useState([]);
  const [playerSeq,setPlayerSeq]=useState([]);

  const [speedCount,setSpeedCount]=useState(0);
  const [speedTime,setSpeedTime]=useState(15);
  const speedTimerRef=useRef(null);

  const [leafAnswer,setLeafAnswer]=useState(null);
  const [leafVisible,setLeafVisible]=useState(true);

  const [glassPos,setGlassPos]=useState([0,1,2]);
  const [ballPos,setBallPos]=useState(0);
  const [glassHidden,setGlassHidden]=useState(false);

  const [finalQuestion,setFinalQuestion]=useState({
    question:"",
    options:[],
    answer:""
  });

  // ---- démarrer un défi
  const startChallenge=()=>{
    playSound(clickSound);
    setSelected(null);
    setPlayerSeq([]);
    setSpeedCount(0);
    setSpeedTime(15);
    setLeafVisible(true);
    setGlassHidden(false);

    const types=["puzzle","memory","followBall","countLeaves","finalQuestion"];
    const type=types[storyIndex];
    setChallengeType(type);

    // Puzzle
    if(type==="puzzle"){
      setPieces(shuffle([...PUZZLE_PIECES]));
    }

    // Mémoire
    if(type==="memory"){
      const seq=shuffle(MEMORY_ICONS).slice(0,4);
      setMemorySeq(seq);
      setPlayerSeq(seq);
      setTimeout(()=>setPlayerSeq([]),2000);
    }

    // Suivre boule
    if(type==="followBall"){
      const start=Math.floor(Math.random()*3);
      setBallPos(start);
      setGlassPos([0,1,2]);
      setGlassHidden(false);
      setTimeout(()=>{ // 3 mouvements aléatoires
        let pos=start;
        for(let i=0;i<3;i++){
          let swap=Math.floor(Math.random()*3);
          let newPos=pos;
          while(newPos===pos) newPos=swap;
          pos=newPos;
        }
        setBallPos(pos);
        setGlassHidden(true);
      },1000);
    }

    // Compter feuilles
    if(type==="countLeaves"){
      const correct=Math.floor(Math.random()*5)+3; // 3 à 7
      setLeafAnswer(correct);
      setLeafVisible(true);
      setTimeout(()=>setLeafVisible(false),3000);
    }

    // Question finale
    if(type==="finalQuestion"){
      const q="Quelle est la couleur préférée d'Owly ?";
      const opts=shuffle(["Bleu","Jaune","Vert","Rouge"]);
      setFinalQuestion({question:q,options:opts,answer:"Bleu"});
    }

    setStage("challenge");
  };

  // ---- actions défis
  const onPieceClick=(idx)=>{
    if(challengeType!=="puzzle") return;
    if(selected===null){ setSelected(idx); return;}
    if(selected===idx){ setSelected(null); return;}
    const newPieces=[...pieces];
    [newPieces[selected], newPieces[idx]]=[newPieces[idx],newPieces[selected]];
    setPieces(newPieces);
    setSelected(null);
    if(newPieces.every((p,i)=>p.order===i)) onWin();
  };

  const onMemoryClick=(sym)=>{
    if(challengeType!=="memory") return;
    const next=[...playerSeq,sym];
    setPlayerSeq(next);
    const expected=memorySeq.slice(0,next.length);
    if(!arraysEqual(next,expected)) onFail();
    else if(next.length===memorySeq.length) onWin();
  };

  const onGlassClick=(idx)=>{
    if(challengeType!=="followBall") return;
    if(idx===ballPos) onWin();
    else onFail();
  };

  const onCountLeavesClick=(val)=>{
    if(challengeType!=="countLeaves") return;
    if(val===leafAnswer) onWin();
    else onFail();
  };

  const onFinalClick=(val)=>{
    if(challengeType!=="finalQuestion") return;
    if(val===finalQuestion.answer) onWin();
    else onFail();
  };

  const onWin=()=>{
    playSound(winSound);
    setStage("story");
    setStoryIndex(prev=>prev+1);
  };

  const onFail=()=>{
    playSound(loseSound);
    setStage("lost");
  };

  const nextStage=()=>{
    if(storyIndex>=STORY_PARAGRAPHS.length) setStage("finished");
    else startChallenge();
  };

  const resetGame=()=>{
    setStage("intro");
    setStoryIndex(0);
  };

  // ---- RENDER
  return(
    <div style={{
      minHeight:"100vh",
      backgroundColor:"#FFFF99",
      padding:20,
      color:"#000",
      display:"flex",
      flexDirection:"column",
      alignItems:"center"
    }}>
      <motion.h1 initial={{y:-50,opacity:0}} animate={{y:0,opacity:1}} style={{fontSize:"3rem"}}>
        🦉 Owly Quiz 🦉
      </motion.h1>

      {/* INTRO */}
      {stage==="intro" && (
        <div style={{maxWidth:720,textAlign:"center",marginTop:40,padding:20,background:"#fff",borderRadius:12}}>
          <p>Ce jeu raconte l'histoire d'Owly. Pour la découvrir, réussis chaque défi.</p>
          <button onClick={startChallenge} style={btnStyle}>Start</button>
        </div>
      )}

      {/* PUZZLE */}
      {stage==="challenge" && challengeType==="puzzle" && (
        <div style={{marginTop:30}}>
          <h2>Puzzle — reconstitue l'image</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,100px)",gap:6,marginTop:20}}>
            {pieces.map((p,idx)=>(
              <div key={p.id} onClick={()=>onPieceClick(idx)}
                style={{
                  width:100,height:100,cursor:"pointer",
                  border:selected===idx?"3px solid #ffd54f":"2px solid #000",
                  borderRadius:6,
                  backgroundImage:`url(${OWLY_IMAGE})`,
                  backgroundSize:"300% 200%",
                  backgroundPosition:pieceBgPos(p.order)
                }}
              />
            ))}
          </div>
          <p>Tu as 15 secondes !</p>
        </div>
      )}

      {/* MEMOIRE */}
      {stage==="challenge" && challengeType==="memory" && (
        <div style={{marginTop:30}}>
          <h2>Défi mémoire</h2>
          <div style={{fontSize:32,marginBottom:10}}>
            {playerSeq.length>0 ? playerSeq.map((s)=>s) : memorySeq.map(()=> "❓")}
          </div>
          <div>
            {shuffle([...new Set(memorySeq)]).map((s,i)=>(
              <button key={i} onClick={()=>onMemoryClick(s)} style={btnStyle}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* SUIVRE BOULE */}
      {stage==="challenge" && challengeType==="followBall" && (
        <div style={{marginTop:30,textAlign:"center"}}>
          <h2>Défi rapidité & logique — où est la boule ?</h2>
          <div style={{display:"flex",gap:20,justifyContent:"center",marginTop:20}}>
            {glassPos.map((g,i)=>(
              <div key={i} onClick={()=>onGlassClick(i)} style={{width:80,height:80,background:"#aaa",display:"flex",justifyContent:"center",alignItems:"center",cursor:"pointer",fontSize:32}}>
                {!glassHidden && i===ballPos ? "🔴" : "🥛"}
              </div>
            ))}
          </div>
          <p>Regarde attentivement la boule, puis clique sur le bon verre après les mouvements.</p>
        </div>
      )}

      {/* FEUILLES */}
      {stage==="challenge" && challengeType==="countLeaves" && (
        <div style={{marginTop:30,textAlign:"center"}}>
          <h2>Défi observation — combien de feuilles ? 🍃</h2>
          {leafVisible ? (
            <img src={LEAVES_IMAGE} alt="feuilles" style={{width:300,height:200,borderRadius:10,marginTop:20}}/>
          ) : (
            <>
              <p>L'image a disparu ! Combien de feuilles as-tu vues ?</p>
              <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:20}}>
                {shuffle([leafAnswer, leafAnswer+1, leafAnswer-1, leafAnswer+2]).map((n,i)=>(
                  <button key={i} onClick={()=>onCountLeavesClick(n)} style={btnStyle}>{n}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* QUESTION FINALE */}
      {stage==="challenge" && challengeType==="finalQuestion" && (
        <div style={{marginTop:30,textAlign:"center"}}>
          <h2>{finalQuestion.question}</h2>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:20}}>
            {finalQuestion.options.map((opt,i)=>(
              <button key={i} onClick={()=>onFinalClick(opt)} style={btnStyle}>{opt}</button>
            ))}
          </div>
        </div>
      )}

      {/* STORY */}
      {stage==="story" && (
        <div style={{maxWidth:720,marginTop:40,padding:20,background:"#fff",borderRadius:12}}>
          <p>{STORY_PARAGRAPHS[storyIndex-1]}</p>
          <button onClick={nextStage} style={{...btnStyle,marginTop:20}}>Prochain défi</button>
        </div>
      )}

      {/* LOST */}
      {stage==="lost" && (
        <div style={{maxWidth:720,marginTop:40,padding:20,background:"#fff",borderRadius:12,textAlign:"center"}}>
          <h2>💥 Game Over</h2>
          <p>Tu as échoué. Réessaye pour continuer l'histoire d'Owly.</p>
          <button onClick={startChallenge} style={btnStyle}>🔁 Réessayer ce défi</button>
          <button onClick={resetGame} style={btnStyle}>Recommencer le jeu</button>
        </div>
      )}

      {/* FIN */}
      {stage==="finished" && (
        <div style={{maxWidth:720,marginTop:40,padding:20,background:"#fff",borderRadius:12}}>
          <h2>🎉 Histoire complète d'Owly 🎉</h2>
          {STORY_PARAGRAPHS.map((p,i)=><p key={i}>{p}</p>)}
          <button onClick={resetGame} style={{...btnStyle,marginTop:20}}>Rejouer</button>
        </div>
      )}

    </div>
  );
}




