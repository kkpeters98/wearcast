import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { getOutfitType } from './OutfitScene';

// ─── Scene constants ──────────────────────────────────────────────────────────
const SCENE_H   = 190;
const GROUND_H  = 48;
const SKY_H     = SCENE_H - GROUND_H;   // 142
const CHAR_W    = 28;
const CHAR_H    = 58;
const CHAR_Y    = SKY_H - CHAR_H + 4;   // standing on ground
const WALK_DUR  = 3000;                  // ms per half-cycle

// ─── Outfit item catalogue ────────────────────────────────────────────────────
const ITEMS = {
  hot:      { top:['Tank Top',    '#FFB347'], bot:['Shorts',      '#87CEEB'], shoe:['Sandals',      '#D2B48C'] },
  warm:     { top:['T-Shirt',     '#87CEEB'], bot:['Shorts',      '#C8A96E'], shoe:['Sneakers',     '#e0e0e0'] },
  mild:     { top:['Long Sleeve', '#7EB8D3'], bot:['Jeans',       '#4169E1'], shoe:['Sneakers',     '#e0e0e0'] },
  cool:     { top:['Sweater',     '#CC7744'], bot:['Jeans',       '#4169E1'], shoe:['Sneakers',     '#e0e0e0'] },
  cold:     { top:['Jacket',      '#4B5563'], bot:['Jeans',       '#4169E1'], shoe:['Ankle Boots',  '#6B4226'] },
  freezing: { top:['Winter Coat', '#1E3A8A'], bot:['Jeans',       '#4169E1'], shoe:['Winter Boots', '#374151'] },
  rain:     { top:['Rain Jacket', '#0D9488'], bot:['Jeans',       '#4169E1'], shoe:['Rain Boots',   '#1F2937'] },
  snow:     { top:['Parka',       '#7C3AED'], bot:['Jeans',       '#4169E1'], shoe:['Snow Boots',   '#374151'] },
  formal:   { top:['Blazer',      '#1E293B'], bot:['Dress Pants', '#334155'], shoe:['Dress Shoes',  '#0F172A'] },
  athletic: { top:['Athletic Top','#EF4444'], bot:['Shorts',      '#1E3A8A'], shoe:['Runners',      '#F8FAFC'] },
};

// ─── Sky colours (by time of day) ────────────────────────────────────────────
const SKY = {
  hot:      { am:'#FDE68A', pm:'#FCD34D', ev:'#F97316' },
  warm:     { am:'#BAE6FD', pm:'#60A5FA', ev:'#818CF8' },
  mild:     { am:'#BFDBFE', pm:'#93C5FD', ev:'#A5B4FC' },
  cool:     { am:'#C7D2FE', pm:'#818CF8', ev:'#6366F1' },
  cold:     { am:'#BFDBFE', pm:'#60A5FA', ev:'#3B82F6' },
  freezing: { am:'#E0F2FE', pm:'#BAE6FD', ev:'#7DD3FC' },
  rain:     { am:'#64748B', pm:'#475569', ev:'#334155' },
  snow:     { am:'#E2E8F0', pm:'#CBD5E1', ev:'#94A3B8' },
  formal:   { am:'#1E293B', pm:'#0F172A', ev:'#020617' },
  athletic: { am:'#A7F3D0', pm:'#34D399', ev:'#059669' },
};

const GROUND_COL = {
  hot:'#D97706', warm:'#4ADE80', mild:'#22C55E', cool:'#16A34A',
  cold:'#15803D', freezing:'#F1F5F9', rain:'#334155', snow:'#F8FAFC',
  formal:'#1E293B', athletic:'#22C55E',
};

function timeKey(tb) {
  return tb === 'morning' ? 'am' : tb === 'evening' ? 'ev' : 'pm';
}

// ─── Location flavour ─────────────────────────────────────────────────────────
function locType(loc) {
  const s = (loc || '').toLowerCase();
  if (/beach|miami|hawaii|malibu|san diego|cancun|ibiza/.test(s)) return 'beach';
  if (/york|chicago|boston|london|paris|tokyo|city|angeles|brooklyn/.test(s)) return 'city';
  if (/mountain|denver|boulder|aspen|alps|rockies|vail|tahoe/.test(s)) return 'mountain';
  return 'generic';
}

