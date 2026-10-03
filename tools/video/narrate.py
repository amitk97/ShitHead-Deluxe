# Voiceover for howto-voice.js: Kokoro TTS (pip install kokoro-onnx soundfile),
# model files kokoro-v1.0.onnx + voices-v1.0.bin in $KOKORO_DIR. Voice = owner's pick
# (v309): British George blended with lively Puck, each phrase its own pace and
# pitch (rubberband) so it isn't flat. Write "Shithead" (one word) so it isn't said
# as two. Output: narration/scene-NN.wav + narration/timing.json (lengths, phrase starts).
import numpy as np, soundfile as sf, subprocess, json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "narration"); os.makedirs(D, exist_ok=True)
KD = os.environ.get("KOKORO_DIR", ".")
from kokoro_onnx import Kokoro
k = Kokoro(os.path.join(KD, "kokoro-v1.0.onnx"), os.path.join(KD, "voices-v1.0.bin"))
FF = os.environ.get("FFMPEG_FULL", "ffmpeg")  # needs rubberband
V = k.get_voice_style("bm_george")*.6 + k.get_voice_style("am_puck")*.4
# Each phrase: (text, gap after, speed, pitch semitones). Same recipe as the approved line 1.
S = [
 [("Welcome to Shithead Deluxe!",.16,1.32,1.5),("The aim is simple:",.08,1.4,-.5),("don't be the last one holding cards!",.05,1.34,1)],
 [("Everyone starts with three cards face down,",.1,1.34,.8),("three face up on top,",.08,1.36,0),("and three in their hand.",.25,1.34,.6),
  ("Nobody,",.1,1.3,1.2),("not even you,",.1,1.32,.3),("knows what's under the face-down cards!",.05,1.32,1)],
 [("Before play begins,",.06,1.38,.8),("you can swap cards between your hand and your face-up row.",.2,1.36,0),
  ("Put your strongest cards face up,",.06,1.34,1),("and save them for later!",.18,1.34,.3),
  ("That means twos, threes, tens, Aces and Jokers,",.08,1.3,1.2),("or simply your highest cards.",.2,1.34,0),
  ("Press Ready when you're happy!",.05,1.34,1)],
 [("On your turn,",.06,1.38,.8),("play a card that's equal to or higher than the top of the Pile.",.2,1.34,0),
  ("You can play several cards of the same rank at once!",.2,1.32,1),
  ("Afterwards, draw back up to three,",.06,1.36,.3),("while the Deck lasts.",.05,1.36,-.3)],
 [("Can't play?",.12,1.3,1.5),("Then you pick up the whole Pile!",.2,1.32,.8),("Sometimes, that's just the price of a bad hand.",.05,1.34,-.3)],
 [("Some cards have powers!",.18,1.32,1.5),("A two resets the Pile,",.06,1.34,.6),("so anything can follow.",.16,1.36,-.2),
  ("A three is see-through:",.06,1.32,1),("you beat the card beneath it.",.16,1.36,0),
  ("A six means even cards only;",.06,1.34,.8),("a Jack means odd.",.16,1.34,0),("A seven means seven or lower.",.05,1.34,.5)],
 [("An eight skips the next player.",.14,1.34,.8),("A nine reverses the direction of play.",.14,1.34,.2),
  ("A ten burns the Pile completely!",.1,1.3,1.5),("And so do four of the same card in a row.",.14,1.34,.3),
  ("Whoever burns it goes again!",.05,1.32,1)],
 [("You don't need to remember all of this!",.16,1.32,1.2),("Tap the round button with the i for Card Powers:",.06,1.36,.4),
  ("every card and what it does.",.16,1.36,-.2),("Tap the grid button for the Play Matrix,",.06,1.36,.6),
  ("which shows exactly which card can go on which.",.14,1.36,0),("Both are always there on the table.",.05,1.34,.5)],
 [("The Joker makes any player you choose pick up the Pile!",.1,1.32,1.2),("Unless they block it with a Joker of their own.",.05,1.34,0)],
 [("Once the Deck and your hand are empty,",.06,1.36,.6),("play your face-up cards.",.16,1.34,.2),
  ("Then flip your face-down cards blind,",.06,1.32,1),("one at a time.",.16,1.34,0),
  ("If it can't go on the Pile,",.06,1.34,.6),("you pick the Pile up!",.05,1.32,.9)],
 [("Empty all your cards to escape!",.16,1.32,1.2),("The last player left holding cards is the Shithead!",.25,1.32,.6),
  ("Good luck...",.14,1.28,.8),("and don't let it be you!",.05,1.32,1.2)],
]
# Owner: "slow it down a bit" (after the first cut): every phrase's pace x PACE, pauses x GAPS.
PACE, GAPS = 0.88, 1.4
durs=[];starts=[]
for i,scene in enumerate(S):
    out=[];st0=[]
    for t,gap,sp,st in scene:
        st0.append(round(sum(len(o) for o in out)/24000,2))
        a,sr=k.create(t,voice=V,speed=sp*PACE,lang="en-gb"); sf.write(os.path.join(D, "p.wav"),a,sr)
        subprocess.run([FF,"-y","-loglevel","error","-i",os.path.join(D, "p.wav"),"-af",f"rubberband=pitch={2**(st/12):.4f}",os.path.join(D, "q.wav")],check=True)
        b,_=sf.read(os.path.join(D, "q.wav"),dtype="float32"); out+=[b,np.zeros(int(sr*gap*GAPS),dtype="float32")]
    x=np.concatenate(out); sf.write(os.path.join(D, f"scene-{i+1:02d}.wav"),x,sr); durs.append(round(len(x)/sr,2)); starts.append(st0)
json.dump({"durs":durs,"starts":starts},open(os.path.join(D, "timing.json"),"w")); print(durs, sum(durs))
