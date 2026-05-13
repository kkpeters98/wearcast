import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { getOutfitType } from './OutfitScene';

// ─── Scene constants ──────────────────────────────────────────────────────────
const SCENE_H  = 190;
const GROUND_H = 50;
const SKY_H    = SCENE_H - GROUND_H;   // 140
const CHAR_W   = 28;
const CHAR_H   = 60;
const CHAR_Y   = SKY_H - CHAR_H + 2;
const WALK_DUR = 7000;   // ms per half-cycle — leisurely Zelda pace

// ─── Outfit items ─────────────────────────────────────────────────────────────
const ITEMS = {
  hot:      { top:['Tank Top',    '#FFB347'], bot:['Shorts',      '#87CEEB'], shoe:['Sandals',      '#D2B48C'] },
  warm:     { top:['T-Shirt',     '#87CEEB'], bot:['Shorts',      '#C8A96E'], shoe:['Sneakers',     '#e0e0e0'] },
  mild:     { top:['Long Sleeve', '#7EB8D3'], bot:['Jeans',       '#4169E1'], shoe:['Sneakers',     '#e0e0e0'] },
  cool:     { top:['Sweater',     '#CC7744'], bot:['Jeans',       '#4169E1'], shoe:['Sneakers',     '#e0e0e0'] },
  cold:     { top:['Jacket',      '#4B5563'], bot:['Jeans',       '#4169E1'], shoe:['Ankle Boots',  '#6B4226'] },
  freezing: { top:['Winter Coat', '#1E3A8A'], bot:['Jeans',       '#4169E1'], shoe:['Winter Boots', '#374151'] },
  rain:     { top:['Rain Jacket', '#0D9488'], bot:['Jeans',       '#4169E1'], shoe:['Rain Boots',   '#1F2937'] },
  snow:     { top:['Parka',       '#7C3AED'], bot:['Jeans',       '#4169E1'], shoe:['Snow Boots',   '#374151'] },
  formal:   { top:['Blazer',      '#1a1a2e'], bot:['Dress Pants', '#2d2d4a'], shoe:['Dress Shoes',  '#111'] },
  athletic: { top:['Athletic Top','#EF4444'], bot:['Shorts',      '#1E3A8A'], shoe:['Runners',      '#f8f8f8'] },
};

// ─── Sky colours ──────────────────────────────────────────────────────────────
const SKY = {
  hot:      { am:'#FBBF24', pm:'#F59E0B', ev:'#F97316' },
  warm:     { am:'#93C5FD', pm:'#60A5FA', ev:'#818CF8' },
  mild:     { am:'#BAE6FD', pm:'#7DD3FC', ev:'#A5B4FC' },
  cool:     { am:'#C7D2FE', pm:'#818CF8', ev:'#6366F1' },
  cold:     { am:'#BFDBFE', pm:'#60A5FA', ev:'#3B82F6' },
  freezing: { am:'#E0F2FE', pm:'#BAE6FD', ev:'#93C5FD' },
  rain:     { am:'#64748B', pm:'#475569', ev:'#334155' },
  snow:     { am:'#E2E8F0', pm:'#CBD5E1', ev:'#94A3B8' },
  formal:   { am:'#0D1B2A', pm:'#0D1B2A', ev:'#050D14' },
  athletic: { am:'#A7F3D0', pm:'#34D399', ev:'#059669' },
};

const GROUND_COL = {
  hot:'#B45309', warm:'#16A34A', mild:'#15803D', cool:'#166534',
  cold:'#14532D', freezing:'#CBD5E1', rain:'#334155', snow:'#E2E8F0',
  formal:'#1E293B', athletic:'#15803D',
};

// sandy path colour (shows inside ground strip)
const PATH_COL = {
  hot:'#D97706', warm:'#A3C26A', mild:'#86EFAC', cool:'#4ADE80',
  cold:'#22C55E', freezing:'#F0F9FF', rain:'#475569', snow:'#F8FAFC',
  formal:'#334155', athletic:'#86EFAC',
};

function tk(tb) { return tb==='morning'?'am':tb==='evening'?'ev':'pm'; }