// ─── Silhouette sub-components ────────────────────────────────────────────────
const DIM_COL = 'rgba(0,0,0,0.14)';

function CityBG() {
  const bs = [{l:0,w:26,h:55},{l:28,w:16,h:78},{l:47,w:22,h:46},{l:72,w:14,h:70},
              {l:89,w:20,h:85},{l:162,w:18,h:60},{l:183,w:24,h:74},{l:210,w:14,h:50},{l:227,w:26,h:67},{l:256,w:16,h:82}];
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:0,height:90}]} pointerEvents="none">
      {bs.map((b,i)=><View key={i} style={{position:'absolute',bottom:0,left:b.l,width:b.w,height:b.h,backgroundColor:DIM_COL}}/>)}
    </View>
  );
}

function MountainBG() {
  const ms = [{x:-10,w:120,h:80},{x:70,w:160,h:102},{x:180,w:130,h:76}];
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:0,height:108}]} pointerEvents="none">
      {ms.map((m,i)=>(
        <View key={i} style={{position:'absolute',bottom:0,left:m.x,width:0,height:0,
          borderLeftWidth:m.w/2,borderRightWidth:m.w/2,borderBottomWidth:m.h,
          borderLeftColor:'transparent',borderRightColor:'transparent',borderBottomColor:DIM_COL}}/>
      ))}
    </View>
  );
}

function TreeBG() {
  const ts=[{x:10},{x:55},{x:215},{x:262}];
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:0,height:68}]} pointerEvents="none">
      {ts.map((t,i)=>(
        <View key={i} style={{position:'absolute',bottom:0,left:t.x}}>
          <View style={{width:0,height:0,borderLeftWidth:12,borderRightWidth:12,borderBottomWidth:32,
            borderLeftColor:'transparent',borderRightColor:'transparent',borderBottomColor:DIM_COL,alignSelf:'center'}}/>
          <View style={{width:6,height:14,backgroundColor:DIM_COL,alignSelf:'center'}}/>
        </View>
      ))}
    </View>
  );
}

function BeachBG() {
  return (
    <View style={[StyleSheet.absoluteFill,{top:undefined,bottom:0,height:74}]} pointerEvents="none">
      <View style={{position:'absolute',bottom:0,left:20,width:7,height:56,backgroundColor:DIM_COL,borderRadius:4,transform:[{rotate:'6deg'}]}}/>
      {[-35,-15,5,20,38].map((r,i)=>(
        <View key={i} style={{position:'absolute',bottom:52,left:12,width:34,height:7,
          backgroundColor:DIM_COL,borderRadius:4,transform:[{rotate:`${r}deg`}]}}/>
      ))}
      <View style={{position:'absolute',bottom:0,right:25,width:5,height:42,backgroundColor:DIM_COL,borderRadius:3}}/>
      {[-30,-10,8,24].map((r,i)=>(
        <View key={i} style={{position:'absolute',bottom:38,right:18,width:26,height:6,
          backgroundColor:DIM_COL,borderRadius:3,transform:[{rotate:`${r}deg`}]}}/>
      ))}
    </View>
  );
}

// ─── Celestial body (sun / moon) ──────────────────────────────────────────────
function Celestial({ outfitType, timeBlock, skyColor }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const isNight = outfitType === 'formal' || timeBlock === 'evening';
  useEffect(() => {
    if (!isNight) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse,{toValue:1.14,duration:2200,useNativeDriver:true}),
        Animated.timing(pulse,{toValue:1,   duration:2200,useNativeDriver:true}),
      ])).start();
    }
  },[]);
  const tk = timeKey(timeBlock);
  const leftPct = tk==='am'?'12%' : tk==='ev'?'72%' : '47%';
  const topV    = tk==='pm' ? 10 : 22;
  if (isNight) return (
    <View style={{position:'absolute',top:topV,left:leftPct}}>
      <View style={{width:22,height:22,borderRadius:11,backgroundColor:'#FEF3C7'}}/>
      <View style={{position:'absolute',top:-2,left:5,width:20,height:20,borderRadius:10,backgroundColor:skyColor}}/>
    </View>
  );
  const sunCol = tk==='ev'?'#FCA5A5' : tk==='am'?'#FDE68A':'#FEF08A';
  return (
    <Animated.View style={{position:'absolute',top:topV,left:leftPct,transform:[{scale:pulse}]}}>
      <View style={{width:28,height:28,borderRadius:14,backgroundColor:sunCol,opacity:0.95}}/>
    </Animated.View>
  );
}

