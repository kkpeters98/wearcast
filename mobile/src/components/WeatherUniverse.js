import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Ellipse, Circle, G } from 'react-native-svg';
import { getOutfitType } from './OutfitScene';

// ─── Scene constants ──────────────────────────────────────────────────────────
const SCENE_H  = 240;
const GROUND_H = 55;
const SKY_H    = SCENE_H - GROUND_H;   // 185
const CHAR_W   = 52;
const CHAR_H   = 120;
const CHAR_Y   = SKY_H - CHAR_H + 2;   // 67
const WALK_DUR = 7000;

const ITEMS = {
  hot:      { top:['Tank Top',    '#FF8C00'], bot:['Shorts',      '#87CEEB'], shoe:['Sandals',      '#C8A850'] },
  warm:     { top:['T-Shirt',     '#5DADE2'], bot:['Shorts',      '#C8A96E'], shoe:['Sneakers',     '#D0D0D0'] },
  mild:     { top:['Long Sleeve', '#5B9BD5'], bot:['Jeans',       '#3A5FCD'], shoe:['Sneakers',     '#D0D0D0'] },
  cool:     { top:['Sweater',     '#CC6633'], bot:['Jeans',       '#3A5FCD'], shoe:['Sneakers',     '#D0D0D0'] },
  cold:     { top:['Jacket',      '#4A5568'], bot:['Jeans',       '#3A5FCD'], shoe:['Ankle Boots',  '#7B5230'] },
  freezing: { top:['Winter Coat', '#1E40AF'], bot:['Jeans',       '#3A5FCD'], shoe:['Winter Boots', '#374151'] },
  rain:     { top:['Rain Jacket', '#0F9488'], bot:['Jeans',       '#3A5FCD'], shoe:['Rain Boots',   '#1A2535'] },
  snow:     { top:['Parka',       '#7C3AED'], bot:['Jeans',       '#3A5FCD'], shoe:['Snow Boots',   '#374151'] },
  formal:   { top:['Blazer',      '#2D3748'], bot:['Dress Pants', '#1A202C'], shoe:['Dress Shoes',  '#111827'] },
  athletic: { top:['Athletic Top','#E53E3E'], bot:['Shorts',      '#1A3A8A'], shoe:['Runners',      '#F0F0F0'] },
};

// Sky gradient: top → bottom.  isNight is driven by timeBlock only.
const SKY_GRAD = {
  hot:      { am:['#F59E0B','#FBBF24','#FDE68A'], pm:['#EA580C','#F97316','#FED7AA'], ev:['#7C2D12','#C2410C','#F97316'] },
  warm:     { am:['#1D4ED8','#3B82F6','#93C5FD'], pm:['#1E40AF','#60A5FA','#BAE6FD'], ev:['#312E81','#6366F1','#A5B4FC'] },
  mild:     { am:['#0369A1','#0EA5E9','#7DD3FC'], pm:['#0284C7','#38BDF8','#BAE6FD'], ev:['#1E3A5F','#3B82F6','#93C5FD'] },
  cool:     { am:['#3730A3','#818CF8','#C7D2FE'], pm:['#2E1065','#6D28D9','#A78BFA'], ev:['#1E1B4B','#312E81','#4338CA'] },
  cold:     { am:['#1E3A5F','#1D4ED8','#60A5FA'], pm:['#1E3A8A','#2563EB','#93C5FD'], ev:['#0A0F2E','#1E3A8A','#1D4ED8'] },
  freezing: { am:['#0C4A6E','#0369A1','#7DD3FC'], pm:['#0284C7','#38BDF8','#BAE6FD'], ev:['#0A1628','#0C4A6E','#0369A1'] },
  rain:     { am:['#1C1917','#3D3935','#6B6560'], pm:['#0F172A','#2D3748','#4A5568'], ev:['#030712','#0F172A','#1E293B'] },
  snow:     { am:['#475569','#64748B','#CBD5E1'], pm:['#334155','#64748B','#CBD5E1'], ev:['#0F172A','#1E293B','#334155'] },
  formal:   { am:['#0369A1','#0EA5E9','#7DD3FC'], pm:['#0284C7','#38BDF8','#BAE6FD'], ev:['#020617','#050D14','#0D1B2A'] },
  athletic: { am:['#065F46','#059669','#34D399'], pm:['#047857','#10B981','#6EE7B7'], ev:['#022C22','#065F46','#059669'] },
};

