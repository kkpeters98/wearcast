import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Ellipse, G } from 'react-native-svg';
import { getOutfitType } from './OutfitScene';

const SCENE_H  = 220;
const GROUND_H = 52;
const SKY_H    = SCENE_H - GROUND_H;  // 168
const CHAR_W   = 44;
const CHAR_H   = 84;
const CHAR_Y   = SKY_H - CHAR_H + 2;  // 86
const WALK_DUR = 7000;

const ITEMS = {
  hot:      { top:['Tank Top',    '#FFB347'], bot:['Shorts',      '#87CEEB'], shoe:['Sandals',      '#D2B48C'] },
  warm:     { top:['T-Shirt',     '#87CEEB'], bot:['Shorts',      '#C8A96E'], shoe:['Sneakers',     '#e0e0e0'] },
  mild:     { top:['Long Sleeve', '#7EB8D3'], bot:['Jeans',       '#4169E1'], shoe:['Sneakers',     '#e0e0e0'] },
  cool:     { top:['Sweater',     '#CC7744'], bot:['Jeans',       '#4169E1'], shoe:['Sneakers',     '#e0e0e0'] },
  cold:     { top:['Jacket',      '#4B5563'], bot:['Jeans',       '#4169E1'], shoe:['Ankle Boots',  '#6B4226'] },
  freezing: { top:['Winter Coat', '#1E3A8A'], bot:['Jeans',       '#4169E1'], shoe:['Winter Boots', '#374151'] },
  rain:     { top:['Rain Jacket', '#0D9488'], bot:['Jeans',       '#4169E1'], shoe:['Rain Boots',   '#1F2937'] },
  snow:     { top:['Parka',       '#7C3AED'], bot:['Jeans',       '#4169E1'], shoe:['Snow Boots',   '#374151'] },
  formal:   { top:['Blazer',      '#334155'], bot:['Dress Pants', '#1E293B'], shoe:['Dress Shoes',  '#0F172A'] },
  athletic: { top:['Athletic Top','#EF4444'], bot:['Shorts',      '#1E3A8A'], shoe:['Runners',      '#f8f8f8'] },
};

// sky gradient: top → bottom
const SKY_GRAD = {
  hot:      { am:['#FBBF24','#FDE68A','#FEF3C7'], pm:['#F59E0B','#FCD34D','#FEF9C3'], ev:['#7C2D12','#C2410C','#FCA5A5'] },
  warm:     { am:['#1D4ED8','#60A5FA','#BFDBFE'], pm:['#1D4ED8','#3B82F6','#93C5FD'], ev:['#3730A3','#818CF8','#C4B5FD'] },
  mild:     { am:['#0369A1','#38BDF8','#BAE6FD'], pm:['#0284C7','#7DD3FC','#BAE6FD'], ev:['#3730A3','#6366F1','#A5B4FC'] },
  cool:     { am:['#3730A3','#818CF8','#C7D2FE'], pm:['#4338CA','#6366F1','#A5B4FC'], ev:['#1E1B4B','#312E81','#4338CA'] },
  cold:     { am:['#1E3A5F','#2563EB','#93C5FD'], pm:['#1D4ED8','#3B82F6','#BFDBFE'], ev:['#0C1A3D','#1E40AF','#3B82F6'] },
  freezing: { am:['#0369A1','#7DD3FC','#E0F2FE'], pm:['#0284C7','#BAE6FD','#E0F2FE'], ev:['#0C4A6E','#0369A1','#7DD3FC'] },
  rain:     { am:['#1C1917','#44403C','#78716C'], pm:['#0F172A','#334155','#64748B'], ev:['#030712','#0F172A','#1E293B'] },
  snow:     { am:['#64748B','#94A3B8','#E2E8F0'], pm:['#475569','#94A3B8','#E2E8F0'], ev:['#0F172A','#1E293B','#475569'] },
  formal:   { am:['#020617','#050D14','#0D1B2A'], pm:['#020617','#050D14','#0D1B2A'], ev:['#000','#020617','#050D14'] },
  athletic: { am:['#059669','#34D399','#A7F3D0'], pm:['#047857','#10B981','#6EE7B7'], ev:['#022C22','#064E3B','#065F46'] },
};

