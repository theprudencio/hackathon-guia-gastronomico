interface MascotProps {
  className?: string;
}

/** Pinguim-chef do RestôBusca (vetor, sem fundo). */
export function PenguinMascot({ className = 'h-40 w-40' }: MascotProps) {
  return (
    <svg viewBox="0 0 200 190" className={className} role="img" aria-label="Pinguim chef com garfo">
      {/* tracinhos de animação */}
      <g stroke="#f97316" strokeWidth="6" strokeLinecap="round">
        <line x1="136" y1="58" x2="143" y2="40" />
        <line x1="148" y1="62" x2="156" y2="46" />
      </g>

      {/* garfo com petisco (a asinha passa por cima do cabo) */}
      <g transform="translate(170 44)" stroke="#374151" strokeWidth="4" strokeLinecap="round">
        <line x1="0" y1="16" x2="0" y2="56" />
        <line x1="-9" y1="0" x2="-9" y2="17" />
        <line x1="-3" y1="0" x2="-3" y2="17" />
        <line x1="3" y1="0" x2="3" y2="17" />
        <line x1="9" y1="0" x2="9" y2="17" />
        <line x1="-9" y1="17" x2="9" y2="17" />
      </g>
      <rect x="157" y="32" width="27" height="19" rx="9.5" fill="#f2b63c" stroke="#232b36" strokeWidth="3.5" transform="rotate(8 170 41)" />
      <circle cx="165" cy="40" r="1.8" fill="#d97706" />
      <circle cx="173" cy="43" r="1.8" fill="#d97706" />

      {/* corpo */}
      <ellipse cx="100" cy="122" rx="56" ry="58" fill="#232b36" />
      {/* barriga */}
      <ellipse cx="100" cy="154" rx="33" ry="25" fill="#ffffff" />
      {/* rosto */}
      <ellipse cx="100" cy="97" rx="44" ry="38" fill="#ffffff" />

      {/* olhos fechados felizes */}
      <g fill="none" stroke="#232b36" strokeWidth="5" strokeLinecap="round">
        <path d="M70 96 Q79 85 88 96" />
        <path d="M112 96 Q121 85 130 96" />
      </g>
      {/* blush */}
      <ellipse cx="66" cy="110" rx="6.5" ry="5" fill="#f4b183" />
      <ellipse cx="134" cy="110" rx="6.5" ry="5" fill="#f4b183" />

      {/* bico aberto */}
      <ellipse cx="100" cy="111" rx="8.5" ry="7.5" fill="#431407" />
      <path d="M86 102 Q100 95 114 102 Q108 111 100 111 Q92 111 86 102 Z" fill="#fbbf24" stroke="#232b36" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M92 112 Q100 110 108 112 Q105 121 100 121 Q95 121 92 112 Z" fill="#f59e0b" stroke="#232b36" strokeWidth="3" strokeLinejoin="round" />

      {/* chapéu de chef */}
      <g transform="rotate(-6 100 55)">
        <circle cx="70" cy="36" r="16" fill="#ffffff" stroke="#232b36" strokeWidth="4.5" />
        <circle cx="100" cy="24" r="21" fill="#ffffff" stroke="#232b36" strokeWidth="4.5" />
        <circle cx="130" cy="36" r="16" fill="#ffffff" stroke="#232b36" strokeWidth="4.5" />
        <rect x="60" y="44" width="80" height="22" rx="11" fill="#ffffff" stroke="#232b36" strokeWidth="4.5" />
        <path d="M84 28 q7 -7 14 -3" fill="none" stroke="#232b36" strokeWidth="3" strokeLinecap="round" />
        <path d="M106 20 q7 -4 12 2" fill="none" stroke="#232b36" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* cachecol */}
      <path d="M44 138 Q100 160 156 138 L150 157 Q100 177 50 157 Z" fill="#f04e23" stroke="#232b36" strokeWidth="4" strokeLinejoin="round" />
      <path d="M118 152 q10 4 18 1" fill="none" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" />

      {/* asinhas */}
      <ellipse cx="46" cy="148" rx="13" ry="22" fill="#232b36" transform="rotate(12 46 148)" />
      <ellipse cx="158" cy="100" rx="12" ry="24" fill="#232b36" transform="rotate(-20 158 100)" />
    </svg>
  );
}
