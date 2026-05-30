import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

interface KlikLogoProps {
  width?: number;
  showTagline?: boolean;
  variant?: 'dark' | 'light' | 'brand';
}

function KlikIcon({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="kGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F5C842" />
          <Stop offset="100%" stopColor="#0A8C52" />
        </LinearGradient>
      </Defs>

      {/* Fond arrondi vert foncé */}
      <Rect x="0" y="0" width="100" height="100" rx="22" fill="#0D2B1A" />

      {/* Jambe gauche du K — barre verticale */}
      <Rect x="18" y="18" width="14" height="64" rx="6" fill="#F5C842" />

      {/* Bras supérieur du K */}
      <Path
        d="M32 50 L62 18"
        stroke="#F5C842"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bras inférieur du K — vert */}
      <Path
        d="M32 50 L62 82"
        stroke="#0A8C52"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* Point/cercle orange à droite */}
      <Circle cx="72" cy="50" r="10" fill="#F5A623" />
      <Circle cx="72" cy="50" r="5" fill="#0D2B1A" />

      {/* Ondes wifi autour du point */}
      <Path
        d="M84 42 Q92 50 84 58"
        fill="none"
        stroke="#F5A623"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <Path
        d="M88 36 Q100 50 88 64"
        fill="none"
        stroke="#F5A623"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </Svg>
  );
}

export default function KlikLogo({ width = 100, showTagline = false }: KlikLogoProps) {
  const iconSize = width * 0.42;

  return (
    <View style={s.row}>
      <KlikIcon size={iconSize} />
      <View>
        <Text style={[s.name, { fontSize: width * 0.18 }]}></Text>
        {showTagline && (
          <Text style={[s.tag, { fontSize: width * 0.08 }]}>GAZ · ABIDJAN</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tag:  { color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 1 },
});