const GROUND_COL = {
  hot:'#92400E', warm:'#276B2E', mild:'#1A5C22', cool:'#145218',
  cold:'#14532D', freezing:'#B0C4CE', rain:'#334155', snow:'#E8EEF0',
  formal:'#1E293B', athletic:'#1A5C22',
};
const PATH_COL = {
  hot:'#D97706', warm:'#74C480', mild:'#52BA65', cool:'#3DAB50',
  cold:'#2E8B57', freezing:'#EEF5F8', rain:'#465A68', snow:'#F5F8FA',
  formal:'#374151', athletic:'#74C480',
};

function tk(tb)  { return tb==='morning'?'am':tb==='evening'?'ev':'pm'; }
function locType(loc) {
  const s=(loc||'').toLowerCase();
  if(/beach|miami|hawaii|malibu|san diego|cancun/.test(s))  return 'beach';
  if(/york|chicago|boston|london|paris|tokyo|angeles|brooklyn|manhattan|seattle|dc/.test(s)) return 'city';
  if(/mountain|denver|boulder|aspen|alps|rockies|vail|tahoe/.test(s)) return 'mountain';
  return 'generic';
}

// ─── Animal Crossing-style tree ───────────────────────────────────────────────
function ACTree({ cx, baseY, sc=1, isSnow=false }) {
  const r=22*sc, tw=11*sc, th=22*sc;
  const cy = baseY - th - r*0.82;
  const green  = isSnow ? '#8FB8C5' : '#3A9B4E';
  const bright = isSnow ? '#C8DDE5' : '#52C465';
  const outline= isSnow ? '#4A6670' : '#1B4D24';
  const trunk  = '#8B5E3C', trunkD='#5C3D20';
  // Six bump circles around the perimeter (render behind main circle)
  const bumps=[[-40,0.88],[20,0.88],[75,0.84],[125,0.87],[165,0.84],[-100,0.86]];
  return (
    <G>
      <Rect x={cx-tw/2} y={baseY-th} width={tw} height={th} fill={trunk} stroke={trunkD} strokeWidth={1.5} rx={tw/2}/>
      {bumps.map(([a,f],i)=>{
        const rad=a*Math.PI/180;
        return <Circle key={i} cx={cx+Math.cos(rad)*r*f} cy={cy+Math.sin(rad)*r*f}
                       r={r*.42} fill={green} stroke={outline} strokeWidth={1}/>;
      })}
      <Circle cx={cx} cy={cy} r={r} fill={green} stroke={outline} strokeWidth={2.5}/>
      <Ellipse cx={cx-r*.28} cy={cy-r*.3} rx={r*.38} ry={r*.28} fill={bright} opacity={.6}/>
    </G>
  );
}

// ─── Pine tree (mountains/snow) ───────────────────────────────────────────────
function PineTree({ cx, baseY, sc=1, isSnow=false }) {
  const h=50*sc, w=28*sc;
  const c=isSnow?'#7A9FAD':'#2D6A2D', cd=isSnow?'#4A6670':'#1B4022';
  const t1=`M ${cx} ${baseY-h} L ${cx-w*.38} ${baseY-h*.58} L ${cx+w*.38} ${baseY-h*.58} Z`;
  const t2=`M ${cx} ${baseY-h*.64} L ${cx-w*.48} ${baseY-h*.28} L ${cx+w*.48} ${baseY-h*.28} Z`;
  const t3=`M ${cx} ${baseY-h*.36} L ${cx-w*.5}  ${baseY}      L ${cx+w*.5}  ${baseY}      Z`;
  return (
    <G>
      <Path d={t1} fill={c}  stroke={cd} strokeWidth={1}/>
      <Path d={t2} fill={c}  stroke={cd} strokeWidth={1}/>
      <Path d={t3} fill={cd} stroke={cd} strokeWidth={1}/>
      {isSnow&&<>
        <Path d={`M ${cx} ${baseY-h} L ${cx-w*.2} ${baseY-h*.72} L ${cx+w*.2} ${baseY-h*.72} Z`} fill="rgba(255,255,255,.9)"/>
        <Path d={`M ${cx} ${baseY-h*.64} L ${cx-w*.27} ${baseY-h*.42} L ${cx+w*.27} ${baseY-h*.42} Z`} fill="rgba(255,255,255,.7)"/>
      </>}
      <Rect x={cx-3*sc} y={baseY-6*sc} width={6*sc} height={6*sc} fill={trunk}/>
    </G>
  );
}
const trunk='#8B5E3C';