// ─── Location flavour ─────────────────────────────────────────────────────────
function locType(loc) {
  const s=(loc||'').toLowerCase();
  if(/beach|miami|hawaii|malibu|san diego|cancun|ibiza/.test(s)) return 'beach';
  if(/york|chicago|boston|london|paris|tokyo|city|angeles|brooklyn/.test(s)) return 'city';
  if(/mountain|denver|boulder|aspen|alps|rockies|vail|tahoe/.test(s)) return 'mountain';
  return 'generic';
}

// ─── Background silhouettes ───────────────────────────────────────────────────
const DIM = 'rgba(0,0,0,0.15)';

// Zelda-style rounded bush clusters
function BushBG() {
  const clusters = [
    {x:4,  bases:[22,30,20]},
    {x:54, bases:[18,26]},
    {x:130,bases:[24,20,18]},
    {x:200,bases:[20,28,22]},
    {x:256,bases:[26,20]},
  ];
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:GROUND_H-4}]} pointerEvents="none">
      {clusters.map((c,i)=>(
        <View key={i} style={{position:'absolute',bottom:0,left:c.x,flexDirection:'row',alignItems:'flex-end'}}>
          {c.bases.map((s,j)=>(
            <View key={j} style={{width:s,height:s,borderRadius:s/2,backgroundColor:DIM,marginHorizontal:-3}}/>
          ))}
        </View>
      ))}
    </View>
  );
}

// Mountains
function MountainBG() {
  const ms=[{x:-10,w:130,h:88},{x:75,w:165,h:108},{x:185,w:140,h:82}];
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:GROUND_H}]} pointerEvents="none">
      {ms.map((m,i)=>(
        <View key={i} style={{position:'absolute',bottom:0,left:m.x,width:0,height:0,
          borderLeftWidth:m.w/2,borderRightWidth:m.w/2,borderBottomWidth:m.h,
          borderLeftColor:'transparent',borderRightColor:'transparent',borderBottomColor:DIM}}/>
      ))}
    </View>
  );
}

// City with pre-computed glowing windows
const CITY_BUILDINGS = [
  {l:0,w:28,h:68},{l:30,w:18,h:90},{l:51,w:24,h:56},{l:78,w:16,h:80},{l:97,w:20,h:98},
  {l:164,w:22,h:76},{l:189,w:16,h:60},{l:208,w:28,h:85},{l:239,w:18,h:52},{l:260,w:22,h:92},
];
function buildWindows(b) {
  const rows = Math.floor((b.h-10)/14);
  const cols = Math.floor((b.w-4)/8);
  const ws = [];
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    if(Math.random()>0.38) ws.push({top:8+r*14,left:4+c*8});
  }
  return ws;
}
const CITY_WINDOWS = CITY_BUILDINGS.map(b=>({...b,windows:buildWindows(b)}));

function CityBG({ isNight }) {
  const bgCol  = isNight ? 'rgba(10,20,35,0.92)' : DIM;
  const winCol = isNight ? '#FEF08A' : 'transparent';
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:0,height:102}]} pointerEvents="none">
      {CITY_WINDOWS.map((b,i)=>(
        <View key={i} style={{position:'absolute',bottom:0,left:b.l,width:b.w,height:b.h,backgroundColor:bgCol}}>
          {isNight && b.windows.map((w,j)=>(
            <View key={j} style={{position:'absolute',top:w.top,left:w.left,
              width:4,height:5,backgroundColor:winCol,opacity:0.8}}/>
          ))}
        </View>
      ))}
    </View>
  );
}

// Beach with palm trees
function BeachBG() {
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:GROUND_H-2}]} pointerEvents="none">
      <View style={{position:'absolute',bottom:0,left:18,width:7,height:58,backgroundColor:DIM,borderRadius:4,transform:[{rotate:'6deg'}]}}/>
      {[-35,-14,5,22,40].map((r,i)=>(
        <View key={i} style={{position:'absolute',bottom:52,left:10,width:36,height:7,
          backgroundColor:DIM,borderRadius:4,transform:[{rotate:`${r}deg`}]}}/>
      ))}
      <View style={{position:'absolute',bottom:0,right:22,width:6,height:44,backgroundColor:DIM,borderRadius:3}}/>
      {[-28,-8,10,26].map((r,i)=>(
        <View key={i} style={{position:'absolute',bottom:38,right:14,width:28,height:6,
          backgroundColor:DIM,borderRadius:3,transform:[{rotate:`${r}deg`}]}}/>
      ))}
    </View>
  );
}

