import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import clickSound from "../assets/sounds/click.wav";
import winSound from "../assets/sounds/win.wav";
import loseSound from "../assets/sounds/lose.wav";
import { IoArrowBackOutline } from "react-icons/io5";

import { useTranslation } from "react-i18next";

const OWLY_IMAGE = "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=600&q=60";
const MEMORY_ICONS = ["🌿", "🌸", "⭐", "🐦"];




const PUZZLE_PIECES = [
  { id: 0, order: 0 },
  { id: 1, order: 1 },
  { id: 2, order: 2 },
  { id: 3, order: 3 },
  { id: 4, order: 4 },
  { id: 5, order: 5 }
];

const btnStyle = {
  padding: "10px 20px",
  borderRadius: 10,
  background: "#ffd54f",
  border: "none",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: 16
};

function playSound(sound) {
    

  try { const a = new Audio(sound); a.volume = 0.75; a.play().catch(()=>{}); } catch(e){}
}

function arraysEqual(a, b){
  if(a.length!==b.length) return false;
  for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false;
  return true;
}

function shuffleArray(arr){ return [...arr].sort(()=>Math.random()-0.5); }

function pieceBgPos(idx){
  switch(idx){
    case 0: return "0% 0%";
    case 1: return "50% 0%";
    case 2: return "100% 0%";
    case 3: return "0% 50%";
    case 4: return "50% 50%";
    case 5: return "100% 50%";
    default: return "0% 0%";
  }
}