// ─── Stars (evening / formal) ─────────────────────────────────────────────────
function Stars() {
  const twinkle = useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(twinkle,{toValue:1,duration:900,useNativeDriver:true}),
      Animated.timing(twinkle,{toValue:0.3,duration:900,useNativeDriver:true}),
    ])).start();
  },[]);
  const pts = [{x:30,y:12},{x:80,y:6},{x:130,y:16},{x:200,y:8},{x:250,y:18},{x:290,y:11}];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pts.map((p,i)=>(
        <Animated.Text key={i} style={{position:'absolute',top:p.y,left:p.x,color:'#FEF08A',fontSize:8,
          opacity:twinkle}}>✦</Animated.Text>
      ))}
    </View>
  );
}

// ─── Drifting cloud ───────────────────────────────────────────────────────────
function CloudShape({ startX, y, dur, maxW }) {
  const x = useRef(new Animated.Value(startX)).current;
  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(x,{toValue:maxW+80,duration:dur,useNativeDriver:true}),
      Animated.timing(x,{toValue:-80,duration:0,useNativeDriver:true}),
    ])).start();
  },[]);
  return (
    <Animated.View style={{position:'absolute',top:y,transform:[{translateX:x}]}}>
      <View style={{flexDirection:'row',alignItems:'flex-end'}}>
        <View style={{width:22,height:11,borderRadius:6,backgroundColor:'rgba(255,255,255,0.72)',marginRight:-5}}/>
        <View style={{width:34,height:17,borderRadius:9,backgroundColor:'rgba(255,255,255,0.78)'}}/>
        <View style={{width:18,height:10,borderRadius:5,backgroundColor:'rgba(255,255,255,0.72)',marginLeft:-5}}/>
      </View>
    </Animated.View>
  );
}

// ─── Rain drops ───────────────────────────────────────────────────────────────
function RainFX({ sceneW }) {
  const count = 9;
  const anims = useRef(Array.from({length:count},()=>new Animated.Value(0))).current;
  useEffect(()=>{
    anims.forEach((a,i)=>{
      const go=()=>{ a.setValue(0); Animated.timing(a,{toValue:1,duration:550+i*40,useNativeDriver:true}).start(go); };
      setTimeout(go, i*130);
    });
  },[]);
  return (
    <View style={[StyleSheet.absoluteFill,{height:SKY_H+10}]} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.View key={i} style={{position:'absolute',left:(sceneW/count)*i+6,top:0,
          width:1.5,height:11,backgroundColor:'rgba(148,163,184,0.75)',borderRadius:1,
          transform:[{translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H]})}],
          opacity:a.interpolate({inputRange:[0,0.8,1],outputRange:[0.8,0.8,0]})}}/>
      ))}
    </View>
  );
}

// ─── Snowflakes ───────────────────────────────────────────────────────────────
function SnowFX({ sceneW }) {
  const count = 8;
  const anims = useRef(Array.from({length:count},()=>new Animated.Value(0))).current;
  const xs    = useRef(Array.from({length:count},(_,i)=> 10+(sceneW/count)*i )).current;
  useEffect(()=>{
    anims.forEach((a,i)=>{
      const go=()=>{ a.setValue(0); Animated.timing(a,{toValue:1,duration:2200+i*200,useNativeDriver:true}).start(go); };
      setTimeout(go, i*320);
    });
  },[]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a,i)=>(
        <Animated.Text key={i} style={{position:'absolute',left:xs[i],fontSize:11,color:'rgba(255,255,255,0.85)',
          transform:[
            {translateY:a.interpolate({inputRange:[0,1],outputRange:[0,SKY_H+10]})},
            {translateX:a.interpolate({inputRange:[0,0.5,1],outputRange:[0,9,0]})},
          ],
          opacity:a.interpolate({inputRange:[0,0.85,1],outputRange:[1,1,0]})}}>✦</Animated.Text>
      ))}
    </View>
  );
}