// ─── Celestial (sun / moon) ───────────────────────────────────────────────────
function Celestial({ outfitType, timeBlock, skyColor }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const isNight = outfitType==='formal'||timeBlock==='evening';
  useEffect(()=>{
    if(!isNight) Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1.12,duration:2400,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1,   duration:2400,useNativeDriver:true}),
    ])).start();
  },[]);
  const timeK = tk(timeBlock);
  const left  = timeK==='am'?'10%': timeK==='ev'?'74%':'44%';
  const top   = timeK==='pm'?10:24;
  if(isNight) return (
    <View style={{position:'absolute',top,left}}>
      <View style={{width:26,height:26,borderRadius:13,backgroundColor:'#FEF9C3'}}/>
      <View style={{position:'absolute',top:-2,left:6,width:24,height:24,borderRadius:12,backgroundColor:skyColor}}/>
    </View>
  );
  const sunCol=timeK==='ev'?'#FCA5A5':timeK==='am'?'#FDE68A':'#FEF08A';
  return(
    <Animated.View style={{position:'absolute',top,left,transform:[{scale:pulse}]}}>
      <View style={{width:32,height:32,borderRadius:16,backgroundColor:sunCol,opacity:0.95}}/>
    </Animated.View>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars() {
  const t=useRef(new Animated.Value(0.4)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(t,{toValue:1,  duration:1000,useNativeDriver:true}),
      Animated.timing(t,{toValue:0.3,duration:1000,useNativeDriver:true}),
    ])).start();
  },[]);
  const pts=[{x:25,y:10},{x:75,y:6},{x:125,y:18},{x:175,y:8},{x:225,y:14},{x:285,y:7},{x:310,y:20}];
  return(
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pts.map((p,i)=>(
        <Animated.Text key={i} style={{position:'absolute',top:p.y,left:p.x,
          color:'#FEF9C3',fontSize:7,opacity:t}}>★</Animated.Text>
      ))}
    </View>
  );
}

// Street lamp glow (formal/night)
function StreetLamps({ sceneW }) {
  const positions = [sceneW*0.2, sceneW*0.5, sceneW*0.78];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {positions.map((x,i)=>(
        <View key={i}>
          {/* Lamp post */}
          <View style={{position:'absolute',bottom:GROUND_H-2,left:x,width:3,height:28,backgroundColor:'#4B5563'}}/>
          {/* Glow halo */}
          <View style={{position:'absolute',bottom:GROUND_H+20,left:x-12,width:28,height:14,
            borderRadius:14,backgroundColor:'rgba(254,240,138,0.25)'}}/>
          {/* Bulb */}
          <View style={{position:'absolute',bottom:GROUND_H+24,left:x-2,width:7,height:7,
            borderRadius:4,backgroundColor:'#FEF08A',opacity:0.9}}/>
        </View>
      ))}
    </View>
  );
}

// ─── Drifting clouds ──────────────────────────────────────────────────────────
function Cloud({ startX, y, dur, sceneW }) {
  const x=useRef(new Animated.Value(startX)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(x,{toValue:sceneW+90,duration:dur,useNativeDriver:true}),
      Animated.timing(x,{toValue:-90,duration:0,useNativeDriver:true}),
    ])).start();
  },[]);
  return(
    <Animated.View style={{position:'absolute',top:y,transform:[{translateX:x}]}}>
      <View style={{flexDirection:'row',alignItems:'flex-end'}}>
        <View style={{width:24,height:13,borderRadius:7,backgroundColor:'rgba(255,255,255,0.82)',marginRight:-5}}/>
        <View style={{width:36,height:20,borderRadius:10,backgroundColor:'rgba(255,255,255,0.88)'}}/>
        <View style={{width:20,height:12,borderRadius:6,backgroundColor:'rgba(255,255,255,0.82)',marginLeft:-5}}/>
      </View>
    </Animated.View>
  );
}

// ─── Rain ─────────────────────────────────────────────────────────────────────
function Rain({ sceneW }) {
  const n=10;
  const anims=useRef(Array.from({length:n},()=>new Animated.Value(0))).current;
  useEffect(()=>{
    anims.forEach((a,i)=>{
      const go=()=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:500+i*35,useNativeDriver:true}).start(go);};
      setTimeout(go,i*120);
    });
  },[]);
  return(
    <View style={[StyleSheet.absoluteFill,{height:SKY_H}]} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.View key={i} style={{position:'absolute',left:(sceneW/n)*i+4,top:0,
          width:1.5,height:12,backgroundColor:'rgba(148,163,184,0.7)',borderRadius:1,
          transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H]})}],
          opacity:a.interpolate({inputRange:[0,0.8,1],outputRange:[0.8,0.8,0]})}}/>
      ))}
    </View>
  );
}

