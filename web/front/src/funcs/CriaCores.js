import chroma from "chroma-js";

export function gerarCoresComunidades(nComunidades) {
    const n = nComunidades ?? 16;
    const escala = chroma.scale(['#FF6B6B', '#6BCB77', '#4D96FF', '#FFD93D']).mode('lch').colors(n);
    return escala;
  }