export default function OwlyQuiz(){
  const { t } = useTranslation();
   const STORY_PARAGRAPHS = t("owlyQuiz.story", { returnObjects: true });
const STORY_SUMMARY = t("owlyQuiz.storySummary", { returnObjects: true });
  const navigate = useNavigate();
  const [stage,setStage]=useState("intro");
  const [storyIndex,setStoryIndex]=useState(0);
  const [challengeType,setChallengeType]=useState(null);

  const [pieces,setPieces]=useState(shuffleArray(PUZZLE_PIECES));
  const [selected,setSelected]=useState(null);
  const [timer,setTimer]=useState(15);
  const timerRef=useRef(null);

  const [memorySeq,setMemorySeq]=useState([]);
  const [playerSeq,setPlayerSeq]=useState([]);
  const [memoryButtons,setMemoryButtons]=useState([]);

  const [ballPos,setBallPos]=useState(0);
  const [cups,setCups]=useState([false,false,false]);
  const [ballVisible,setBallVisible]=useState(true);

  const [obsGrid,setObsGrid] = useState([]);
  const [obsQuestion,setObsQuestion] = useState(null);
  const [obsOptions,setObsOptions] = useState([]);
  const [showGrid,setShowGrid] = useState(true);

  const [finalQues,setFinalQues]=useState({question:"Que symbolise Owly dans l’histoire ?",options:["Pouvoir", "Connexion", "Richesse", "Secret"],correct:2});

  const [windowWidth,setWindowWidth] = useState(window.innerWidth);

  useEffect(()=>{
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return ()=> window.removeEventListener("resize", handleResize);
  },[]);

  const getPuzzleSize = () => {
    if(windowWidth >= 1024) return 100;
    if(windowWidth >= 768) return 80;
    return 60;
  };

  const startChallenge=()=>{
    playSound(clickSound);
    setSelected(null);
    setPlayerSeq([]);
    setBallVisible(true);

    const types=["puzzle","memory","cups","obsChallenge","finalPuzzle"];
    const type=types[storyIndex] || "finalPuzzle";
    setChallengeType(type);

    if(type==="puzzle"){
      setPieces(shuffleArray(PUZZLE_PIECES));
      setTimer(15);
      if(timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(()=>{
        setTimer(prev=>{
          if(prev<=1){ clearInterval(timerRef.current); onFail(); return 0; }
          return prev-1;
        });
      },1000);
    }

    if(type==="memory"){
      const seq = shuffleArray(MEMORY_ICONS);
      setMemorySeq(seq);
      setPlayerSeq(seq);
      setMemoryButtons(shuffleArray(seq));
      setTimeout(()=>setPlayerSeq([]),2000);
    }

    if(type==="cups"){
      const idx=Math.floor(Math.random()*3);
      setBallPos(idx);
      const arr=[false,false,false];
      arr[idx]=true;
      setCups(arr);
      setBallVisible(true);
      setTimeout(()=>{
        let moves=0;
        const interval=setInterval(()=>{
          if(moves>=3){ clearInterval(interval); setBallVisible(false); setCups([false,false,false]); }
          else{
            let i=Math.floor(Math.random()*3);
            let j=Math.floor(Math.random()*3);
            while(i===j) j=Math.floor(Math.random()*3);
            const newArr=[...arr];
            [newArr[i],newArr[j]]=[newArr[j],newArr[i]];
            setCups(newArr);
            moves++;
          }
        },800);
      },1000);
    }

    if(type==="obsChallenge"){
      const gridSize = 2;
      const icons = shuffleArray(MEMORY_ICONS).slice(0, gridSize*gridSize);
      setObsGrid(icons);
      setShowGrid(true);

      const qIndex = Math.floor(Math.random() * icons.length);
      setObsQuestion({index: qIndex, icon: icons[qIndex]});

      const options = [icons[qIndex]];
      while(options.length < 4){
        const randIcon = MEMORY_ICONS[Math.floor(Math.random()*MEMORY_ICONS.length)];
        if(!options.includes(randIcon)) options.push(randIcon);
      }
      setObsOptions(shuffleArray(options));

      setTimeout(()=>setShowGrid(false), 3000);
    }

    if(type==="finalPuzzle"){
       setFinalQues({
    question: t("owlyQuiz.final.question"),
    options: shuffleArray(t("owlyQuiz.final.options", { returnObjects: true })),
    correct: 2
  });
    }

    setStage("challenge");
  };

  const onPieceClick=(idx)=>{
    if(challengeType!=="puzzle" && challengeType!=="finalPuzzle") return;
    if(selected===null){ setSelected(idx); return;}
    if(selected===idx){ setSelected(null); return;}
    const newPieces=[...pieces];
    [newPieces[selected],newPieces[idx]]=[newPieces[idx],newPieces[selected]];
    setPieces(newPieces);
    setSelected(null);
    if(newPieces.every((p,i)=>p.order===i)) onWin();
  };

  const onMemoryClick=(s)=>{
    if(challengeType!=="memory") return;
    const next=[...playerSeq,s];
    setPlayerSeq(next);
    const expected=memorySeq.slice(0,next.length);
    if(!arraysEqual(next,expected)) onFail();
    else if(next.length===memorySeq.length) onWin();
  };

  const onCupClick=(i)=>{
    if(challengeType!=="cups") return;
    if(i===ballPos) onWin(); else onFail();
  };

  const onFinalClick=(i)=>{
    if(challengeType!=="finalPuzzle") return;
    if(i===finalQues.correct) onWin(); else onFail();
  };

 const onWin = () => {
  playSound(winSound);
  if (timerRef.current) clearInterval(timerRef.current);

  // Si c’est le dernier paragraphe
  if (storyIndex + 1 >= STORY_PARAGRAPHS.length) {
    setStage("finished");
  } else {
    setStage("story");
    setStoryIndex(prev => prev + 1);
  }
};
  const onFail=()=>{
    playSound(loseSound);
    if(timerRef.current) clearInterval(timerRef.current);
    setStage("lost");
  };

  const nextStage=()=>{ if(storyIndex>=STORY_PARAGRAPHS.length) setStage("finished"); else startChallenge(); };
  const resetGame=()=>{ setStage("intro"); setStoryIndex(0); };

  return(
 <div
  style={{
    height: "100vh",
    backgroundColor: "#FFFF99",
    padding: 20,
    color: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center", // ✅ centre verticalement
    overflow: "hidden"        // ✅ supprime le scroll
  }}
>
{/* BOUTON RETOUR */}
<div className="w-full max-w-[720px] flex justify-start mb-4">
  <button
    onClick={() => navigate("/games")}
    className="
      p-3 
      bg-black text-yellow-400 
      rounded-full 
      shadow-lg 
      hover:bg-gray-800 hover:text-yellow-300 
      transition 
      flex items-center justify-center
      cursor-pointer
    "
  >
    <IoArrowBackOutline className="text-2xl sm:text-3xl" />
  </button>
</div>


      <motion.h1 initial={{y:-50,opacity:0}} animate={{y:0,opacity:1}} style={{fontSize:"3rem"}}>🦉 {t("owlyQuiz.title")} 🦉</motion.h1>

      {/* INTRO */}
      {stage==="intro" && <div style={{maxWidth:720,textAlign:"center",marginTop:40,padding:20,background:"#fff",borderRadius:12}}>
     <p>{t("owlyQuiz.intro")}</p>
            <button onClick={startChallenge} style={btnStyle}>
      {t("owlyQuiz.btn.start")}
    </button>
      </div>}

      {/* PUZZLE */}
      {stage==="challenge" && challengeType==="puzzle" && <div style={{marginTop:30}}>
       <h2>{t("owlyQuiz.puzzle.title")}</h2>
<p>{t("owlyQuiz.puzzle.timer")} : {timer}s</p>
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(3, ${getPuzzleSize()}px)`,
          gridTemplateRows:`repeat(2, ${getPuzzleSize()}px)`,
          gap:6,
          marginTop:20,
          justifyContent:"center"
        }}>
          {pieces.map((p,idx)=>
            <div key={p.id} onClick={()=>onPieceClick(idx)}
              style={{
                width:getPuzzleSize(),
                height:getPuzzleSize(),
                cursor:"pointer",
                border:selected===idx?"3px solid #ffd54f":"2px solid #000",
                borderRadius:6,
                backgroundImage:`url(${OWLY_IMAGE})`,
                backgroundSize:"300% 200%",
                backgroundPosition:pieceBgPos(p.order)
              }}/>
          )}
        </div>
      </div>}

      {/* MEMORY */}
      {stage==="challenge" && challengeType==="memory" && <div style={{textAlign:"center",marginTop:30}}>
        <h2>{t("owlyQuiz.memory.title")}</h2>
        <div style={{fontSize:32,marginBottom:10}}>
          {playerSeq.length>0 ? playerSeq.map(s=>s) : memorySeq.map(()=> "❓")}
        </div>
        <div
  style={{
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 16
  }}
>
  {memoryButtons.map((s, i) => (
    <button
      key={i}
      onClick={() => onMemoryClick(s)}
      style={{ ...btnStyle, minWidth: 60 }}
    >
      {s}
    </button>
  ))}
</div>

      </div>}

      {/* CUPS */}
      {stage==="challenge" && challengeType==="cups" && <div style={{textAlign:"center",marginTop:30}}>
        <h2>{t("owlyQuiz.cups.title")}</h2>
        <div style={{display:"flex",gap:20,justifyContent:"center",marginTop:20}}>
          {cups.map((c,i)=>
            <div key={i} onClick={()=>onCupClick(i)}
              style={{width:getPuzzleSize(),height:getPuzzleSize(),borderRadius:10,backgroundColor:"#fff",border:"2px solid #000",display:"flex",justifyContent:"center",alignItems:"center",cursor:"pointer"}}>
                {ballVisible && c ? "⚪" : ""}
            </div>
          )}
        </div>
      </div>}

      {/* OBSERVATION VISUELLE */}
      {stage==="challenge" && challengeType==="obsChallenge" && <div style={{textAlign:"center",marginTop:30}}>
      <h2>{t("owlyQuiz.observation.title")}</h2>
        {showGrid ? (
          <div style={{display:"grid",gridTemplateColumns:`repeat(2, ${getPuzzleSize()}px)`,gap:10,justifyContent:"center",marginTop:20}}>
            {obsGrid.map((icon,i)=><div key={i} style={{width:getPuzzleSize(),height:getPuzzleSize(),fontSize:getPuzzleSize()/2,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #000",borderRadius:8}}>{icon}</div>)}
          </div>
        ) : (
          <>
            <p>{t("owlyQuiz.observation.question", { pos: obsQuestion.index + 1 })}</p>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:20}}>
              {obsOptions.map((icon,i)=>
                <button key={i} onClick={()=>{if(icon===obsQuestion.icon) onWin(); else onFail();}} style={btnStyle}>{icon}</button>
              )}
            </div>
          </>
        )}
      </div>}

      {/* FINAL */}
      {stage==="challenge" && challengeType==="finalPuzzle" && <div style={{textAlign:"center",marginTop:30}}>
       <h2>{t("owlyQuiz.final.title")}</h2>
        <p>{finalQues.question}</p>
        <div
  style={{
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",        // ✅ RESPONSIVE
    marginTop: 20
  }}
>
  {finalQues.options.map((opt, i) => (
    <button
      key={i}
      onClick={() => onFinalClick(i)}
      style={{
        ...btnStyle,
        minWidth: 120,       // ✅ même taille
        flex: "1 1 120px",   // ✅ s’adapte au mobile
        maxWidth: 200
      }}
    >
      {opt}
    </button>
  ))}
</div>

      </div>}

      {/* STORY */}
{stage==="story" && <div style={{maxWidth:720,marginTop:40,padding:20,background:"#fff",borderRadius:12}}>
  <p style={{
  lineHeight: "1.4rem",
  fontSize: windowWidth < 768 ? "0.9rem" : "1.1rem"
}}>
  {STORY_PARAGRAPHS[storyIndex-1]}
</p>

  {/* Vérifier si c’est le dernier paragraphe */}
  {storyIndex < STORY_PARAGRAPHS.length ? (
    <button onClick={nextStage} style={{...btnStyle,marginTop:20}}>{t("owlyQuiz.btn.nextChallenge")}</button>
  ) : (
    // Si c’est le dernier, afficher le stage "finished"
    <div style={{marginTop:20, textAlign:"center"}}>
      <h2>{t("owlyQuiz.finished.title")}</h2>
      {STORY_PARAGRAPHS.map((p,i)=>(
  <p key={i} style={{
    lineHeight: "1.4rem",
    fontSize: windowWidth < 768 ? "0.9rem" : "1.1rem"
  }}>
    {p}
  </p>
))}
      <button onClick={resetGame} style={{...btnStyle,marginTop:20}}>{t("owlyQuiz.btn.replay")}</button>
    </div>
  )}
</div>}

      {/* LOST */}
      {stage==="lost" && <div style={{maxWidth:720,marginTop:40,padding:20,background:"#fff",borderRadius:12,textAlign:"center"}}>
       <h2>{t("owlyQuiz.stages.gameOver")}</h2>
      <p>{t("owlyQuiz.stages.lostText")}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
  <button onClick={startChallenge} style={btnStyle}>
   {t("owlyQuiz.btn.retry")}
  </button>
  <button onClick={resetGame} style={btnStyle}>
   {t("owlyQuiz.btn.restart")}
  </button>
</div>
      </div>}

      {/* FIN */}
 {/* FIN */}
{stage==="finished" && (
  <div
    style={{
      width: "100%",
      maxWidth: 720,
      marginTop: 40,
      padding: windowWidth < 768 ? 10 : 20,
      background: "#fff",
      borderRadius: 12,
      boxSizing: "border-box",
      textAlign: "center"
    }}
  >
    <h2 style={{ fontSize: windowWidth < 768 ? "1.2rem" : "1.5rem" }}> 🎉 {t("owlyQuiz.finished.title")} 🎉</h2>
    {STORY_SUMMARY.map((p, i) => (
      <p
        key={i}
        style={{
          lineHeight: windowWidth < 768 ? "1.4rem" : "1.6rem",
          fontSize: windowWidth < 768 ? "0.9rem" : "1.1rem",
          marginBottom: 12
        }}
      >
        {p}
      </p>
    ))}
    <button onClick={resetGame} style={{ ...btnStyle, marginTop: 20 }}>
  {t("owlyQuiz.btn.replay")}
</button>
  </div>
)}




    </div>
  );
}