// ─── Snow ─────────────────────────────────────────────────────────────────────
function Snow({ sceneW }) {
  const n=9;
  const anims=useRef(Array.from({length:n},()=>new Animated.Value(0))).current;
  const xs=useRef(Array.from({length:n},(_,i)=>12+(sceneW/n)*i)).current;
  useEffect(()=>{
    anims.forEach((a,i)=>{
      const go=()=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:2400+i*180,useNativeDriver:true}).start(go);};
      setTimeout(go,i*300);
    });
  },[]);
  return(
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.Text key={i} style={{position:'absolute',left:xs[i],fontSize:11,color:'rgba(255,255,255,0.9)',
          transform:[
            {translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H+10]})},
            {translateX:a.interpolate({inputRange:[0,0.5,1],outputRange:[0,10,0]})},
          ],
          opacity:a.interpolate({inputRange:[0,0.85,1],outputRange:[1,1,0]})}}>✦</Animated.Text>
      ))}
    </View>
  );
}

// ─── Ground details ───────────────────────────────────────────────────────────
function GroundDetails({ outfitType, sceneW }) {
  if(outfitType==='rain') return (
    <>
      {[30,110,195].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:8,left:x,width:26,height:7,
          borderRadius:4,backgroundColor:'rgba(148,163,184,0.45)'}}/>
      ))}
    </>
  );
  if(['snow','freezing'].includes(outfitType)) return (
    <>
      {[15,85,165,240].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:5,left:x,width:32+i*6,height:12,
          borderRadius:10,backgroundColor:'rgba(255,255,255,0.7)'}}/>
      ))}
    </>
  );
  if(['mild','cool','warm','athletic'].includes(outfitType)) return (
    <>
      {[28,108,188].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:10,left:x,alignItems:'center'}}>
          <View style={{width:7,height:7,borderRadius:4,backgroundColor:['#FCD34D','#F9A8D4','#86EFAC'][i]}}/>
          <View style={{width:2,height:8,backgroundColor:'#15803D'}}/>
        </View>
      ))}
    </>
  );
  return null;
}

// ─── Character ────────────────────────────────────────────────────────────────
function Char({ items, legAnim, kickAnim, gender }) {
  const topCol  = items.top[1];
  const botCol  = items.bot[1];
  const shoeCol = items.shoe[1];

  const lLegY = legAnim.interpolate({inputRange:[-1,1],outputRange:[-5,5]});
  const rLegY = Animated.add(
    legAnim.interpolate({inputRange:[-1,1],outputRange:[5,-5]}),
    kickAnim.interpolate({inputRange:[0,1],outputRange:[0,11]})
  );
  const rFootX = kickAnim.interpolate({inputRange:[0,1],outputRange:[0,10]});
  const bodyY  = legAnim.interpolate({inputRange:[-1,0,1],outputRange:[-2,-3,-2]});

  const hairCol = gender==='womens'?'#D97706': gender==='mens'?'#374151':'#9CA3AF';

  return(
    <Animated.View style={{alignItems:'center',transform:[{translateY:bodyY}]}}>
      {/* Hair */}
      {gender!=='neutral'&&(
        <View style={{width:gender==='womens'?24:22,height:gender==='womens'?10:7,
          borderTopLeftRadius:12,borderTopRightRadius:12,backgroundColor:hairCol,marginBottom:-3}}/>
      )}
      {/* Head */}
      <View style={{width:22,height:22,borderRadius:11,backgroundColor:'#FBBF91',
        alignItems:'center',justifyContent:'center'}}>
        <View style={{flexDirection:'row',gap:5,marginTop:2}}>
          <View style={{width:3,height:3,borderRadius:2,backgroundColor:'#1F2937'}}/>
          <View style={{width:3,height:3,borderRadius:2,backgroundColor:'#1F2937'}}/>
        </View>
      </View>
      {/* Body + arms */}
      <View style={{flexDirection:'row',alignItems:'center',marginTop:1}}>
        <View style={{width:5,height:13,borderRadius:3,backgroundColor:topCol,marginRight:1}}/>
        <View style={{width:18,height:16,borderRadius:4,backgroundColor:topCol}}/>
        <View style={{width:5,height:13,borderRadius:3,backgroundColor:topCol,marginLeft:1}}/>
      </View>
      {/* Legs */}
      <View style={{flexDirection:'row',gap:3,marginTop:1}}>
        <Animated.View style={{width:8,height:18,borderRadius:4,backgroundColor:botCol,transform:[{translateY:lLegY}]}}/>
        <Animated.View style={{width:8,height:18,borderRadius:4,backgroundColor:botCol,transform:[{translateY:rLegY}]}}/>
      </View>
      {/* Shoes */}
      <View style={{flexDirection:'row',gap:3,marginTop:1}}>
        <View style={{width:10,height:6,borderRadius:3,backgroundColor:shoeCol}}/>
        <Animated.View style={{width:10,height:6,borderRadius:3,backgroundColor:shoeCol,transform:[{translateX:rFootX}]}}/>
      </View>
      {/* Ground shadow */}
      <View style={{width:22,height:5,borderRadius:11,backgroundColor:'rgba(0,0,0,0.14)',marginTop:1}}/>
    </Animated.View>
  );
}