// ─── Rolling hills + AC trees ─────────────────────────────────────────────────
function GenericBG({ w, outfitType }) {
  const isSnow=['snow','freezing'].includes(outfitType);
  const isRain=outfitType==='rain', isHot=outfitType==='hot';
  const hFar = isSnow?'#5F7A84':isRain?'#2D3E4A':isHot?'#7A4020':'#1A5E2A';
  const hNear= isSnow?'#8AAAB5':isRain?'#3A4E5C':isHot?'#996030':'#276B2E';
  const svgH=SKY_H, fh=svgH*.58, nh=svgH*.76;
  const far =`M 0 ${fh} C ${w*.12} ${fh*.7},${w*.23} ${fh*.54},${w*.34} ${fh*.74} C ${w*.46} ${fh*.95},${w*.57} ${fh*.5},${w*.68} ${fh*.66} C ${w*.79} ${fh*.8},${w*.91} ${fh*.55},${w+10} ${fh*.7} L ${w+10} ${svgH+5} L 0 ${svgH+5} Z`;
  const near=`M 0 ${nh} C ${w*.1} ${nh*.82},${w*.26} ${nh*.9},${w*.39} ${nh*.84} C ${w*.53} ${nh*.78},${w*.63} ${nh*.88},${w*.77} ${nh*.79} C ${w*.89} ${nh*.73},${w*.97} ${nh*.9},${w+10} ${nh*.86} L ${w+10} ${svgH+5} L 0 ${svgH+5} Z`;
  return (
    <>
      <Path d={far}  fill={hFar}/>
      <Path d={near} fill={hNear}/>
      <ACTree cx={w*.08} baseY={svgH+2} sc={1.3}  isSnow={isSnow}/>
      <ACTree cx={w*.19} baseY={svgH+2} sc={1.65} isSnow={isSnow}/>
      <ACTree cx={w*.81} baseY={svgH+2} sc={1.55} isSnow={isSnow}/>
      <ACTree cx={w*.92} baseY={svgH+2} sc={1.25} isSnow={isSnow}/>
    </>
  );
}

// ─── Mountain background ──────────────────────────────────────────────────────
function MountainBG({ w, outfitType }) {
  const svgH=SKY_H;
  const isSnow=['snow','freezing','cold'].includes(outfitType);
  const m1=`M ${-w*.05} ${svgH} Q ${w*.17} ${svgH*.08} ${w*.38} ${svgH} Z`;
  const m2=`M ${w*.22}  ${svgH} Q ${w*.46} ${svgH*.02} ${w*.70} ${svgH} Z`;
  const m3=`M ${w*.50}  ${svgH} Q ${w*.73} ${svgH*.14} ${w*.96} ${svgH} Z`;
  const s1=`M ${w*.14} ${svgH*.26} Q ${w*.17} ${svgH*.08} ${w*.2}  ${svgH*.26} Z`;
  const s2=`M ${w*.42} ${svgH*.2}  Q ${w*.46} ${svgH*.02} ${w*.5}  ${svgH*.2}  Z`;
  const s3=`M ${w*.69} ${svgH*.31} Q ${w*.73} ${svgH*.14} ${w*.77} ${svgH*.31} Z`;
  return (
    <>
      <Path d={m1} fill="#4B5563" opacity={.5}/>
      <Path d={m2} fill="#374151" opacity={.72}/>
      <Path d={m3} fill="#1F2937" opacity={.86}/>
      {isSnow&&<><Path d={s1} fill="rgba(248,250,252,.96)"/><Path d={s2} fill="rgba(248,250,252,.96)"/><Path d={s3} fill="rgba(248,250,252,.96)"/></>}
      {[{x:w*.08,s:.8},{x:w*.31,s:.7},{x:w*.72,s:.75},{x:w*.9,s:.85}].map((p,i)=>(
        <PineTree key={i} cx={p.x} baseY={svgH+2} sc={p.s} isSnow={isSnow}/>
      ))}
    </>
  );
}