const GROUND_COL = {
  hot:'#92400E', warm:'#15803D', mild:'#166534', cool:'#14532D',
  cold:'#14532D', freezing:'#CBD5E1', rain:'#334155', snow:'#E2E8F0',
  formal:'#1E293B', athletic:'#15803D',
};
const PATH_COL = {
  hot:'#D97706', warm:'#86EFAC', mild:'#4ADE80', cool:'#22C55E',
  cold:'#16A34A', freezing:'#F0F9FF', rain:'#475569', snow:'#F8FAFC',
  formal:'#374151', athletic:'#86EFAC',
};

function tk(tb) { return tb==='morning'?'am':tb==='evening'?'ev':'pm'; }
function locType(loc) {
  const s=(loc||'').toLowerCase();
  if(/beach|miami|hawaii|malibu|san diego|cancun/.test(s)) return 'beach';
  if(/york|chicago|boston|london|paris|tokyo|angeles|brooklyn|manhattan|seattle|dc/.test(s)) return 'city';
  if(/mountain|denver|boulder|aspen|alps|rockies|vail|tahoe/.test(s)) return 'mountain';
  return 'generic';
}

// ─── Zelda-style tree ─────────────────────────────────────────────────────────
function ZeldaTree({ cx, baseY, sc=1, isSnow=false }) {
  const tw=9*sc, th=18*sc, r=16*sc;
  const dark  = isSnow?'#94A3B8':'#14532D';
  const mid   = isSnow?'#CBD5E1':'#15803D';
  const light = isSnow?'#E2E8F0':'#16A34A';
  const ty    = baseY - th - r*0.55;
  return (
    <G>
      <Rect x={cx-tw/2} y={baseY-th} width={tw} height={th} fill="#7C3F21" stroke="#4A2210" strokeWidth={1} rx={2}/>
      <Ellipse cx={cx}       cy={ty}        rx={r}      ry={r*0.85}  fill={light} stroke={dark} strokeWidth={1.5}/>
      <Ellipse cx={cx-r*0.7} cy={ty+r*0.1}  rx={r*0.75} ry={r*0.7}  fill={mid}   stroke={dark} strokeWidth={1}/>
      <Ellipse cx={cx+r*0.7} cy={ty+r*0.1}  rx={r*0.75} ry={r*0.7}  fill={mid}   stroke={dark} strokeWidth={1}/>
      <Ellipse cx={cx}       cy={ty-r*0.65} rx={r*0.58} ry={r*0.52} fill={dark}  stroke={dark} strokeWidth={1}/>
      {isSnow && <Ellipse cx={cx} cy={ty-r*0.2} rx={r*0.65} ry={r*0.2} fill="rgba(255,255,255,0.85)"/>}
    </G>
  );
}

// ─── Pine tree (mountains/snow) ───────────────────────────────────────────────
function PineTree({ cx, baseY, sc=1, isSnow=false }) {
  const h=48*sc, w=28*sc;
  const c=isSnow?'#94A3B8':'#166534', cd=isSnow?'#64748B':'#14532D';
  const t1=`M ${cx} ${baseY-h} L ${cx-w*0.38} ${baseY-h*0.58} L ${cx+w*0.38} ${baseY-h*0.58} Z`;
  const t2=`M ${cx} ${baseY-h*0.64} L ${cx-w*0.48} ${baseY-h*0.28} L ${cx+w*0.48} ${baseY-h*0.28} Z`;
  const t3=`M ${cx} ${baseY-h*0.36} L ${cx-w*0.5} ${baseY} L ${cx+w*0.5} ${baseY} Z`;
  return (
    <G>
      <Path d={t1} fill={c}  stroke={cd} strokeWidth={1}/>
      <Path d={t2} fill={c}  stroke={cd} strokeWidth={1}/>
      <Path d={t3} fill={cd} stroke={cd} strokeWidth={1}/>
      {isSnow && <>
        <Path d={`M ${cx} ${baseY-h} L ${cx-w*0.2} ${baseY-h*0.72} L ${cx+w*0.2} ${baseY-h*0.72} Z`} fill="rgba(255,255,255,0.9)"/>
        <Path d={`M ${cx} ${baseY-h*0.64} L ${cx-w*0.27} ${baseY-h*0.42} L ${cx+w*0.27} ${baseY-h*0.42} Z`} fill="rgba(255,255,255,0.7)"/>
      </>}
      <Rect x={cx-3*sc} y={baseY-5*sc} width={6*sc} height={5*sc} fill="#7C3F21"/>
    </G>
  );
}