// ─── Clothing chip ────────────────────────────────────────────────────────────
function Chip({ label, color }) {
  return(
    <View style={s.chip}>
      <View style={[s.swatch,{backgroundColor:color}]}/>
      <Text style={s.chipTxt}>{label}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WeatherUniverse({
  weather, eventType='casual', gender='neutral', timeBlock='fullday', location=''
}) {
  const [sceneW, setSceneW] = useState(300);
  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setSceneW(w);
  };

  const CHAR_MAX = sceneW - CHAR_W - 8;
  const ROCK_POS = sceneW * 0.60;

  const outfitType = getOutfitType(weather, eventType);
  const items      = ITEMS[outfitType] || ITEMS.mild;
  const timeK      = tk(timeBlock);
  const skyColor   = (SKY[outfitType]||SKY.mild)[timeK];
  const groundCol  = GROUND_COL[outfitType]||'#15803D';
  const pathCol    = PATH_COL[outfitType]||'#86EFAC';
  const bgLoc      = locType(location);
  const isNight    = outfitType==='formal'||timeBlock==='evening';
  const isStorm    = ['rain','snow','freezing'].includes(outfitType);

  // ── Animations ──────────────────────────────────────────────────────────────
  const walkX    = useRef(new Animated.Value(20)).current;
  const scaleX   = useRef(new Animated.Value(1)).current;
  const legAnim  = useRef(new Animated.Value(0)).current;
  const kickAnim = useRef(new Animated.Value(0)).current;
  const rockFly  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (sceneW === 300 && CHAR_MAX === 264) return; // wait for real layout

    // Leisurely walk back and forth
    const walk = (toRight) => {
      scaleX.setValue(toRight ? 1 : -1);
      Animated.timing(walkX, {
        toValue: toRight ? CHAR_MAX : 20,
        duration: WALK_DUR,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) walk(!toRight); });
    };
    walk(true);

    // Leg swing (slower to match walk pace)
    Animated.loop(Animated.sequence([
      Animated.timing(legAnim,{toValue:1, duration:380,useNativeDriver:true}),
      Animated.timing(legAnim,{toValue:-1,duration:380,useNativeDriver:true}),
    ])).start();

    // Kick at ~60% of each half-walk
    // t=4200ms going right, t=4200+2800=7000+2800=9800ms going left
    // Cycle total = 14000ms
    const doKick = () => Animated.sequence([
      Animated.delay(4200),
      Animated.timing(kickAnim,{toValue:1,duration:200,useNativeDriver:true}),
      Animated.timing(kickAnim,{toValue:0,duration:200,useNativeDriver:true}),
      Animated.delay(5240),  // 4200+400+5240 = 9840 ≈ second kick point
      Animated.timing(kickAnim,{toValue:1,duration:200,useNativeDriver:true}),
      Animated.timing(kickAnim,{toValue:0,duration:200,useNativeDriver:true}),
      Animated.delay(3960),  // remainder to 14000
    ]).start(doKick);
    doKick();

    // Rock reacts to kick
    const doRock = () => Animated.sequence([
      Animated.delay(4400),
      Animated.timing(rockFly,{toValue:30, duration:340,useNativeDriver:true}),
      Animated.timing(rockFly,{toValue:0,  duration:800,useNativeDriver:true}),
      Animated.delay(5020),
      Animated.timing(rockFly,{toValue:-30,duration:340,useNativeDriver:true}),
      Animated.timing(rockFly,{toValue:0,  duration:800,useNativeDriver:true}),
      Animated.delay(3260),
    ]).start(doRock);
    doRock();

    return () => {
      walkX.stopAnimation();
      legAnim.stopAnimation();
    };
  }, [sceneW]);

  return (
    <View style={s.wrap}>
      {/* ── Scene ── */}
      <View
        style={[s.scene, { backgroundColor: skyColor }]}
        onLayout={onLayout}
      >
        {/* Sky elements */}
        {isNight && <Stars />}
        <Celestial outfitType={outfitType} timeBlock={timeBlock} skyColor={skyColor} />
        {isNight && outfitType==='formal' && <StreetLamps sceneW={sceneW} />}
        {!isStorm && !isNight && (
          <>
            <Cloud startX={40}   y={14} dur={16000} sceneW={sceneW} />
            <Cloud startX={-70}  y={30} dur={22000} sceneW={sceneW} />
          </>
        )}

        {/* Weather FX */}
        {outfitType==='rain' && <Rain sceneW={sceneW} />}
        {['snow','freezing'].includes(outfitType) && <Snow sceneW={sceneW} />}

        {/* Background */}
        {bgLoc==='city'     && <CityBG isNight={isNight} />}
        {bgLoc==='mountain' && <MountainBG />}
        {bgLoc==='beach'    && <BeachBG />}
        {bgLoc==='generic'  && <BushBG />}

        {/* Ground strip */}
        <View style={[s.ground,{backgroundColor:groundCol,width:sceneW}]}>
          {/* Sandy path where character walks */}
          <View style={{position:'absolute',top:10,left:0,right:0,bottom:0,
            backgroundColor:pathCol,opacity:0.45,borderRadius:4}}/>
          <GroundDetails outfitType={outfitType} sceneW={sceneW} />
        </View>

        {/* Rock */}
        <Animated.View style={{position:'absolute',top:SKY_H-10,left:ROCK_POS,
          transform:[{translateX:rockFly}]}}>
          <View style={{width:10,height:8,borderRadius:5,backgroundColor:'rgba(0,0,0,0.20)'}}/>
        </Animated.View>

        {/* Character */}
        <Animated.View style={{
          position:'absolute', top:CHAR_Y, left:0,
          transform:[{translateX:walkX},{scaleX:scaleX}],
          width:CHAR_W,
        }}>
          <Char items={items} legAnim={legAnim} kickAnim={kickAnim} gender={gender}/>
        </Animated.View>

        {/* Corner badges */}
        {eventType!=='casual' && (
          <View style={[s.badge,{right:10}]}>
            <Text style={s.badgeTxt}>{eventType.charAt(0).toUpperCase()+eventType.slice(1)}</Text>
          </View>
        )}
        {timeBlock!=='fullday' && (
          <View style={[s.badge,{left:10}]}>
            <Text style={s.badgeTxt}>{timeBlock.charAt(0).toUpperCase()+timeBlock.slice(1)}</Text>
          </View>
        )}
      </View>

      {/* ── Clothing chips ── */}
      <View style={s.chips}>
        <Chip label={items.top[0]}  color={items.top[1]}  />
        <Chip label={items.bot[0]}  color={items.bot[1]}  />
        <Chip label={items.shoe[0]} color={items.shoe[1]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  scene: { height: SCENE_H, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  ground:{ position:'absolute', bottom:0, left:0, height:GROUND_H, overflow:'hidden' },
  chips: { flexDirection:'row', gap:8, marginTop:10 },
  chip:  { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'#f5f5f5',
           borderRadius:10, paddingHorizontal:10, paddingVertical:9, gap:7 },
  swatch:{ width:12, height:12, borderRadius:6, flexShrink:0 },
  chipTxt:{ fontSize:12, fontWeight:'600', color:'#333', flexShrink:1 },
  badge: { position:'absolute', top:10, backgroundColor:'rgba(0,0,0,0.28)',
           borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  badgeTxt:{ fontSize:10, color:'#fff', fontWeight:'700' },
});