// ─── Beach background ─────────────────────────────────────────────────────────
function BeachBG({ w }) {
  const svgH=SKY_H, oy=svgH*.44;
  const ocean=`M 0 ${oy} Q ${w*.3} ${oy-9} ${w*.6} ${oy} Q ${w*.8} ${oy+7} ${w} ${oy} L ${w} ${svgH+5} L 0 ${svgH+5} Z`;
  const wave1=`M 0 ${oy+13} Q ${w*.15} ${oy+7} ${w*.3} ${oy+13} Q ${w*.45} ${oy+19} ${w*.6} ${oy+13}`;
  const angles=[-140,-110,-80,-50,-20];
  const p1={x:w*.13,y:svgH-60}, p2={x:w*.86,y:svgH-52};
  return (
    <>
      <Path d={ocean} fill="#1565C0" opacity={.48}/>
      <Path d={wave1} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={2}/>
      <Path d={`M ${w*.10} ${svgH+5} Q ${w*.11} ${svgH-28} ${w*.13} ${svgH-60}`}
            fill="none" stroke="#8B5E3C" strokeWidth={7} strokeLinecap="round"/>
      <Path d={`M ${w*.89} ${svgH+5} Q ${w*.90} ${svgH-22} ${w*.86} ${svgH-52}`}
            fill="none" stroke="#8B5E3C" strokeWidth={6} strokeLinecap="round"/>
      {angles.map((a,i)=>{
        const rad=a*Math.PI/180, len=27+i*1.5;
        return <Path key={i} d={`M ${p1.x} ${p1.y} Q ${p1.x+Math.cos(rad)*len*.5} ${p1.y+Math.sin(rad)*len*.5} ${p1.x+Math.cos(rad)*len} ${p1.y+Math.sin(rad)*len}`}
                     fill="none" stroke="#276B2E" strokeWidth={3} strokeLinecap="round"/>;
      })}
      {angles.map((a,i)=>{
        const rad=a*Math.PI/180, len=23+i*1.3;
        return <Path key={i} d={`M ${p2.x} ${p2.y} Q ${p2.x+Math.cos(rad)*len*.5} ${p2.y+Math.sin(rad)*len*.5} ${p2.x+Math.cos(rad)*len} ${p2.y+Math.sin(rad)*len}`}
                     fill="none" stroke="#1A5C22" strokeWidth={2.5} strokeLinecap="round"/>;
      })}
    </>
  );
}

// ─── City skyline ─────────────────────────────────────────────────────────────
const BLDGS=[
  {x:0,  w:26,h:66,wins:[[0,0],[0,1],[1,0],[1,2],[2,1]]},
  {x:28, w:18,h:88,wins:[[0,0],[1,0],[1,1],[2,1],[3,0]]},
  {x:48, w:22,h:54,wins:[[0,0],[0,1],[1,0],[1,1]]},
  {x:72, w:16,h:78,wins:[[0,0],[1,0],[1,1],[2,0],[3,1]]},
  {x:90, w:24,h:96,wins:[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1]]},
  {x:165,w:22,h:74,wins:[[0,0],[0,1],[1,0],[2,0],[2,1]]},
  {x:189,w:18,h:58,wins:[[0,0],[1,0],[1,1],[2,0]]},
  {x:209,w:26,h:84,wins:[[0,0],[0,1],[1,0],[1,1],[2,1],[3,0]]},
  {x:237,w:18,h:50,wins:[[0,0],[0,1],[1,0]]},
  {x:257,w:24,h:90,wins:[[0,0],[1,0],[1,1],[2,0],[3,0],[3,1]]},
];
function CityBG({ w, isNight }) {
  const svgH=SKY_H, bc=isNight?'#0F172A':'#2D3748', sc=isNight?'#1E293B':'#3D4F62';
  return (
    <>
      {BLDGS.map((b,i)=>(
        <G key={i}>
          <Rect x={b.x} y={svgH-b.h} width={b.w} height={b.h} fill={bc} stroke={sc} strokeWidth={1}/>
          {isNight&&b.wins.map(([row,col],j)=>(
            <Rect key={j} x={b.x+3+col*8} y={svgH-b.h+8+row*13} width={5} height={6} fill="#FEF08A" opacity={.88} rx={1}/>
          ))}
        </G>
      ))}
      {isNight&&[w*.22,w*.5,w*.76].map((lx,i)=>(
        <G key={i}>
          <Rect x={lx}   y={svgH-30} width={3}  height={30} fill="#4B5563"/>
          <Ellipse cx={lx+1.5} cy={svgH-32} rx={11} ry={5} fill="rgba(254,240,138,.18)"/>
          <Rect x={lx-2} y={svgH-34} width={7}  height={4}  fill="#FEF08A" rx={2}/>
        </G>
      ))}
    </>
  );
}

// ─── Drifting cloud ───────────────────────────────────────────────────────────
function Cloud({ startX, y, dur, sceneW }) {
  const x=useRef(new Animated.Value(startX)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(x,{toValue:sceneW+110,duration:dur,useNativeDriver:true}),
      Animated.timing(x,{toValue:-110,duration:0,useNativeDriver:true}),
    ])).start();
  },[]);
  return (
    <Animated.View style={{position:'absolute',top:y,transform:[{translateX:x}]}}>
      <View style={{flexDirection:'row',alignItems:'flex-end'}}>
        <View style={{width:24,height:14,borderRadius:9,backgroundColor:'rgba(255,255,255,.88)',marginRight:-7}}/>
        <View style={{width:42,height:25,borderRadius:14,backgroundColor:'rgba(255,255,255,.93)'}}/>
        <View style={{width:30,height:18,borderRadius:11,backgroundColor:'rgba(255,255,255,.88)',marginLeft:-7}}/>
        <View style={{width:20,height:12,borderRadius:9,backgroundColor:'rgba(255,255,255,.83)',marginLeft:-6}}/>
      </View>
    </Animated.View>
  );
}