// ─── Ground details ───────────────────────────────────────────────────────────
function GroundDetails({ outfitType, sceneW }) {
  if (outfitType === 'rain') return (
    <View pointerEvents="none">
      {[40,110,200].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:8,left:x,width:22,height:6,
          borderRadius:3,backgroundColor:'rgba(148,163,184,0.5)'}}/>
      ))}
    </View>
  );
  if (outfitType === 'snow' || outfitType === 'freezing') return (
    <View pointerEvents="none">
      {[20,90,170,245].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:6,left:x,width:30+i*8,height:10,
          borderRadius:10,backgroundColor:'rgba(255,255,255,0.65)'}}/>
      ))}
    </View>
  );
  if (outfitType === 'hot') return (
    <View pointerEvents="none">
      {[50,140,230].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:8,left:x,width:8,height:8,borderRadius:4,
          backgroundColor:'rgba(255,255,255,0.3)'}}/>
      ))}
    </View>
  );
  // flowers for mild/cool
  if (['mild','cool','warm'].includes(outfitType)) return (
    <View pointerEvents="none">
      {[35,115,195].map((x,i)=>(
        <View key={i} style={{position:'absolute',bottom:9,left:x}}>
          <View style={{width:6,height:6,borderRadius:3,backgroundColor:['#FCD34D','#F9A8D4','#A7F3D0'][i],alignSelf:'center'}}/>
          <View style={{width:2,height:7,backgroundColor:'#166534',alignSelf:'center'}}/>
        </View>
      ))}
    </View>
  );
  return null;
}

// ─── Animated character ───────────────────────────────────────────────────────
function CharBody({ items, legAnim, kickAnim, gender }) {
  const [topCol, botCol, shoeCol] = [items.top[1], items.bot[1], items.shoe[1]];

  const leftLegY  = legAnim.interpolate({inputRange:[-1,1],outputRange:[-5,5]});
  const rightLegY = Animated.add(
    legAnim.interpolate({inputRange:[-1,1],outputRange:[5,-5]}),
    kickAnim.interpolate({inputRange:[0,1],outputRange:[0,10]})
  );
  const rightFootX = kickAnim.interpolate({inputRange:[0,1],outputRange:[0,10]});
  const bodyY = legAnim.interpolate({inputRange:[-1,-0.3,0.3,1],outputRange:[-2,-3,-3,-2]});

  const hairCol = gender==='womens'?'#D97706': gender==='mens'?'#374151':'#9CA3AF';
  const showHair = gender !== 'neutral';

  return (
    <Animated.View style={{transform:[{translateY:bodyY}],alignItems:'center'}}>
      {/* Hair */}
      {showHair && (
        <View style={{width: gender==='womens'?22:20, height:gender==='womens'?9:6,
          borderTopLeftRadius:10,borderTopRightRadius:10,
          backgroundColor:hairCol, marginBottom:-2}}/>
      )}
      {/* Head */}
      <View style={{width:20,height:20,borderRadius:10,backgroundColor:'#FBBF91',
        justifyContent:'center',alignItems:'center'}}>
        <View style={{flexDirection:'row',gap:5}}>
          <View style={{width:3,height:3,borderRadius:2,backgroundColor:'#1F2937'}}/>
          <View style={{width:3,height:3,borderRadius:2,backgroundColor:'#1F2937'}}/>
        </View>
      </View>
      {/* Body + arms */}
      <View style={{flexDirection:'row',alignItems:'center',marginTop:1}}>
        <View style={{width:5,height:12,borderRadius:3,backgroundColor:topCol,marginRight:1}}/>
        <View style={{width:16,height:15,borderRadius:4,backgroundColor:topCol}}/>
        <View style={{width:5,height:12,borderRadius:3,backgroundColor:topCol,marginLeft:1}}/>
      </View>
      {/* Legs */}
      <View style={{flexDirection:'row',gap:3,marginTop:1}}>
        <Animated.View style={{width:7,height:16,borderRadius:4,backgroundColor:botCol,
          transform:[{translateY:leftLegY}]}}/>
        <Animated.View style={{width:7,height:16,borderRadius:4,backgroundColor:botCol,
          transform:[{translateY:rightLegY}]}}/>
      </View>
      {/* Feet */}
      <View style={{flexDirection:'row',gap:3,marginTop:1}}>
        <View style={{width:9,height:5,borderRadius:3,backgroundColor:shoeCol}}/>
        <Animated.View style={{width:9,height:5,borderRadius:3,backgroundColor:shoeCol,
          transform:[{translateX:rightFootX}]}}/>
      </View>
    </Animated.View>
  );
}