// ─── Generic (rolling hills + Zelda trees) ────────────────────────────────────
function GenericBG({ w, outfitType }) {
  const isSnow   = ['snow','freezing'].includes(outfitType);
  const isRain   = outfitType==='rain';
  const isHot    = outfitType==='hot';
  const svgH     = SKY_H;
  const hillFar  = isSnow?'#94A3B8':isRain?'#475569':isHot?'#92400E':'#14532D';
  const hillNear = isSnow?'#CBD5E1':isRain?'#334155':isHot?'#B45309':'#15803D';
  const fh=svgH*0.62;
  const nh=svgH*0.80;
  const far =`M 0 ${fh} C ${w*.12} ${fh*.72},${w*.22} ${fh*.55},${w*.33} ${fh*.75} C ${w*.45} ${fh*.96},${w*.56} ${fh*.5},${w*.68} ${fh*.66} C ${w*.78} ${fh*.79},${w*.9} ${fh*.55},${w+10} ${fh*.7} L ${w+10} ${svgH+5} L 0 ${svgH+5} Z`;
  const near=`M 0 ${nh} C ${w*.1} ${nh*.83},${w*.25} ${nh*.9},${w*.38} ${nh*.85} C ${w*.52} ${nh*.78},${w*.62} ${nh*.88},${w*.76} ${nh*.8} C ${w*.88} ${nh*.74},${w*.96} ${nh*.9},${w+10} ${nh*.87} L ${w+10} ${svgH+5} L 0 ${svgH+5} Z`;
  const trees=[{x:w*.07,s:.85},{x:w*.17,s:1.05},{x:w*.8,s:.9},{x:w*.9,s:1.1}];
  return (
    <>
      <Path d={far}  fill={hillFar}/>
      <Path d={near} fill={hillNear}/>
      {trees.map((t,i)=><ZeldaTree key={i} cx={t.x} baseY={svgH+2} sc={t.s} isSnow={isSnow}/>)}
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
  const s1=`M ${w*.14} ${svgH*.25} Q ${w*.17} ${svgH*.08} ${w*.2}  ${svgH*.25} Z`;
  const s2=`M ${w*.42} ${svgH*.2}  Q ${w*.46} ${svgH*.02} ${w*.5}  ${svgH*.2}  Z`;
  const s3=`M ${w*.69} ${svgH*.3}  Q ${w*.73} ${svgH*.14} ${w*.77} ${svgH*.3}  Z`;
  const pines=[{x:w*.08,s:.75},{x:w*.3,s:.65},{x:w*.72,s:.7},{x:w*.9,s:.8}];
  return (
    <>
      <Path d={m1} fill="#4B5563" opacity={.5}/>
      <Path d={m2} fill="#374151" opacity={.72}/>
      <Path d={m3} fill="#1F2937" opacity={.86}/>
      {isSnow&&<><Path d={s1} fill="rgba(248,250,252,.95)"/><Path d={s2} fill="rgba(248,250,252,.95)"/><Path d={s3} fill="rgba(248,250,252,.95)"/></>}
      {pines.map((p,i)=><PineTree key={i} cx={p.x} baseY={svgH+2} sc={p.s} isSnow={isSnow}/>)}
    </>
  );
}

// ─── Beach background ─────────────────────────────────────────────────────────
function BeachBG({ w }) {
  const svgH=SKY_H;
  const oy=svgH*.42;
  const ocean=`M 0 ${oy} Q ${w*.3} ${oy-8} ${w*.6} ${oy} Q ${w*.8} ${oy+6} ${w} ${oy} L ${w} ${svgH+5} L 0 ${svgH+5} Z`;
  const wave1=`M 0 ${oy+12} Q ${w*.15} ${oy+6} ${w*.3} ${oy+12} Q ${w*.45} ${oy+18} ${w*.6} ${oy+12}`;
  const angles=[-140,-110,-80,-50,-20];
  const p1={x:w*.13,y:svgH-60};
  const p2={x:w*.86,y:svgH-52};
  const trunk1=`M ${w*.10} ${svgH+5} Q ${w*.11} ${svgH-28} ${w*.13} ${svgH-60}`;
  const trunk2=`M ${w*.89} ${svgH+5} Q ${w*.9}  ${svgH-22} ${w*.86} ${svgH-52}`;
  return (
    <>
      <Path d={ocean} fill="#1E40AF" opacity={.45}/>
      <Path d={wave1} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={2}/>
      <Path d={trunk1} fill="none" stroke="#7C3F21" strokeWidth={7} strokeLinecap="round"/>
      <Path d={trunk2} fill="none" stroke="#7C3F21" strokeWidth={6} strokeLinecap="round"/>
      {angles.map((a,i)=>{
        const rad=a*Math.PI/180;
        const len=26+i*1.5;
        const mx=p1.x+Math.cos(rad)*len*.5, my=p1.y+Math.sin(rad)*len*.5;
        const ex=p1.x+Math.cos(rad)*len,    ey=p1.y+Math.sin(rad)*len;
        return <Path key={i} d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${ex} ${ey}`} fill="none" stroke="#166534" strokeWidth={3} strokeLinecap="round"/>;
      })}
      {angles.map((a,i)=>{
        const rad=a*Math.PI/180;
        const len=22+i*1.2;
        const mx=p2.x+Math.cos(rad)*len*.5, my=p2.y+Math.sin(rad)*len*.5;
        const ex=p2.x+Math.cos(rad)*len,    ey=p2.y+Math.sin(rad)*len;
        return <Path key={i} d={`M ${p2.x} ${p2.y} Q ${mx} ${my} ${ex} ${ey}`} fill="none" stroke="#15803D" strokeWidth={2.5} strokeLinecap="round"/>;
      })}
    </>
  );
}

// ─── City skyline ─────────────────────────────────────────────────────────────
const BLDGS=[
  {x:0,  w:26,h:66,wins:[[0,0],[0,1],[1,0],[1,2],[2,1],[3,0]]},
  {x:28, w:18,h:88,wins:[[0,0],[1,0],[1,1],[2,1],[3,0],[4,0]]},
  {x:48, w:22,h:54,wins:[[0,0],[0,1],[1,0],[1,1]]},
  {x:72, w:16,h:78,wins:[[0,0],[1,0],[1,1],[2,0],[3,1]]},
  {x:90, w:24,h:96,wins:[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0]]},
  {x:165,w:22,h:74,wins:[[0,0],[0,1],[1,0],[2,0],[2,1]]},
  {x:189,w:18,h:58,wins:[[0,0],[1,0],[1,1],[2,0]]},
  {x:209,w:26,h:84,wins:[[0,0],[0,1],[1,0],[1,1],[2,1],[3,0],[3,1]]},
  {x:237,w:18,h:50,wins:[[0,0],[0,1],[1,0]]},
  {x:257,w:24,h:90,wins:[[0,0],[1,0],[1,1],[2,0],[3,0],[3,1],[4,1]]},
];
function CityBG({ w, isNight }) {
  const svgH=SKY_H;
  const bc=isNight?'#0F172A':'#1E293B', sc=isNight?'#1E293B':'#334155';
  return (
    <>
      {BLDGS.map((b,i)=>(
        <G key={i}>
          <Rect x={b.x} y={svgH-b.h} width={b.w} height={b.h} fill={bc} stroke={sc} strokeWidth={1}/>
          {isNight&&b.wins.map(([row,col],j)=>(
            <Rect key={j} x={b.x+3+col*8} y={svgH-b.h+8+row*13} width={5} height={6} fill="#FEF08A" opacity={.85} rx={1}/>
          ))}
        </G>
      ))}
      {isNight&&[w*.22,w*.5,w*.76].map((lx,i)=>(
        <G key={i}>
          <Rect x={lx} y={svgH-30} width={3} height={30} fill="#374151"/>
          <Ellipse cx={lx+1.5} cy={svgH-32} rx={11} ry={5} fill="rgba(254,240,138,.18)"/>
          <Rect x={lx-2} y={svgH-34} width={7} height={4} fill="#FEF08A" rx={2}/>
        </G>
      ))}
    </>
  );
}

// ─── Clouds ───────────────────────────────────────────────────────────────────
function Cloud({ startX, y, dur, sceneW }) {
  const x=useRef(new Animated.Value(startX)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(x,{toValue:sceneW+100,duration:dur,useNativeDriver:true}),
      Animated.timing(x,{toValue:-100,duration:0,useNativeDriver:true}),
    ])).start();
  },[]);
  return (
    <Animated.View style={{position:'absolute',top:y,transform:[{translateX:x}]}}>
      <View style={{flexDirection:'row',alignItems:'flex-end'}}>
        <View style={{width:22,height:13,borderRadius:9,backgroundColor:'rgba(255,255,255,.87)',marginRight:-6}}/>
        <View style={{width:40,height:24,borderRadius:13,backgroundColor:'rgba(255,255,255,.92)'}}/>
        <View style={{width:28,height:17,borderRadius:10,backgroundColor:'rgba(255,255,255,.87)',marginLeft:-7}}/>
        <View style={{width:18,height:11,borderRadius:8,backgroundColor:'rgba(255,255,255,.83)',marginLeft:-5}}/>
      </View>
    </Animated.View>
  );
}

// ─── Rain ─────────────────────────────────────────────────────────────────────
function Rain({ sceneW }) {
  const n=12, anims=useRef(Array.from({length:n},()=>new Animated.Value(0))).current;
  useEffect(()=>{
    anims.forEach((a,i)=>{
      const go=()=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:480+i*30,useNativeDriver:true}).start(go);};
      setTimeout(go,i*100);
    });
  },[]);
  return (
    <View style={[StyleSheet.absoluteFill,{height:SKY_H}]} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.View key={i} style={{position:'absolute',left:(sceneW/n)*i+2,top:0,width:1.5,height:14,
          backgroundColor:'rgba(148,163,184,.65)',borderRadius:1,
          transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H]})}],
          opacity:a.interpolate({inputRange:[0,.8,1],outputRange:[.8,.8,0]})}}/>
      ))}
    </View>
  );
}

// ─── Snow ─────────────────────────────────────────────────────────────────────
function Snow({ sceneW }) {
  const n=10, anims=useRef(Array.from({length:n},()=>new Animated.Value(0))).current;
  const xs=useRef(Array.from({length:n},(_,i)=>14+(sceneW/n)*i)).current;
  useEffect(()=>{
    anims.forEach((a,i)=>{
      const go=()=>{a.setValue(0);Animated.timing(a,{toValue:1,duration:2600+i*200,useNativeDriver:true}).start(go);};
      setTimeout(go,i*280);
    });
  },[]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.Text key={i} style={{position:'absolute',left:xs[i],fontSize:12,color:'rgba(255,255,255,.9)',
          transform:[
            {translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H+10]})},
            {translateX:a.interpolate({inputRange:[0,.5,1],outputRange:[0,8,0]})},
          ],
          opacity:a.interpolate({inputRange:[0,.85,1],outputRange:[1,1,0]})}}>✦</Animated.Text>
      ))}
    </View>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars() {
  const op=useRef(new Animated.Value(.5)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(op,{toValue:1,  duration:1200,useNativeDriver:true}),
      Animated.timing(op,{toValue:.3, duration:1200,useNativeDriver:true}),
    ])).start();
  },[]);
  const pts=[{x:22,y:8},{x:65,y:5},{x:110,y:16},{x:155,y:7},{x:200,y:12},{x:248,y:6},{x:290,y:19}];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pts.map((p,i)=>(
        <Animated.Text key={i} style={{position:'absolute',top:p.y,left:p.x,color:'#FEF9C3',fontSize:8,opacity:op}}>★</Animated.Text>
      ))}
    </View>
  );
}

// ─── Sun / Moon ───────────────────────────────────────────────────────────────
function Celestial({ outfitType, timeBlock, topSkyColor }) {
  const pulse=useRef(new Animated.Value(1)).current;
  const isNight=outfitType==='formal'||timeBlock==='evening';
  useEffect(()=>{
    if(!isNight) Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1.14,duration:2600,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1,   duration:2600,useNativeDriver:true}),
    ])).start();
  },[]);
  const timeK=tk(timeBlock);
  const leftPct=timeK==='am'?'10%':timeK==='ev'?'72%':'42%';
  const top=timeK==='pm'?10:22;
  if(isNight) return (
    <View style={{position:'absolute',top,left:leftPct}}>
      <View style={{width:30,height:30,borderRadius:15,backgroundColor:'#FEF9C3'}}/>
      <View style={{position:'absolute',top:-2,left:7,width:26,height:26,borderRadius:13,backgroundColor:topSkyColor}}/>
    </View>
  );
  const sunCol=timeK==='ev'?'#FCA5A5':timeK==='am'?'#FDE68A':'#FEF08A';
  const glow  =timeK==='ev'?'rgba(249,115,22,.28)':'rgba(253,224,71,.32)';
  return (
    <Animated.View style={{position:'absolute',top,left:leftPct,alignItems:'center',justifyContent:'center',transform:[{scale:pulse}]}}>
      <View style={{position:'absolute',width:54,height:54,borderRadius:27,backgroundColor:glow}}/>
      <View style={{width:34,height:34,borderRadius:17,backgroundColor:sunCol}}/>
    </Animated.View>
  );
}

// ─── Character ────────────────────────────────────────────────────────────────
function Char({ items, legAnim, kickAnim, gender }) {
  const topCol=items.top[1], botCol=items.bot[1], shoeCol=items.shoe[1];
  const lLegY=legAnim.interpolate({inputRange:[-1,1],outputRange:[-6,6]});
  const rLegY=Animated.add(
    legAnim.interpolate({inputRange:[-1,1],outputRange:[6,-6]}),
    kickAnim.interpolate({inputRange:[0,1],outputRange:[0,13]})
  );
  const rFootX=kickAnim.interpolate({inputRange:[0,1],outputRange:[0,12]});
  const bob=legAnim.interpolate({inputRange:[-1,0,1],outputRange:[-2,-3,-2]});
  const hairCol=gender==='womens'?'#D97706':gender==='mens'?'#374151':'#9CA3AF';
  return (
    <Animated.View style={{alignItems:'center',transform:[{translateY:bob}]}}>
      {gender==='womens'&&<View style={{width:28,height:11,borderTopLeftRadius:14,borderTopRightRadius:14,backgroundColor:hairCol,marginBottom:-4}}/>}
      {gender==='mens'  &&<View style={{width:24,height:8, borderTopLeftRadius:12,borderTopRightRadius:12,backgroundColor:hairCol,marginBottom:-3}}/>}
      {/* Head */}
      <View style={{width:26,height:26,borderRadius:13,backgroundColor:'#FBBF91',borderWidth:1.5,borderColor:'rgba(0,0,0,.1)',alignItems:'center',justifyContent:'center'}}>
        <View style={{flexDirection:'row',gap:6,marginTop:3}}>
          <View style={{width:3.5,height:3.5,borderRadius:2,backgroundColor:'#1F2937'}}/>
          <View style={{width:3.5,height:3.5,borderRadius:2,backgroundColor:'#1F2937'}}/>
        </View>
        <View style={{width:8,height:3,borderBottomLeftRadius:4,borderBottomRightRadius:4,borderBottomWidth:1.5,borderLeftWidth:1,borderRightWidth:1,borderColor:'rgba(0,0,0,.2)',marginTop:2}}/>
      </View>
      {/* Neck */}
      <View style={{width:8,height:5,backgroundColor:'#FBBF91'}}/>
      {/* Body + arms */}
      <View style={{flexDirection:'row',alignItems:'center'}}>
        <View style={{width:7,height:18,borderRadius:4,backgroundColor:topCol,borderWidth:1,borderColor:'rgba(0,0,0,.1)'}}/>
        <View style={{width:22,height:22,borderRadius:5,backgroundColor:topCol,borderWidth:1,borderColor:'rgba(0,0,0,.1)',marginHorizontal:1}}/>
        <View style={{width:7,height:18,borderRadius:4,backgroundColor:topCol,borderWidth:1,borderColor:'rgba(0,0,0,.1)'}}/>
      </View>
      {/* Legs */}
      <View style={{flexDirection:'row',gap:4,marginTop:2}}>
        <Animated.View style={{width:10,height:22,borderRadius:5,backgroundColor:botCol,borderWidth:1,borderColor:'rgba(0,0,0,.1)',transform:[{translateY:lLegY}]}}/>
        <Animated.View style={{width:10,height:22,borderRadius:5,backgroundColor:botCol,borderWidth:1,borderColor:'rgba(0,0,0,.1)',transform:[{translateY:rLegY}]}}/>
      </View>
      {/* Shoes */}
      <View style={{flexDirection:'row',gap:4,marginTop:2}}>
        <View style={{width:13,height:8,borderRadius:4,backgroundColor:shoeCol,borderWidth:1,borderColor:'rgba(0,0,0,.15)'}}/>
        <Animated.View style={{width:13,height:8,borderRadius:4,backgroundColor:shoeCol,borderWidth:1,borderColor:'rgba(0,0,0,.15)',transform:[{translateX:rFootX}]}}/>
      </View>
      <View style={{width:26,height:6,borderRadius:13,backgroundColor:'rgba(0,0,0,.11)',marginTop:2}}/>
    </Animated.View>
  );
}

// ─── Ground details ───────────────────────────────────────────────────────────
function GroundDetails({ outfitType }) {
  if(outfitType==='rain') return (
    <>{[40,120,200].map((x,i)=>(
      <View key={i} style={{position:'absolute',bottom:8,left:x,width:30,height:8,borderRadius:4,backgroundColor:'rgba(148,163,184,.38)'}}/>
    ))}</>
  );
  if(['snow','freezing'].includes(outfitType)) return (
    <>{[20,90,170,245].map((x,i)=>(
      <View key={i} style={{position:'absolute',bottom:4,left:x,width:36+i*4,height:14,borderRadius:10,backgroundColor:'rgba(255,255,255,.72)'}}/>
    ))}</>
  );
  if(['mild','cool','warm','athletic','hot'].includes(outfitType)) return (
    <>{[{x:35,c:'#FCD34D'},{x:115,c:'#F9A8D4'},{x:190,c:'#86EFAC'},{x:265,c:'#FCD34D'}].map((f,i)=>(
      <View key={i} style={{position:'absolute',bottom:12,left:f.x,alignItems:'center'}}>
        <View style={{width:8,height:8,borderRadius:4,backgroundColor:f.c,borderWidth:1,borderColor:'rgba(0,0,0,.08)'}}/>
        <View style={{width:2,height:10,backgroundColor:'#15803D'}}/>
      </View>
    ))}</>
  );
  return null;
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
  const ROCK_POS = sceneW * 0.58;

  const outfitType = getOutfitType(weather, eventType);
  const items      = ITEMS[outfitType] || ITEMS.mild;
  const timeK      = tk(timeBlock);
  const skyGrad    = (SKY_GRAD[outfitType]||SKY_GRAD.mild)[timeK];
  const groundCol  = GROUND_COL[outfitType]||'#15803D';
  const pathCol    = PATH_COL[outfitType]||'#86EFAC';
  const bg         = locType(location);
  const isNight    = outfitType==='formal'||timeBlock==='evening';
  const isCityBG   = bg==='city'||outfitType==='formal';
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
      Animated.timing(rockFly,{toValue:32, duration:320,useNativeDriver:true}),
      Animated.timing(rockFly,{toValue:0,  duration:750,useNativeDriver:true}),
      Animated.delay(5180),
      Animated.timing(rockFly,{toValue:-32,duration:320,useNativeDriver:true}),
      Animated.timing(rockFly,{toValue:0,  duration:750,useNativeDriver:true}),
      Animated.delay(3220),
    ]).start(doRock);
    doRock();
    return()=>{ walkX.stopAnimation(); legAnim.stopAnimation(); };
  }, [sceneW]);

  return (
    <View style={s.wrap}>
      <View style={s.scene} onLayout={onLayout}>

        {/* Gradient sky */}
        <LinearGradient colors={skyGrad} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:0,y:1}}/>

        {/* SVG background art */}
        <View style={{position:'absolute',top:0,left:0,width:sceneW,height:SKY_H}} pointerEvents="none">
          <Svg width={sceneW} height={SKY_H}>
            {isCityBG          && <CityBG    w={sceneW} isNight={isNight}/>}
            {!isCityBG&&bg==='mountain' && <MountainBG w={sceneW} outfitType={outfitType}/>}
            {!isCityBG&&bg==='beach'    && <BeachBG    w={sceneW}/>}
            {!isCityBG&&bg==='generic'  && <GenericBG  w={sceneW} outfitType={outfitType}/>}
          </Svg>
        </View>

        {isNight && <Stars/>}
        <Celestial outfitType={outfitType} timeBlock={timeBlock} topSkyColor={skyGrad[0]}/>

        {!isStorm&&!isNight&&(
          <>
            <Cloud startX={50}  y={12} dur={18000} sceneW={sceneW}/>
            <Cloud startX={-80} y={30} dur={25000} sceneW={sceneW}/>
          </>
        )}
        {outfitType==='rain' && <Rain sceneW={sceneW}/>}
        {['snow','freezing'].includes(outfitType) && <Snow sceneW={sceneW}/>}

        {/* Ground */}
        <View style={[s.ground,{backgroundColor:groundCol,width:sceneW}]}>
          <View style={{position:'absolute',top:8,left:0,right:0,bottom:0,backgroundColor:pathCol,opacity:.38,borderRadius:3}}/>
          <GroundDetails outfitType={outfitType}/>
        </View>

        {/* Rock */}
        <Animated.View style={{position:'absolute',top:SKY_H-12,left:ROCK_POS,transform:[{translateX:rockFly}]}}>
          <View style={{width:12,height:9,borderRadius:5,backgroundColor:'rgba(0,0,0,.2)',borderWidth:1,borderColor:'rgba(0,0,0,.08)'}}/>
        </Animated.View>

        {/* Character */}
        <Animated.View style={{position:'absolute',top:CHAR_Y,left:0,width:CHAR_W,transform:[{translateX:walkX},{scaleX}]}}>
          <Char items={items} legAnim={legAnim} kickAnim={kickAnim} gender={gender}/>
        </Animated.View>

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
  badge:   { position: 'absolute', top: 10, backgroundColor: 'rgba(0,0,0,.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:{ fontSize: 10, color: '#fff', fontWeight: '700' },
});