// ─── Rain ─────────────────────────────────────────────────────────────────────
function Rain({ sceneW }) {
  const n=12, anims=useRef(Array.from({length:n},()=>new Animated.Value(0))).current;
  useEffect(()=>{ anims.forEach((a,i)=>{ const go=()=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:480+i*30,useNativeDriver:true}).start(go);}; setTimeout(go,i*100); }); },[]);
  return (
    <View style={[StyleSheet.absoluteFill,{height:SKY_H}]} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.View key={i} style={{position:'absolute',left:(sceneW/n)*i+2,top:0,width:1.5,height:14,backgroundColor:'rgba(148,163,184,.65)',borderRadius:1,transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H]})}],opacity:a.interpolate({inputRange:[0,.8,1],outputRange:[.8,.8,0]})}}/>
      ))}
    </View>
  );
}

// ─── Snow ─────────────────────────────────────────────────────────────────────
function Snow({ sceneW }) {
  const n=10, anims=useRef(Array.from({length:n},()=>new Animated.Value(0))).current;
  const xs=useRef(Array.from({length:n},(_,i)=>14+(sceneW/n)*i)).current;
  useEffect(()=>{ anims.forEach((a,i)=>{ const go=()=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:2600+i*200,useNativeDriver:true}).start(go);}; setTimeout(go,i*280); }); },[]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.Text key={i} style={{position:'absolute',left:xs[i],fontSize:12,color:'rgba(255,255,255,.92)',transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H+10]})},{translateX:a.interpolate({inputRange:[0,.5,1],outputRange:[0,9,0]})}],opacity:a.interpolate({inputRange:[0,.85,1],outputRange:[1,1,0]})}}>✦</Animated.Text>
      ))}
    </View>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars() {
  const op=useRef(new Animated.Value(.5)).current;
  useEffect(()=>{ Animated.loop(Animated.sequence([Animated.timing(op,{toValue:1,duration:1200,useNativeDriver:true}),Animated.timing(op,{toValue:.3,duration:1200,useNativeDriver:true})])).start(); },[]);
  const pts=[{x:22,y:8},{x:68,y:5},{x:115,y:17},{x:158,y:7},{x:205,y:13},{x:252,y:6},{x:295,y:20}];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pts.map((p,i)=><Animated.Text key={i} style={{position:'absolute',top:p.y,left:p.x,color:'#FEF9C3',fontSize:8,opacity:op}}>★</Animated.Text>)}
    </View>
  );
}

// ─── Sun / Moon ───────────────────────────────────────────────────────────────
function Celestial({ outfitType, timeBlock, topSkyCol }) {
  const pulse=useRef(new Animated.Value(1)).current;
  const isNight=timeBlock==='evening';
  useEffect(()=>{ if(!isNight) Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1.15,duration:2600,useNativeDriver:true}),Animated.timing(pulse,{toValue:1,duration:2600,useNativeDriver:true})])).start(); },[]);
  const timeK=tk(timeBlock);
  const left=timeK==='am'?'8%':timeK==='ev'?'74%':'40%', top=timeK==='pm'?10:24;
  if(isNight) return (
    <View style={{position:'absolute',top,left}}>
      <View style={{width:32,height:32,borderRadius:16,backgroundColor:'#FEF9C3'}}/>
      <View style={{position:'absolute',top:-2,left:8,width:28,height:28,borderRadius:14,backgroundColor:topSkyCol}}/>
    </View>
  );
  const sunCol=timeK==='ev'?'#FCA5A5':timeK==='am'?'#FDE68A':'#FEF08A';
  const glow  =timeK==='ev'?'rgba(249,115,22,.26)':'rgba(253,224,71,.3)';
  return (
    <Animated.View style={{position:'absolute',top,left,alignItems:'center',justifyContent:'center',transform:[{scale:pulse}]}}>
      <View style={{position:'absolute',width:56,height:56,borderRadius:28,backgroundColor:glow}}/>
      <View style={{width:36,height:36,borderRadius:18,backgroundColor:sunCol}}/>
    </Animated.View>
  );
}