// ─── Clothing chip (below scene) ──────────────────────────────────────────────
function ClothChip({ label, color }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.swatch,{backgroundColor:color}]}/>
      <Text style={styles.chipTxt}>{label}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeatherUniverse({ weather, eventType='casual', gender='neutral', timeBlock='fullday', location='' }) {
  const { width } = useWindowDimensions();
  const SCENE_W  = width - 80;  // card padding
  const CHAR_MAX = SCENE_W - CHAR_W - 10;
  const ROCK_X   = SCENE_W * 0.62;

  const outfitType = getOutfitType(weather, eventType);
  const items      = ITEMS[outfitType] || ITEMS.mild;
  const tk         = timeKey(timeBlock);
  const skyColor   = (SKY[outfitType] || SKY.mild)[tk];
  const groundCol  = GROUND_COL[outfitType] || '#22C55E';
  const bgType     = locType(location);
  const isNight    = outfitType === 'formal' || timeBlock === 'evening';
  const showClouds = !['rain','snow','freezing'].includes(outfitType);

  // ── Animations ──
  const walkX   = useRef(new Animated.Value(20)).current;
  const scaleX  = useRef(new Animated.Value(1)).current;
  const legAnim = useRef(new Animated.Value(0)).current;
  const kickAnim= useRef(new Animated.Value(0)).current;
  const rockFly = useRef(new Animated.Value(0)).current;

  const [facingRight, setFacingRight] = useState(true);

  useEffect(()=>{
    // Walk back and forth
    const walk=(toRight)=>{
      setFacingRight(toRight);
      scaleX.setValue(toRight?1:-1);
      Animated.timing(walkX,{toValue:toRight?CHAR_MAX:20,duration:WALK_DUR,useNativeDriver:true})
        .start(({finished})=>{ if(finished) walk(!toRight); });
    };
    walk(true);

    // Leg swing
    Animated.loop(Animated.sequence([
      Animated.timing(legAnim,{toValue:1, duration:260,useNativeDriver:true}),
      Animated.timing(legAnim,{toValue:-1,duration:260,useNativeDriver:true}),
    ])).start();

    // Kick at ~60% of each half-walk + rock reaction
    const kickLoop=()=>{
      // kick at ~1800ms (char reaches ~60% of walk)
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(kickAnim,{toValue:1,duration:180,useNativeDriver:true}),
        Animated.timing(kickAnim,{toValue:0,duration:180,useNativeDriver:true}),
        Animated.delay(WALK_DUR*2 - 1800 - 360),
        Animated.timing(kickAnim,{toValue:1,duration:180,useNativeDriver:true}),
        Animated.timing(kickAnim,{toValue:0,duration:180,useNativeDriver:true}),
        Animated.delay(200),
      ]).start(kickLoop);
    };
    kickLoop();

    // Rock flies when kicked
    const rockLoop=()=>{
      Animated.sequence([
        Animated.delay(1980),
        Animated.timing(rockFly,{toValue:28, duration:320,useNativeDriver:true}),
        Animated.timing(rockFly,{toValue:0,  duration:700,useNativeDriver:true}),
        Animated.delay(WALK_DUR*2 - 1980 - 1020),
        Animated.timing(rockFly,{toValue:-28,duration:320,useNativeDriver:true}),
        Animated.timing(rockFly,{toValue:0,  duration:700,useNativeDriver:true}),
        Animated.delay(200),
      ]).start(rockLoop);
    };
    rockLoop();

    return ()=>{
      walkX.stopAnimation();
      legAnim.stopAnimation();
    };
  },[CHAR_MAX]);

  return (
    <View style={styles.wrap}>
      {/* ── Scene card ── */}
      <View style={[styles.scene,{width:SCENE_W,backgroundColor:skyColor}]}>

        {/* Sky layer */}
        {isNight && <Stars/>}
        <Celestial outfitType={outfitType} timeBlock={timeBlock} skyColor={skyColor}/>
        {showClouds && <>
          <CloudShape startX={30}  y={14} dur={14000} maxW={SCENE_W}/>
          <CloudShape startX={-60} y={28} dur={20000} maxW={SCENE_W}/>
        </>}

        {/* Weather effects */}
        {outfitType==='rain'                     && <RainFX  sceneW={SCENE_W}/>}
        {['snow','freezing'].includes(outfitType) && <SnowFX  sceneW={SCENE_W}/>}

        {/* Background silhouette */}
        {bgType==='city'     && <CityBG/>}
        {bgType==='mountain' && <MountainBG/>}
        {bgType==='beach'    && <BeachBG/>}
        {bgType==='generic'  && <TreeBG/>}

        {/* Ground */}
        <View style={[styles.ground,{backgroundColor:groundCol,width:SCENE_W}]}>
          <GroundDetails outfitType={outfitType} sceneW={SCENE_W}/>
        </View>

        {/* Rock */}
        <Animated.View style={{position:'absolute',top:SKY_H-8,left:ROCK_X,
          transform:[{translateX:rockFly}]}}>
          <View style={{width:9,height:7,borderRadius:4,backgroundColor:'rgba(0,0,0,0.22)'}}/>
        </Animated.View>

        {/* Character */}
        <Animated.View style={{
          position:'absolute',
          top:CHAR_Y,
          left:0,
          transform:[{translateX:walkX},{scaleX:scaleX}],
          width:CHAR_W,
        }}>
          <CharBody items={items} legAnim={legAnim} kickAnim={kickAnim} gender={gender}/>
        </Animated.View>

        {/* Occasion badge */}
        {eventType !== 'casual' && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{eventType.charAt(0).toUpperCase()+eventType.slice(1)}</Text>
          </View>
        )}

        {/* Time badge */}
        {timeBlock !== 'fullday' && (
          <View style={[styles.badge,{right:undefined,left:10}]}>
            <Text style={styles.badgeTxt}>{timeBlock.charAt(0).toUpperCase()+timeBlock.slice(1)}</Text>
          </View>
        )}
      </View>

      {/* ── Clothing chips ── */}
      <View style={styles.chips}>
        <ClothChip label={items.top[0]}  color={items.top[1]}/>
        <ClothChip label={items.bot[0]}  color={items.bot[1]}/>
        <ClothChip label={items.shoe[0]} color={items.shoe[1]}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  scene: { height: SCENE_H, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  ground:{ position:'absolute', bottom:0, left:0, height:GROUND_H },

  chips: { flexDirection:'row', gap:8, marginTop:10 },
  chip:  { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'#f5f5f5',
           borderRadius:10, paddingHorizontal:10, paddingVertical:9, gap:7 },
  swatch:{ width:12, height:12, borderRadius:6, flexShrink:0 },
  chipTxt:{ fontSize:12, fontWeight:'600', color:'#333', flexShrink:1 },

  badge: { position:'absolute', top:10, right:10, backgroundColor:'rgba(0,0,0,0.25)',
           borderRadius:8, paddingHorizontal:8, paddingVertical:3 },
  badgeTxt:{ fontSize:10, color:'#fff', fontWeight:'700' },
});