// ─── Ground details ───────────────────────────────────────────────────────────
function GroundDetails({ outfitType }) {
  if(outfitType==='rain') return <>{[40,130,220].map((x,i)=><View key={i} style={{position:'absolute',bottom:8,left:x,width:32,height:9,borderRadius:5,backgroundColor:'rgba(148,163,184,.38)'}}/>)}</>;
  if(['snow','freezing'].includes(outfitType)) return <>{[20,100,185,260].map((x,i)=><View key={i} style={{position:'absolute',bottom:4,left:x,width:38+i*4,height:14,borderRadius:10,backgroundColor:'rgba(255,255,255,.72)'}}/>)}</>;
  if(['mild','cool','warm','athletic','hot'].includes(outfitType)) return (
    <>{[{x:40,c:'#FCD34D'},{x:130,c:'#F9A8D4'},{x:210,c:'#86EFAC'},{x:295,c:'#FCD34D'}].map((f,i)=>(
      <View key={i} style={{position:'absolute',bottom:14,left:f.x,alignItems:'center'}}>
        <View style={{width:9,height:9,borderRadius:5,backgroundColor:f.c,borderWidth:1,borderColor:'rgba(0,0,0,.08)'}}/>
        <View style={{width:2,height:11,backgroundColor:'#276B2E'}}/>
      </View>
    ))}</>
  );
  return null;
}

// ─── Animal Crossing character ────────────────────────────────────────────────
function Char({ items, legAnim, kickAnim, gender }) {
  const topCol=items.top[1], botCol=items.bot[1], shoeCol=items.shoe[1];
  const lLegY=legAnim.interpolate({inputRange:[-1,1],outputRange:[-7,7]});
  const rLegY=Animated.add(
    legAnim.interpolate({inputRange:[-1,1],outputRange:[7,-7]}),
    kickAnim.interpolate({inputRange:[0,1],outputRange:[0,15]})
  );
  const rFootX=kickAnim.interpolate({inputRange:[0,1],outputRange:[0,14]});
  const bob=legAnim.interpolate({inputRange:[-1,0,1],outputRange:[-2,-3,-2]});

  // Hair colors by gender
  const hairCol=gender==='womens'?'#D4860A':gender==='mens'?'#3D3D3D':'#9CA3AF';
  const skin='#FBBF91';

  return (
    <Animated.View style={{alignItems:'center',transform:[{translateY:bob}]}}>

      {/* ── HAIR ── */}
      {gender==='womens' && (
        // Bob cut: wide rounded top (bangs) + head overlapping it
        <View style={{width:48,height:18,borderTopLeftRadius:24,borderTopRightRadius:24,
          borderBottomLeftRadius:6,borderBottomRightRadius:6,backgroundColor:hairCol}}/>
      )}
      {gender==='mens' && (
        <View style={{width:32,height:12,borderTopLeftRadius:16,borderTopRightRadius:16,
          backgroundColor:hairCol}}/>
      )}
      {gender==='neutral' && (
        <View style={{width:28,height:9,borderTopLeftRadius:14,borderTopRightRadius:14,
          backgroundColor:hairCol}}/>
      )}

      {/* ── HEAD ── overlaps hair by 8-10px */}
      <View style={{
        width:38, height:36, borderRadius:19,
        backgroundColor:skin,
        borderWidth:1.5, borderColor:'rgba(0,0,0,0.1)',
        alignItems:'center', justifyContent:'center',
        marginTop: gender==='womens'?-10 : gender==='mens'?-6 : -5,
      }}>
        {/* Brow / lash indicator for women */}
        {gender==='womens' && (
          <View style={{flexDirection:'row',gap:10,marginBottom:2}}>
            <View style={{width:9,height:3,borderRadius:2,backgroundColor:'rgba(0,0,0,.3)',transform:[{rotate:'-6deg'}]}}/>
            <View style={{width:9,height:3,borderRadius:2,backgroundColor:'rgba(0,0,0,.3)',transform:[{rotate:'6deg'}]}}/>
          </View>
        )}
        {/* Eyes */}
        <View style={{flexDirection:'row',gap:gender==='womens'?8:7,marginTop:gender==='womens'?0:5}}>
          {[0,1].map(i=>(
            <View key={i} style={{width:6,height:6,borderRadius:3,backgroundColor:'#1F2937',
              alignItems:'flex-end',justifyContent:'flex-start',padding:0.5}}>
              <View style={{width:2,height:2,borderRadius:1,backgroundColor:'white'}}/>
            </View>
          ))}
        </View>
        {/* Blush (women) */}
        {gender==='womens' && (
          <View style={{flexDirection:'row',position:'absolute',bottom:7,left:3,right:3,justifyContent:'space-between'}}>
            <View style={{width:7,height:3,borderRadius:3,backgroundColor:'#FCA5A5',opacity:.65}}/>
            <View style={{width:7,height:3,borderRadius:3,backgroundColor:'#FCA5A5',opacity:.65}}/>
          </View>
        )}
        {/* Smile */}
        <View style={{width:11,height:5,borderBottomLeftRadius:6,borderBottomRightRadius:6,
          borderBottomWidth:2,borderLeftWidth:1.5,borderRightWidth:1.5,
          borderColor:'rgba(0,0,0,.25)',marginTop:gender==='womens'?2:3}}/>
      </View>

      {/* ── NECK ── */}
      <View style={{width:11,height:6,backgroundColor:skin}}/>

      {/* ── TORSO + ARMS ── */}
      <View style={{flexDirection:'row',alignItems:'center'}}>
        <View style={{width:10,height:24,borderRadius:6,backgroundColor:topCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.12)'}}/>
        <View style={{width:30,height:28,borderRadius:10,backgroundColor:topCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.12)',marginHorizontal:1}}/>
        <View style={{width:10,height:24,borderRadius:6,backgroundColor:topCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.12)'}}/>
      </View>

      {/* ── LEGS ── */}
      <View style={{flexDirection:'row',gap:5,marginTop:2}}>
        <Animated.View style={{width:14,height:28,borderRadius:7,backgroundColor:botCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.12)',transform:[{translateY:lLegY}]}}/>
        <Animated.View style={{width:14,height:28,borderRadius:7,backgroundColor:botCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.12)',transform:[{translateY:rLegY}]}}/>
      </View>

      {/* ── SHOES ── */}
      <View style={{flexDirection:'row',gap:5,marginTop:2}}>
        <View style={{width:17,height:10,borderRadius:6,backgroundColor:shoeCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.15)'}}/>
        <Animated.View style={{width:17,height:10,borderRadius:6,backgroundColor:shoeCol,borderWidth:1.5,borderColor:'rgba(0,0,0,.15)',transform:[{translateX:rFootX}]}}/>
      </View>

      {/* Shadow */}
      <View style={{width:32,height:7,borderRadius:16,backgroundColor:'rgba(0,0,0,.1)',marginTop:2}}/>
    </Animated.View>
  );
}

// ─── Outfit chip ──────────────────────────────────────────────────────────────
function Chip({ label, color }) {
  return (
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
  const onLayout = (e) => { const w=e.nativeEvent.layout.width; if(w>0) setSceneW(w); };

  const CHAR_MAX = sceneW - CHAR_W - 8;
  const ROCK_POS = sceneW * 0.56;

  const outfitType = getOutfitType(weather, eventType);
  const items      = ITEMS[outfitType] || ITEMS.mild;
  const timeK      = tk(timeBlock);
  const skyGrad    = (SKY_GRAD[outfitType]||SKY_GRAD.mild)[timeK];
  const groundCol  = GROUND_COL[outfitType]||'#1A5C22';
  const pathCol    = PATH_COL[outfitType] ||'#52BA65';
  const bg         = locType(location);
  // isNight is ONLY about time of day — formal in the afternoon is still daytime
  const isNight    = timeBlock==='evening';
  const isCityBG   = bg==='city' || outfitType==='formal';
  const isStorm    = ['rain','snow','freezing'].includes(outfitType);

  const walkX    = useRef(new Animated.Value(20)).current;
  const scaleX   = useRef(new Animated.Value(1)).current;
  const legAnim  = useRef(new Animated.Value(0)).current;
  const kickAnim = useRef(new Animated.Value(0)).current;
  const rockFly  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if(sceneW===300) return;
    const walk=(toRight)=>{
      scaleX.setValue(toRight?1:-1);
      Animated.timing(walkX,{toValue:toRight?CHAR_MAX:20,duration:WALK_DUR,useNativeDriver:true})
        .start(({finished})=>{ if(finished) walk(!toRight); });
    };
    walk(true);
    Animated.loop(Animated.sequence([
      Animated.timing(legAnim,{toValue:1, duration:360,useNativeDriver:true}),
      Animated.timing(legAnim,{toValue:-1,duration:360,useNativeDriver:true}),
    ])).start();
    const doKick=()=>Animated.sequence([
      Animated.delay(4200),
      Animated.timing(kickAnim,{toValue:1,duration:180,useNativeDriver:true}),
      Animated.timing(kickAnim,{toValue:0,duration:200,useNativeDriver:true}),
      Animated.delay(5380),
      Animated.timing(kickAnim,{toValue:1,duration:180,useNativeDriver:true}),
      Animated.timing(kickAnim,{toValue:0,duration:200,useNativeDriver:true}),
      Animated.delay(3840),
    ]).start(doKick);
    doKick();
    const doRock=()=>Animated.sequence([
      Animated.delay(4380),
      Animated.timing(rockFly,{toValue:34, duration:300,useNativeDriver:true}),
      Animated.timing(rockFly,{toValue:0,  duration:700,useNativeDriver:true}),
      Animated.delay(5180),
      Animated.timing(rockFly,{toValue:-34,duration:300,useNativeDriver:true}),
      Animated.timing(rockFly,{toValue:0,  duration:700,useNativeDriver:true}),
      Animated.delay(3240),
    ]).start(doRock);
    doRock();
    return()=>{ walkX.stopAnimation(); legAnim.stopAnimation(); };
  }, [sceneW]);

  return (
    <View style={s.wrap}>
      <View style={s.scene} onLayout={onLayout}>

        {/* Gradient sky */}
        <LinearGradient colors={skyGrad} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:0,y:1}}/>

        {/* SVG art layer */}
        <View style={{position:'absolute',top:0,left:0,width:sceneW,height:SKY_H}} pointerEvents="none">
          <Svg width={sceneW} height={SKY_H}>
            {isCityBG             && <CityBG     w={sceneW} isNight={isNight}/>}
            {!isCityBG&&bg==='mountain' && <MountainBG w={sceneW} outfitType={outfitType}/>}
            {!isCityBG&&bg==='beach'    && <BeachBG    w={sceneW}/>}
            {!isCityBG&&bg==='generic'  && <GenericBG  w={sceneW} outfitType={outfitType}/>}
          </Svg>
        </View>

        {isNight && <Stars/>}
        <Celestial outfitType={outfitType} timeBlock={timeBlock} topSkyCol={skyGrad[0]}/>
        {!isStorm&&!isNight&&(
          <>
            <Cloud startX={60}  y={14} dur={20000} sceneW={sceneW}/>
            <Cloud startX={-90} y={32} dur={28000} sceneW={sceneW}/>
          </>
        )}
        {outfitType==='rain'&&<Rain sceneW={sceneW}/>}
        {['snow','freezing'].includes(outfitType)&&<Snow sceneW={sceneW}/>}

        {/* Ground */}
        <View style={[s.ground,{backgroundColor:groundCol,width:sceneW}]}>
          <View style={{position:'absolute',top:9,left:0,right:0,bottom:0,backgroundColor:pathCol,opacity:.35,borderRadius:3}}/>
          <GroundDetails outfitType={outfitType}/>
        </View>

        {/* Rock */}
        <Animated.View style={{position:'absolute',top:SKY_H-13,left:ROCK_POS,transform:[{translateX:rockFly}]}}>
          <View style={{width:13,height:10,borderRadius:5,backgroundColor:'rgba(0,0,0,.2)',borderWidth:1,borderColor:'rgba(0,0,0,.08)'}}/>
        </Animated.View>

        {/* Character */}
        <Animated.View style={{position:'absolute',top:CHAR_Y,left:0,width:CHAR_W,transform:[{translateX:walkX},{scaleX}]}}>
          <Char items={items} legAnim={legAnim} kickAnim={kickAnim} gender={gender}/>
        </Animated.View>

        {/* Corner badges */}
        {eventType!=='casual'&&(
          <View style={[s.badge,{right:10}]}>
            <Text style={s.badgeTxt}>{eventType[0].toUpperCase()+eventType.slice(1)}</Text>
          </View>
        )}
        {timeBlock!=='fullday'&&(
          <View style={[s.badge,{left:10}]}>
            <Text style={s.badgeTxt}>{timeBlock[0].toUpperCase()+timeBlock.slice(1)}</Text>
          </View>
        )}
      </View>

      {/* Outfit chips */}
      <View style={s.chips}>
        <Chip label={items.top[0]}  color={items.top[1]}/>
        <Chip label={items.bot[0]}  color={items.bot[1]}/>
        <Chip label={items.shoe[0]} color={items.shoe[1]}/>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { marginBottom: 16 },
  scene:   { height: SCENE_H, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  ground:  { position: 'absolute', bottom: 0, left: 0, height: GROUND_H, overflow: 'hidden' },
  chips:   { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip:    { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, gap: 7 },
  swatch:  { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#333', flexShrink: 1 },
  badge:   { position: 'absolute', top: 10, backgroundColor: 'rgba(0,0,0,.28)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:{ fontSize: 10, color: '#fff', fontWeight: '700' },
});
