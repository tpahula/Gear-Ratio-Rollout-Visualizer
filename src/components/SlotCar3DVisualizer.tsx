import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Box,
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Ruler,
} from 'lucide-react';
import { CalculationResult, GearPitch, GearSetup } from '../types/gears';
import {
  GEAR_MESH_CLEARANCE_MM,
  getPinionOuterDiameterMm,
  getPinionPitchDiameterMm,
  getSpurOuterDiameterMm,
} from '../utils/gearMath';
import { Language } from '../i18n/translations';

interface SlotCar3DVisualizerProps {
  setup: GearSetup;
  metrics: CalculationResult;
  lang: Language;
}

export type CameraPresetId =
  | 'iso'
  | 'stator'
  | 'rotor'
  | 'drivetrain'
  | 'clearances'
  | 'guide'
  | 'pcb'
  | 'wheel-bore'
  | 'wheel-inner'
  | 'top'
  | 'bottom'
  | 'side'
  | 'rear';

export interface ReferencePhoto {
  id: string;
  src: string;
  titleFi: string;
  titleEn: string;
  descFi: string;
  descEn: string;
  preset: CameraPresetId;
}

export const REFERENCE_PHOTOS: ReferencePhoto[] = [
  {
    id: 'photo-1',
    src: '/assets/aistudio/20261105_100614_aa84a025.jpg',
    titleFi: 'UUSIN: Moottorin staattorin puoli, avoimet kuparikäämit & pinjoni',
    titleEn: 'LATEST: Motor Stator Side, Exposed Copper Coils & Pinion',
    descFi: 'Moottorin staattorin puolen avoin CNC-alumiinikiinnike, paljaat kuparikäämit, vaihejohtojen läpivientikorvake (reikä päällä) ja rataskosketus.',
    descEn: 'Open CNC aluminum stator mount, exposed copper stator windings, front cable lug with top hole, and brass pinion / spur mesh.',
    preset: 'stator',
  },
  {
    id: 'photo-2',
    src: '/assets/aistudio/20261105_100801_f8bf0e96.jpg',
    titleFi: 'UUSIN: Staattorin käämit, päätykorvake & hammaskosketus',
    titleEn: 'LATEST: Stator Windings, Endbell Lug & Gear Mesh Macro',
    descFi: 'Lähikuva staattorin puolen avoimesta käämitilasta, kuparilankalenkeistä, roottorikellon reunasta sekä pinjonin ja spur-rattaan kosketuksesta.',
    descEn: 'Macro view of the open stator winding window, copper wire loops, rotor bell edge, and pinion/spur tooth mesh.',
    preset: 'stator',
  },
  {
    id: 'photo-rotor-1',
    src: '/assets/aistudio/20261105_120336_690256fa.jpg',
    titleFi: 'Moottorin roottori, kuparikäämit & kevennetty spur-ratas',
    titleEn: 'Motor Rotor Face, Copper Windings & Lightened Spur',
    descFi: 'Ulkopyörijämoottorin (outrunner) koneistettu 4-kaksoispuolainen roottorin pääty, tuuletusaukot, monisäikeiset kuparikäämit ja 6-aukkoinen spur-ratas.',
    descEn: 'Machined 4-twin-spoke outrunner rotor face, ventilation windows, multi-strand copper stator windings, and 6-window lightened spur gear.',
    preset: 'rotor',
  },
  {
    id: 'photo-latest-1',
    src: '/assets/aistudio/20261105_110728_b592d12f.jpg',
    titleFi: 'Vanteen sisäreuna, sininen napa, akseli & laakeri',
    titleEn: 'Wheel Inner Edge, Blue Hub, Axle & Bearing',
    descFi: 'Solukumirenkaan pyöristetty sisäreuna, sininen eloksoitu sisänapa, teräsakseli ja laakeripukin juotettu holkkilaakeri.',
    descEn: 'Rounded inner sponge tire edge, blue anodized inner hub boss, steel axle, and soldered bearing on the upright.',
    preset: 'wheel-inner',
  },
  {
    id: 'photo-latest-2',
    src: '/assets/aistudio/20261105_113204_5c4bf29c.jpg',
    titleFi: 'Rungon rakenne & ESC:n sijainti vasemmalla',
    titleEn: 'Chassis Layout & Left-Center ESC Position',
    descFi: 'Adv V2.7 -ESC vasemman sisäpalkin ja keskipalkin välissä, vääntötanko oikeassa reunassa, V-kieli (047) ja kolmiomaiset takasiivet.',
    descEn: 'Adv V2.7 ESC mounted between left inner rail and center spine, torsion bar on right edge, V-tongue (047), and triangular rear wings.',
    preset: 'pcb',
  },
  {
    id: 'photo-new-1',
    src: '/assets/aistudio/20261105_104735_c645f64a.jpg',
    titleFi: 'Takavanteen sisäkeskiö, laakeripukki & staattorin sivu',
    titleEn: 'Rear Wheel Bore, Bearing Upright & Stator Side',
    descFi: 'Porrastettu sisäkeskiö solukumirenkaan sisällä, laakeripukin kuusiokoloruuvi ja staattorin avoimet kuparikäämit vasemmalta nähtynä.',
    descEn: 'Stepped inner hub inside sponge tire, button-head hex screw on upright, and exposed stator copper coils viewed from the left.',
    preset: 'wheel-bore',
  },
  {
    id: 'photo-new-2',
    src: '/assets/aistudio/20261105_104754_11e248a8.jpg',
    titleFi: 'Ohjainkieli, kupariharjat & puristusholkit (Sivu)',
    titleEn: 'Guide Flag, Copper Braids & Crimp Clips (Side)',
    descFi: 'Läpikuultava ohjainkieli, taitetut kupariliuskakiinnikkeet, punotut kupariharjat, puristusholkit ja kuusiomutteri.',
    descEn: 'Translucent guide flag, folded copper contact clips, braided copper pickups, crimp ferrules, and hex nut.',
    preset: 'guide',
  },
  {
    id: 'photo-new-3',
    src: '/assets/aistudio/20261105_104832_96a4c8f9.jpg',
    titleFi: 'Adv V2.7 ESC -piirilevy, SMD-osat & keskirunko',
    titleEn: 'Adv V2.7 ESC PCB, SMD Components & Mid-Chassis',
    descFi: 'Vasemmalle sisäpalkille ja keskipalkille sijoitettu Adv V2.7 -kortti, 6 MOSFETia (Q1–Q7), 4 kondensaattoria ja johtolenkit.',
    descEn: 'Left-center Adv V2.7 PCB, 6 MOSFETs (Q1–Q7), 4 ceramic capacitors, gold test pads, and wire retainer loops.',
    preset: 'pcb',
  },
  {
    id: 'photo-new-4',
    src: '/assets/aistudio/20261105_104808_9d0383e7.jpg',
    titleFi: 'Keulan joustogeometria, johdonpidikkeet & ohjain',
    titleEn: 'Front Nose Flex Geometry, Wire Loops & Guide',
    descFi: 'Kaksi juotettua johdonpidikelenkkiä (047-tarran vieressä), J-joustourat, L-koukkupäät ja korikiinnitysputket.',
    descEn: 'Dual soldered wire retainer rings next to 047 sticker, J-flex slots, L-hook tips, and brass body pin tubes.',
    preset: 'guide',
  },
  {
    id: 'photo-4',
    src: '/assets/aistudio/20261105_100358_7d0831bd.jpg',
    titleFi: 'Koko runko ylhäältä (Top View)',
    titleEn: 'Full Chassis Top View',
    descFi: 'Teräsleikattu runko, Adv V2.7 -ohjainkortti, keltaiset virtajohdot, ohjainkieli ja taka-akselisto.',
    descEn: 'Laser-cut steel chassis, Adv V2.7 ESC board, yellow power leads, guide flag, and rear axle assembly.',
    preset: 'top',
  },
  {
    id: 'photo-6',
    src: '/assets/aistudio/20261105_100624_2e1a1685.jpg',
    titleFi: 'Takaviisto: Moottori, ESC & Akselisto',
    titleEn: 'Rear Isometric: Motor, ESC & Axle',
    descFi: 'Kolme mustaa moottorivaihejohtoa, Adv V2.7 -piirilevy, taka-akselin tuenta ja korikiinnitysputket.',
    descEn: 'Three black motor phase leads, Adv V2.7 PCB, rear axle carrier frame, and brass body pin tubes.',
    preset: 'iso',
  },
  {
    id: 'photo-9',
    src: '/assets/aistudio/20261105_100606_1ce29a17.jpg',
    titleFi: 'Takaosan geometria ylhäältä',
    titleEn: 'Rear Geometry Top-Down',
    descFi: 'Moottorin sijoitus taka-akselin etupuolelle, sininen spur-napa ja rungon takasiivekkeet (047).',
    descEn: 'Motor placement ahead of rear axle, blue spur collar, and rear chassis wing pans (047).',
    preset: 'top',
  },
  {
    id: 'photo-5',
    src: '/assets/aistudio/20261105_100731_102acde0.jpg',
    titleFi: 'Alapuoli: Taka-akseli & Moottorikehto',
    titleEn: 'Underside: Rear Axle & Motor Cradle',
    descFi: 'Rungon alapinta, Latvian Slot Production -piirilevy ja spur-rattaan ulottuvuus rungon alapuolelle.',
    descEn: 'Chassis bottom surface, Latvian Slot Production PCB, and spur gear protrusion below the chassis.',
    preset: 'bottom',
  },
  {
    id: 'photo-10',
    src: '/assets/aistudio/20261105_100528_a53ed629.jpg',
    titleFi: 'Koko runko alapuolelta (Bottom View)',
    titleEn: 'Full Chassis Underside View',
    descFi: 'Kupariset virtaharjat (braids), valkoinen ohjainkieli, keskikieli ja Latvian Slot Production V2.7 -teksti.',
    descEn: 'Copper pickup braids, white guide shoe, center tongue, and Latvian Slot Production V2.7 silkscreen.',
    preset: 'bottom',
  },
  {
    id: 'photo-3',
    src: '/assets/aistudio/20261105_100536_428a14d9.jpg',
    titleFi: 'Sivuprofiili & Maavara (Alaviisto)',
    titleEn: 'Side Profile & Ground Clearance',
    descFi: 'Rungon litteä profiili, ohjainkielen kulma ja takarenkaiden suhde rungon alapintaan.',
    descEn: 'Flat chassis profile, guide flag angle, and rear tire relationship to the chassis bottom plane.',
    preset: 'clearances',
  },
  {
    id: 'photo-7',
    src: '/assets/aistudio/20261105_100637_4974fc58.jpg',
    titleFi: 'Sivunäkymä vanteeseen ja moottoriin',
    titleEn: 'Wheel Bore & Motor Side Elevation',
    descFi: 'Ontto kevytmetallivanne solukumirenkaan sisällä, moottorin pääty ja korikiinnitysputki.',
    descEn: 'Hollow lightweight wheel hub inside the sponge tire, motor endbell, and brass body pin tube.',
    preset: 'wheel-bore',
  },
  {
    id: 'photo-8',
    src: '/assets/aistudio/20261105_100545_17e53803.jpg',
    titleFi: 'Etuviisto kokokuva',
    titleEn: 'Front-Quarter Full View',
    descFi: 'Rungon joustogeometria, pitkittäispalkit, ohjainkieli ja takarenkaat.',
    descEn: 'Chassis flex geometry, longitudinal rails, guide flag, and rear foam tires.',
    preset: 'iso',
  },
];

// Reusable math objects at module scope (zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

// Detect software WebGL once
const IS_SOFTWARE_GL = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

/**
 * Generates an involute-like 2D THREE.Shape for a gear with `teeth` count, `outerRadius`, `rootRadius`, and `boreRadius`
 */
function createGearShape(
  teeth: number,
  pitchRadius: number,
  outerRadius: number,
  rootRadius: number,
  boreRadius: number,
  addWebWindows = false
): THREE.Shape {
  const shape = new THREE.Shape();
  const numTeeth = Math.max(4, Math.round(teeth));
  const stepAngle = (Math.PI * 2) / numTeeth;

  for (let i = 0; i < numTeeth; i++) {
    const baseAngle = i * stepAngle;
    const a0 = baseAngle - stepAngle * 0.36;
    const a1 = baseAngle - stepAngle * 0.22;
    const a2 = baseAngle - stepAngle * 0.11;
    const a3 = baseAngle + stepAngle * 0.11;
    const a4 = baseAngle + stepAngle * 0.22;
    const a5 = baseAngle + stepAngle * 0.36;

    const p0x = Math.cos(a0) * rootRadius;
    const p0y = Math.sin(a0) * rootRadius;
    if (i === 0) {
      shape.moveTo(p0x, p0y);
    } else {
      shape.lineTo(p0x, p0y);
    }

    shape.lineTo(Math.cos(a1) * pitchRadius, Math.sin(a1) * pitchRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * outerRadius, Math.sin(a3) * outerRadius);
    shape.lineTo(Math.cos(a4) * pitchRadius, Math.sin(a4) * pitchRadius);
    shape.lineTo(Math.cos(a5) * rootRadius, Math.sin(a5) * rootRadius);
  }
  shape.closePath();

  if (boreRadius > 0.1 && boreRadius < rootRadius * 0.92) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  // 6 curved lightening windows in the spur gear web (visible in macro photo 20261105_120336_690256fa.jpg!)
  if (addWebWindows && rootRadius - boreRadius > 2.8) {
    const rInner = Math.max(boreRadius + 1.45, rootRadius * 0.45);
    const rOuter = rootRadius * 0.78;
    if (rOuter > rInner + 0.7) {
      const winCount = 6;
      const winStep = (Math.PI * 2) / winCount;
      for (let w = 0; w < winCount; w++) {
        const aStart = w * winStep - 0.31;
        const aEnd = w * winStep + 0.31;
        const winHole = new THREE.Path();
        winHole.moveTo(Math.cos(aStart) * rInner, Math.sin(aStart) * rInner);
        winHole.absarc(0, 0, rInner, aStart, aEnd, false);
        winHole.lineTo(Math.cos(aEnd) * rOuter, Math.sin(aEnd) * rOuter);
        winHole.absarc(0, 0, rOuter, aEnd, aStart, true);
        winHole.closePath();
        shape.holes.push(winHole);
      }
    }
  }

  return shape;
}

/**
 * Creates a procedural porous black sponge tire texture (with realistic closed-cell foam grain & silver/white carpet micro-fibers from photo 20261105_104735)
 */
function createSpongeTireTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1f2024';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 0.4 + Math.random() * 1.5;
      const shade = Math.floor(18 + Math.random() * 42);
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fine white/silver micro-fibers on outer sponge surface (clearly visible in macro photo 1)
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 0.85;
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const a = (Math.random() - 0.5) * 0.8;
      const len = 2.5 + Math.random() * 5.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Creates a procedural woven copper braid texture for the front pickup braids (Photos 2 & 4)
 */
function createCopperBraidTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 128; x += 8) {
        const even = ((x + y) / 8) % 2 === 0;
        ctx.strokeStyle = even ? '#f59e0b' : '#78350f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (even) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + 8, y + 8);
        } else {
          ctx.moveTo(x + 8, y);
          ctx.lineTo(x, y + 8);
        }
        ctx.stroke();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Creates the procedural "047" inspection sticker texture seen on the chassis wings & tongue
 */
function createSticker047Texture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(68, 0);
    ctx.lineTo(108, 64);
    ctx.lineTo(58, 64);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 125, 61);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('047', 64, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Creates the procedural green ESC PCB top & bottom textures matching macro photo 20261105_104832_96a4c8f9.jpg
 */
function createPcbTextures(maxAnisotropy: number): {
  topTex: THREE.CanvasTexture;
  bottomTex: THREE.CanvasTexture;
} {
  const topCanvas = document.createElement('canvas');
  topCanvas.width = 256;
  topCanvas.height = 320;
  const tctx = topCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = '#14532d';
    tctx.fillRect(0, 0, 256, 320);

    // Subtle internal copper planes
    tctx.fillStyle = '#166534';
    tctx.fillRect(10, 10, 236, 95);
    tctx.fillRect(10, 120, 236, 185);

    // Front-left & front-right large silver solder pads for yellow wires
    tctx.fillStyle = '#d4d4d8';
    tctx.beginPath();
    tctx.arc(24, 24, 15, 0, Math.PI * 2);
    tctx.arc(232, 24, 15, 0, Math.PI * 2);
    tctx.fill();

    // 3 round gold test pads on mid-left (seen in photo 3)
    tctx.fillStyle = '#eab308';
    [22, 46, 70].forEach((gx) => {
      tctx.beginPath();
      tctx.arc(gx, 118, 7.5, 0, Math.PI * 2);
      tctx.fill();
    });

    // Silkscreen labels Q1, Q5, Q2, Q6, Q3, Q7 & V2.7
    tctx.fillStyle = '#dcfce7';
    tctx.font = 'bold 14px monospace';
    tctx.fillText('V2.7', 82, 168);
    tctx.font = 'bold 11px monospace';
    tctx.fillText('Q5', 74, 224);
    tctx.fillText('Q1', 74, 272);
    tctx.fillText('Q6', 158, 224);
    tctx.fillText('Q2', 158, 272);
    tctx.fillText('Q7', 236, 224);
    tctx.fillText('Q3', 236, 272);

    // 3 rear silver solder pads for black motor phase wires
    tctx.fillStyle = '#e4e4e7';
    [42, 128, 212].forEach((px) => {
      tctx.fillRect(px - 14, 296, 28, 18);
    });
  }

  // Bottom texture: "LATVIAN SLOT PRODUCTION V2.7" silkscreen with triangle logo
  const botCanvas = document.createElement('canvas');
  botCanvas.width = 256;
  botCanvas.height = 256;
  const bctx = botCanvas.getContext('2d');
  if (bctx) {
    bctx.fillStyle = '#155e34';
    bctx.fillRect(0, 0, 256, 256);

    bctx.strokeStyle = '#f0fdf4';
    bctx.lineWidth = 4;
    bctx.beginPath();
    bctx.arc(128, 86, 46, 0, Math.PI * 2);
    bctx.stroke();

    bctx.beginPath();
    bctx.moveTo(128, 46);
    bctx.lineTo(96, 114);
    bctx.lineTo(124, 114);
    bctx.closePath();
    bctx.stroke();

    bctx.beginPath();
    bctx.moveTo(132, 46);
    bctx.lineTo(160, 114);
    bctx.lineTo(132, 114);
    bctx.closePath();
    bctx.stroke();

    bctx.fillStyle = '#f0fdf4';
    bctx.font = 'bold 21px sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('LATVIAN SLOT', 128, 174);
    bctx.fillText('PRODUCTION', 128, 204);
    bctx.font = 'bold 13px monospace';
    bctx.fillText('V2.7', 216, 44);
  }

  const topTex = new THREE.CanvasTexture(topCanvas);
  topTex.colorSpace = THREE.SRGBColorSpace;
  topTex.anisotropy = maxAnisotropy;

  const bottomTex = new THREE.CanvasTexture(botCanvas);
  bottomTex.colorSpace = THREE.SRGBColorSpace;
  bottomTex.anisotropy = maxAnisotropy;

  return { topTex, bottomTex };
}

/**
 * Helper to create a crisp 3D billboard text sprite for 3D dimension callouts
 */
function createMeasurementSprite(
  titleText: string,
  valueText: string,
  borderColorHex: string,
  bgHex = 'rgba(9, 13, 22, 0.92)'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 136;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rounded pill card with crisp border
    const r = 20;
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 124, r);
    ctx.fill();

    ctx.strokeStyle = borderColorHex;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 124, r);
    ctx.stroke();

    // Top title
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, 256, 44);

    // Bottom value
    ctx.fillStyle = borderColorHex;
    ctx.font = 'bold 34px monospace';
    ctx.fillText(valueText, 256, 92);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(16.5, 4.4, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/**
 * Helper to add a 3D dimension caliper line with end ticks and a billboard label
 */
function addDimensionCallout(
  parent: THREE.Group,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  tickDir: THREE.Vector3,
  tickLen: number,
  labelPos: THREE.Vector3,
  titleText: string,
  valueText: string,
  colorHex: number,
  cssColor: string
) {
  const lineMat = new THREE.LineBasicMaterial({
    color: colorHex,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });

  // Main dimension line between p1 and p2
  const mainGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mainLine = new THREE.Line(mainGeo, lineMat);
  mainLine.renderOrder = 990;
  parent.add(mainLine);

  // End ticks at p1 and p2
  const tVec = tickDir.clone().normalize().multiplyScalar(tickLen);
  const tick1Geo = new THREE.BufferGeometry().setFromPoints([
    p1.clone().sub(tVec),
    p1.clone().add(tVec),
  ]);
  const tick2Geo = new THREE.BufferGeometry().setFromPoints([
    p2.clone().sub(tVec),
    p2.clone().add(tVec),
  ]);
  const tick1 = new THREE.Line(tick1Geo, lineMat);
  const tick2 = new THREE.Line(tick2Geo, lineMat);
  tick1.renderOrder = 990;
  tick2.renderOrder = 990;
  parent.add(tick1, tick2);

  // Leader line from midpoint to labelPos
  const mid = p1.clone().add(p2).multiplyScalar(0.5);
  const leaderGeo = new THREE.BufferGeometry().setFromPoints([mid, labelPos]);
  const leaderMat = new THREE.LineDashedMaterial({
    color: colorHex,
    dashSize: 1.2,
    gapSize: 0.8,
    depthTest: false,
    transparent: true,
    opacity: 0.75,
  });
  const leaderLine = new THREE.Line(leaderGeo, leaderMat);
  leaderLine.computeLineDistances();
  leaderLine.renderOrder = 990;
  parent.add(leaderLine);

  // End spheres on measurement points
  const dotGeo = new THREE.SphereGeometry(0.45, 12, 12);
  const dotMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    depthTest: false,
  });
  const dot1 = new THREE.Mesh(dotGeo, dotMat);
  dot1.position.copy(p1);
  dot1.renderOrder = 995;
  const dot2 = new THREE.Mesh(dotGeo, dotMat);
  dot2.position.copy(p2);
  dot2.renderOrder = 995;
  parent.add(dot1, dot2);

  // Billboard sprite
  const sprite = createMeasurementSprite(titleText, valueText, cssColor);
  sprite.position.copy(labelPos);
  parent.add(sprite);
}

export const SlotCar3DVisualizer: React.FC<SlotCar3DVisualizerProps> = ({
  setup,
  metrics,
  lang,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [explodedAmount, setExplodedAmount] = useState<number>(0); // 0 to 1
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('iso');
  const [surfaceStyle, setSurfaceStyle] = useState<'blue-mat' | 'studio-dark'>('blue-mat');
  const [showChassis, setShowChassis] = useState<boolean>(true);
  const [showWiring, setShowWiring] = useState<boolean>(true);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [showPhotoDrawer, setShowPhotoDrawer] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ReferencePhoto>(REFERENCE_PHOTOS[0]);
  const [compareSplit, setCompareSplit] = useState<boolean>(false);

  // Mutable state ref for animation loop
  const stateRef = useRef({
    isPlaying: true,
    explodedTarget: 0,
    explodedCurrent: 0,
    speedRatio: metrics.speedRatio,
    pinionTeeth: setup.pinionTeeth,
    gearTeeth: setup.gearTeeth,
    activeCameraPreset: null as CameraPresetId | null,
    surfaceStyle: 'blue-mat' as 'blue-mat' | 'studio-dark',
    showChassis: true,
    showWiring: true,
    showMeasurements: true,
  });

  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    stateRef.current.explodedTarget = explodedAmount;
  }, [explodedAmount]);

  useEffect(() => {
    stateRef.current.speedRatio = metrics.speedRatio;
    stateRef.current.pinionTeeth = setup.pinionTeeth;
    stateRef.current.gearTeeth = setup.gearTeeth;
  }, [metrics.speedRatio, setup.pinionTeeth, setup.gearTeeth]);

  useEffect(() => {
    stateRef.current.showChassis = showChassis;
  }, [showChassis]);

  useEffect(() => {
    stateRef.current.showWiring = showWiring;
  }, [showWiring]);

  useEffect(() => {
    stateRef.current.showMeasurements = showMeasurements;
  }, [showMeasurements]);

  useEffect(() => {
    stateRef.current.surfaceStyle = surfaceStyle;
  }, [surfaceStyle]);

  // Derived physical dimensions (in mm, where 1 Three.js unit = 1 mm)
  const pitch: GearPitch = setup.pitch ?? 72;
  const moduleMm = 25.4 / pitch;
  const pinionOuterDiaMm = getPinionOuterDiameterMm(setup.pinionTeeth, pitch);
  const pinionPitchDiaMm = getPinionPitchDiameterMm(setup.pinionTeeth, pitch);
  const spurOuterDiaMm = getSpurOuterDiameterMm(setup.gearTeeth, pitch);
  const spurPitchDiaMm = setup.gearTeeth * moduleMm;
  const meshClearanceMm = setup.gearMeshClearanceMm ?? GEAR_MESH_CLEARANCE_MM;
  const centerDistanceMm = (pinionPitchDiaMm + spurPitchDiaMm) / 2 + meshClearanceMm;
  const axleDiaMm = (setup.axleSize ?? '3/32') === '3/32' ? (3 / 32) * 25.4 : 2.0;
  const pinionShaftDiaMm = setup.pinionShaftDiaMm ?? (pitch === 64 ? 2.0 : 1.5);
  const motorDiaMm = setup.motorDiameterMm ?? 14.0;
  const motorOffsetMm = setup.motorOffsetMm ?? 0.0;
  const tireDiaMm = setup.tireDiameterMm;
  const lockAxleHeight86 = setup.lockAxleHeight86 ?? true;
  const lockedChassisMm = setup.lockedChassisMm ?? 8.6;
  const axleHeightLockRef = setup.axleHeightLockRef ?? 'top';

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    drivetrainGroup: THREE.Group;
    chassisGroup: THREE.Group;
    electronicsGroup: THREE.Group;
    guideGroup: THREE.Group;
    measurementsGroup: THREE.Group;
    groundMesh: THREE.Mesh;
    gridHelper: THREE.GridHelper;
    pinionSpinGroup: THREE.Group | null;
    axleSpinGroup: THREE.Group | null;
    motorAssyGroup: THREE.Group | null;
    leftWheelGroup: THREE.Group | null;
    rightWheelGroup: THREE.Group | null;
    spurGearMesh: THREE.Group | null;
    maxAnisotropy: number;
    spongeTex: THREE.CanvasTexture;
    braidTex: THREE.CanvasTexture;
    stickerTex: THREE.CanvasTexture;
    pcbTopTex: THREE.CanvasTexture;
    pcbBotTex: THREE.CanvasTexture;
  } | null>(null);

  const triggerCameraPreset = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    stateRef.current.activeCameraPreset = preset;
  };

  // Initialize WebGLRenderer & static scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;

    const renderer = new THREE.WebGLRenderer({
      antialias: !IS_SOFTWARE_GL,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(IS_SOFTWARE_GL ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !IS_SOFTWARE_GL;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x172554);
    scene.fog = new THREE.FogExp2(0x172554, 0.002);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 900);
    camera.position.set(-64, 54, 78);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-4, 8, -8);
    controls.enableDamping = !IS_SOFTWARE_GL;
    controls.dampingFactor = 0.08;
    controls.minDistance = 14;
    controls.maxDistance = 320;
    controls.update();

    const onControlsStart = () => {
      stateRef.current.activeCameraPreset = null;
    };
    controls.addEventListener('start', onControlsStart);

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.92);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.25);
    keyLight.position.set(-45, 95, 65);
    keyLight.castShadow = !IS_SOFTWARE_GL;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 260;
    const d = 95;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.15);
    fillLight.position.set(70, 50, -40);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 1.3);
    rimLight.position.set(0, 35, -110);
    scene.add(rimLight);

    const bottomFillLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
    bottomFillLight.position.set(0, -65, 20);
    scene.add(bottomFillLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const spongeTex = createSpongeTireTexture(maxAnisotropy);
    const braidTex = createCopperBraidTexture(maxAnisotropy);
    const stickerTex = createSticker047Texture(maxAnisotropy);
    const { topTex: pcbTopTex, bottomTex: pcbBotTex } = createPcbTextures(maxAnisotropy);

    // Ground Plane at Y = 0
    const groundGeo = new THREE.PlaneGeometry(520, 520);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const gridHelper = new THREE.GridHelper(320, 32, 0x60a5fa, 0x3b82f6);
    gridHelper.position.y = 0.04;
    (gridHelper.material as THREE.Material).opacity = 0.22;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    const drivetrainGroup = new THREE.Group();
    const chassisGroup = new THREE.Group();
    const electronicsGroup = new THREE.Group();
    const guideGroup = new THREE.Group();
    const measurementsGroup = new THREE.Group();

    scene.add(drivetrainGroup);
    scene.add(chassisGroup);
    scene.add(electronicsGroup);
    scene.add(guideGroup);
    scene.add(measurementsGroup);

    sceneRefs.current = {
      scene,
      camera,
      controls,
      drivetrainGroup,
      chassisGroup,
      electronicsGroup,
      guideGroup,
      measurementsGroup,
      groundMesh,
      gridHelper,
      pinionSpinGroup: null,
      axleSpinGroup: null,
      motorAssyGroup: null,
      leftWheelGroup: null,
      rightWheelGroup: null,
      spurGearMesh: null,
      maxAnisotropy,
      spongeTex,
      braidTex,
      stickerTex,
      pcbTopTex,
      pcbBotTex,
    };

    if (!IS_SOFTWARE_GL) {
      renderer.compile(scene, camera);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const st = stateRef.current;
      const refs = sceneRefs.current;

      if (refs) {
        refs.chassisGroup.visible = st.showChassis;
        refs.electronicsGroup.visible = st.showWiring;
        refs.guideGroup.visible = st.showChassis;
        refs.measurementsGroup.visible = st.showMeasurements;

        const targetBgHex = st.surfaceStyle === 'blue-mat' ? 0x172554 : 0x090d16;
        const targetGroundHex = st.surfaceStyle === 'blue-mat' ? 0x1e3a8a : 0x0f172a;
        (refs.scene.background as THREE.Color).setHex(targetBgHex);
        if (refs.scene.fog instanceof THREE.FogExp2) {
          refs.scene.fog.color.setHex(targetBgHex);
        }
        (refs.groundMesh.material as THREE.MeshStandardMaterial).color.setHex(targetGroundHex);

        // Rotate pinion & rear axle/spur/tires in accurate gear ratio
        if (st.isPlaying && refs.pinionSpinGroup && refs.axleSpinGroup) {
          const pinionAngularVel = 4.2;
          refs.pinionSpinGroup.rotation.x += pinionAngularVel * delta;
          refs.axleSpinGroup.rotation.x -= pinionAngularVel * st.speedRatio * delta;
        }

        // Smooth exponential damping for Exploded View
        st.explodedCurrent = THREE.MathUtils.damp(
          st.explodedCurrent,
          st.explodedTarget,
          6,
          delta
        );
        const ex = st.explodedCurrent;

        if (refs.motorAssyGroup) {
          refs.motorAssyGroup.position.y = ex * 16;
          refs.motorAssyGroup.position.z = -ex * 12;
        }
        if (refs.leftWheelGroup) {
          refs.leftWheelGroup.position.x = -ex * 22;
        }
        if (refs.rightWheelGroup) {
          refs.rightWheelGroup.position.x = ex * 22;
        }
        if (refs.spurGearMesh) {
          refs.spurGearMesh.position.x = -ex * 9;
        }
        refs.electronicsGroup.position.y = ex * 24;
        refs.guideGroup.position.z = -ex * 20;
        refs.chassisGroup.position.y = -ex * 6;

        // Smooth camera preset transitions matching all 14 photos + clearance view
        if (st.activeCameraPreset) {
          switch (st.activeCameraPreset) {
            case 'iso':
              _targetCamPos.set(-64, 54, 78);
              _targetLookAt.set(-4, 8, -8);
              break;
            case 'stator':
              // Matches macro photos 20261105_100614_aa84a025.jpg & 20261105_100801_f8bf0e96.jpg focusing directly on the stator side (-X end) of the motor, exposed copper windings, front cable lug & pinion/spur mesh!
              _targetCamPos.set(-27, 21, 11);
              _targetLookAt.set(-10.5, 8.6, 21.5);
              break;
            case 'drivetrain':
              _targetCamPos.set(-34, 24, 34);
              _targetLookAt.set(-12, 9, 18);
              break;
            case 'rotor':
              // Matches macro photo (20261105_120336_690256fa.jpg) looking directly into the spoked outrunner rotor face & copper coils with lightened spur behind it!
              _targetCamPos.set(14, 15, 11);
              _targetLookAt.set(-6, 8.5, 21);
              break;
            case 'clearances':
              _targetCamPos.set(-54, 9, 20);
              _targetLookAt.set(-14, 5, 20);
              break;
            case 'wheel-bore':
              // Matches photo (20261105_104735_c645f64a.jpg) looking into outer wheel cup (verifying axle does not protrude)
              _targetCamPos.set(-60, 18, 16);
              _targetLookAt.set(-25, 8.5, 26);
              break;
            case 'wheel-inner':
              // Matches new macro photo (20261105_110728_b592d12f.jpg) of wheel inner edge, blue hub boss, steel axle & bearing upright
              _targetCamPos.set(-9, 23, 44);
              _targetLookAt.set(-19, 9.5, 28);
              break;
            case 'guide':
              // Matches photos (20261105_104754 & 20261105_104808) macro of front guide flag, copper braids & wire loops
              _targetCamPos.set(-34, 24, -84);
              _targetLookAt.set(0, 4, -56);
              break;
            case 'pcb':
              // Matches new photo (20261105_113204_5c4bf29c.jpg) top-down view of left-center Adv V2.7 PCB, chassis rails & wires
              _targetCamPos.set(-7, 68, -10);
              _targetLookAt.set(-7, 4, -14);
              break;
            case 'top':
              _targetCamPos.set(0, 145, 2);
              _targetLookAt.set(0, 6, -15);
              break;
            case 'bottom':
              _targetCamPos.set(0, -115, 2);
              _targetLookAt.set(0, 4, -15);
              refs.groundMesh.visible = false;
              refs.gridHelper.visible = false;
              break;
            case 'side':
              _targetCamPos.set(-92, 12, 8);
              _targetLookAt.set(0, 7, 8);
              break;
            case 'rear':
              _targetCamPos.set(0, 24, 78);
              _targetLookAt.set(0, 8, 20);
              break;
          }

          if (st.activeCameraPreset !== 'bottom') {
            refs.groundMesh.visible = true;
            refs.gridHelper.visible = true;
          }

          refs.camera.position.lerp(_targetCamPos, 1 - Math.exp(-6 * delta));
          refs.controls.target.lerp(_targetLookAt, 1 - Math.exp(-6 * delta));

          if (
            refs.camera.position.distanceTo(_targetCamPos) < 0.35 &&
            refs.controls.target.distanceTo(_targetLookAt) < 0.35
          ) {
            st.activeCameraPreset = null;
          }
        } else if (refs.camera.position.y > -2) {
          refs.groundMesh.visible = true;
          refs.gridHelper.visible = true;
        }

        refs.controls.update();
        renderer.render(refs.scene, refs.camera);
      }

      if (IS_SOFTWARE_GL) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      spongeTex.dispose();
      braidTex.dispose();
      stickerTex.dispose();
      pcbTopTex.dispose();
      pcbBotTex.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  // Rebuild parametric 3D chassis, drivetrain, refined details & 3D measurements whenever setup or lang changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    const clearGroup = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        child.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry?.dispose();
          }
          if ((obj as THREE.Sprite).isSprite) {
            const s = obj as THREE.Sprite;
            s.material?.map?.dispose();
            s.material?.dispose();
          }
        });
      }
    };

    clearGroup(refs.drivetrainGroup);
    clearGroup(refs.chassisGroup);
    clearGroup(refs.electronicsGroup);
    clearGroup(refs.guideGroup);
    clearGroup(refs.measurementsGroup);

    // Coordinate convention (1 unit = 1 mm):
    // X: Left (-) to Right (+). Total rear track width ~ 78 mm (-39 to +39)
    // Y: Vertical height above track surface (Y = 0 is road / pit-mat surface)
    // Z: Front (-) to Rear (+). Rear axle is at Z = +28 mm; Front guide flag is at Z = -64 mm.
    const rearAxleZ = 28;
    const axleCenterY = tireDiaMm / 2;
    const axleRadius = axleDiaMm / 2;
    const spurOuterRadius = spurOuterDiaMm / 2;
    const spurPitchRadius = spurPitchDiaMm / 2;
    const pinionOuterRadius = pinionOuterDiaMm / 2;
    const pinionPitchRadius = pinionPitchDiaMm / 2;
    const motorRadius = motorDiaMm / 2;
    const pinionShaftRadius = pinionShaftDiaMm / 2;

    // Chassis bottom plane Y coordinate matching 2D visualizer logic
    const refOffsetMm = axleHeightLockRef === 'top' ? axleRadius : 0;
    const chassisBottomFromCenterMm = lockAxleHeight86
      ? Math.max(0.1, lockedChassisMm - refOffsetMm)
      : spurOuterRadius;
    const chassisBottomY = Math.max(0.4, axleCenterY - chassisBottomFromCenterMm);
    const chassisPlateThickness = 1.0;
    const chassisMidY = chassisBottomY + chassisPlateThickness / 2;

    // Motor position: Sidewinder configuration ahead of rear axle (-Z from rear axle)
    const clampedOffsetMm = Math.min(centerDistanceMm * 0.95, Math.max(0, motorOffsetMm));
    const offsetAngleRad =
      centerDistanceMm > 0 ? Math.asin(Math.min(1, clampedOffsetMm / centerDistanceMm)) : 0;
    const motorCenterY = axleCenterY - clampedOffsetMm;
    const motorCenterZ = rearAxleZ - centerDistanceMm * Math.cos(offsetAngleRad);

    // Clearances in mm
    const chassisGroundClearanceMm = axleCenterY - chassisBottomFromCenterMm;
    const spurGroundClearanceMm = axleCenterY - spurOuterRadius;
    const motorGroundClearanceMm = motorCenterY - motorRadius;
    const motorToChassisClearanceMm = chassisBottomFromCenterMm - (clampedOffsetMm + motorRadius);

    // Shared Physical Materials
    const steelChassisMat = new THREE.MeshPhysicalMaterial({
      color: 0xd6d3cd,
      metalness: 0.88,
      roughness: 0.25,
      clearcoat: 0.15,
    });

    const brassSolderMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.9,
      roughness: 0.22,
    });

    const chromeAxleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.96,
      roughness: 0.1,
      clearcoat: 0.3,
    });

    const motorCanMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.93,
      roughness: 0.18,
      anisotropy: 0.8,
    });

    const copperWindingsMat = new THREE.MeshStandardMaterial({
      color: 0xc2591a,
      metalness: 0.86,
      roughness: 0.28,
    });

    const brassPinionMat = new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      metalness: 0.89,
      roughness: 0.2,
    });

    const spurGearMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      metalness: 0.78,
      roughness: 0.32,
    });

    const blueAnodizedMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 0.4,
    });

    const spongeTireMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: refs.spongeTex,
      bumpMap: refs.spongeTex,
      bumpScale: 0.38,
      roughness: 0.92,
      metalness: 0.05,
    });

    const wheelHubMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.65,
      roughness: 0.38,
    });

    const whiteInnerDiskMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Stepped white/silver inner hub disk seen in photo 20261105_104735
      metalness: 0.35,
      roughness: 0.3,
    });

    // =========================================================================
    // 1. DRIVETRAIN GROUP (Rear Axle, Spur Gear, Stepped Hollow Wheels, Motor & Pinion)
    // =========================================================================
    const axleSpinGroup = new THREE.Group();
    axleSpinGroup.position.set(0, axleCenterY, rearAxleZ);
    refs.drivetrainGroup.add(axleSpinGroup);
    refs.axleSpinGroup = axleSpinGroup;

    // Steel Rear Axle: length 50.0 mm (spans X = -25.0 to +25.0 mm).
    // Ends inside the wheel hub bosses so it NEVER protrudes out inside the hollow wheel cavities!
    const axleLengthMm = 50.0;
    const axleGeo = new THREE.CylinderGeometry(axleRadius, axleRadius, axleLengthMm, 32);
    axleGeo.rotateZ(Math.PI / 2);
    const axleMesh = new THREE.Mesh(axleGeo, chromeAxleMat);
    axleMesh.castShadow = true;
    axleSpinGroup.add(axleMesh);

    // Spur Gear Assembly on Left Side (X = -15.6 mm, outboard of the left bearing upright at X = -12.4 mm, matching Photos 20261105_100606 & 20261105_100358!)
    const spurX = -15.6;
    const spurThickness = 2.5;
    const spurGroup = new THREE.Group();
    axleSpinGroup.add(spurGroup);
    refs.spurGearMesh = spurGroup;

    const spurRootRadius = Math.max(axleRadius + 0.8, spurPitchRadius - 1.15 * moduleMm);
    const spurShape = createGearShape(
      setup.gearTeeth,
      spurPitchRadius,
      spurOuterRadius,
      spurRootRadius,
      axleRadius,
      true // 6 curved lightening cutouts in the spur gear web (Photo: 20261105_120336_690256fa.jpg)
    );
    const spurExtrudeGeo = new THREE.ExtrudeGeometry(spurShape, {
      depth: spurThickness,
      bevelEnabled: true,
      bevelThickness: 0.18,
      bevelSize: 0.12,
      bevelSegments: 2,
      curveSegments: 24,
    });
    spurExtrudeGeo.rotateY(Math.PI / 2);
    spurExtrudeGeo.translate(spurX - spurThickness / 2, 0, 0);
    const spurMesh = new THREE.Mesh(spurExtrudeGeo, spurGearMat);
    spurMesh.castShadow = true;
    spurMesh.receiveShadow = true;
    spurGroup.add(spurMesh);

    // Blue Anodized Spur / Left Wheel Hub Barrel between Spur Gear (X = -15.6) and Left Wheel (X = -20.8) (Photo: 20261105_100606!)
    const collarGeo = new THREE.CylinderGeometry(axleRadius + 1.55, axleRadius + 1.55, 4.4, 28);
    collarGeo.rotateZ(Math.PI / 2);
    collarGeo.translate(spurX - 3.1, 0, 0);
    const collarMesh = new THREE.Mesh(collarGeo, blueAnodizedMat);
    collarMesh.castShadow = true;
    spurGroup.add(collarMesh);

    // Stepped metallic inner spur hub boss on inboard (+X) face of spur gear (visible in Photo: 20261105_120336_690256fa.jpg!)
    const innerSpurBossGeo = new THREE.CylinderGeometry(
      axleRadius + 1.65,
      axleRadius + 1.95,
      1.6,
      28
    );
    innerSpurBossGeo.rotateZ(Math.PI / 2);
    innerSpurBossGeo.translate(spurX + spurThickness / 2 + 0.65, 0, 0);
    const innerSpurBossMesh = new THREE.Mesh(innerSpurBossGeo, steelChassisMat);
    spurGroup.add(innerSpurBossMesh);

    // Refined Hollow Sponge Tire, Rounded Inboard Shoulder, Blue Anodized Inboard Hub Boss & Closed Outer Cup
    // (Modeled after macro photos 20261105_110728_b592d12f.jpg & 20261105_104735_c645f64a.jpg)
    const createSpongeWheel = (centerX: number, isLeft: boolean): THREE.Group => {
      const wheelGroup = new THREE.Group();
      const tireWidth = 15.5;
      const halfW = tireWidth / 2;
      const outerR = tireDiaMm / 2;
      const innerRimR = Math.max(axleRadius + 2.4, outerR * 0.58);
      const inboardOpeningR = Math.max(axleRadius + 1.95, innerRimR * 0.74);

      const s = isLeft ? 1 : -1;
      const rawPts: [number, number][] = [
        [inboardOpeningR, -s * (halfW - 1.1)],
        [innerRimR * 0.9, -s * (halfW - 0.35)],
        [outerR - 1.35, -s * halfW],
        [outerR - 0.35, -s * (halfW - 0.55)],
        [outerR, -s * (halfW - 1.4)],
        [outerR, s * (halfW - 0.75)],
        [outerR - 0.55, s * halfW],
        [innerRimR, s * halfW],
        [innerRimR, -s * (halfW - 1.8)],
        [inboardOpeningR, -s * (halfW - 1.1)],
      ];
      const orderedPts = isLeft ? rawPts : [...rawPts].reverse();
      const lathePts = orderedPts.map(([r, y]) => new THREE.Vector2(r, y));

      const tireLatheGeo = new THREE.LatheGeometry(lathePts, 44);
      tireLatheGeo.rotateZ(Math.PI / 2);
      tireLatheGeo.translate(centerX, 0, 0);
      const tireMesh = new THREE.Mesh(tireLatheGeo, spongeTireMat);
      tireMesh.castShadow = true;
      tireMesh.receiveShadow = true;
      wheelGroup.add(tireMesh);

      // Dark cylindrical rim sleeve lining the inside of the sponge tire
      const sleeveGeo = new THREE.CylinderGeometry(
        innerRimR * 0.99,
        innerRimR * 0.96,
        tireWidth * 0.84,
        32,
        1,
        true
      );
      sleeveGeo.rotateZ(Math.PI / 2);
      sleeveGeo.translate(centerX + (isLeft ? -0.4 : 0.4), 0, 0);
      const sleeveMesh = new THREE.Mesh(
        sleeveGeo,
        new THREE.MeshStandardMaterial({
          color: 0x111827,
          roughness: 0.5,
          metalness: 0.4,
          side: THREE.DoubleSide,
        })
      );
      wheelGroup.add(sleeveMesh);

      // Inboard Recessed Dark Rim Lip visible around the blue anodized hub boss (Photo: 20261105_110728)
      const inboardLipOffset = isLeft ? halfW - 1.2 : -(halfW - 1.2);
      const inboardLipGeo = new THREE.CylinderGeometry(
        innerRimR * 0.86,
        innerRimR * 0.82,
        1.1,
        32
      );
      inboardLipGeo.rotateZ(Math.PI / 2);
      inboardLipGeo.translate(centerX + inboardLipOffset, 0, 0);
      const inboardLipMesh = new THREE.Mesh(inboardLipGeo, wheelHubMat);
      wheelGroup.add(inboardLipMesh);

      // Metallic Blue Anodized Wheel Hub Boss / Collar on Inboard Side of Wheel (Photo: 20261105_110728_b592d12f.jpg!)
      const blueFlangeOffset = isLeft ? halfW - 0.55 : -(halfW - 0.55);
      const blueFlangeGeo = new THREE.CylinderGeometry(
        axleRadius + 1.85,
        axleRadius + 1.65,
        1.8,
        28
      );
      blueFlangeGeo.rotateZ(Math.PI / 2);
      blueFlangeGeo.translate(centerX + blueFlangeOffset, 0, 0);
      const blueFlangeMesh = new THREE.Mesh(blueFlangeGeo, blueAnodizedMat);
      blueFlangeMesh.castShadow = true;
      wheelGroup.add(blueFlangeMesh);

      // Chamfered blue anodized hub neck protruding slightly inboard around the steel axle
      const blueNeckOffset = isLeft ? halfW + 0.45 : -(halfW + 0.45);
      const blueNeckGeo = new THREE.CylinderGeometry(
        isLeft ? axleRadius + 1.15 : axleRadius + 1.48,
        isLeft ? axleRadius + 1.48 : axleRadius + 1.15,
        1.4,
        28
      );
      blueNeckGeo.rotateZ(Math.PI / 2);
      blueNeckGeo.translate(centerX + blueNeckOffset, 0, 0);
      const blueNeckMesh = new THREE.Mesh(blueNeckGeo, blueAnodizedMat);
      blueNeckMesh.castShadow = true;
      wheelGroup.add(blueNeckMesh);

      // Stepped white/silver inner hub disk deep inside the outboard wheel cavity (Photo: 20261105_104735)
      // Positioned at |X| ~ 26.2 mm so the hollow outer cup (|X| = 26.5..36.25 mm) has NO protruding axle!
      const diskOffset = isLeft ? 2.4 : -2.4;
      const diskGeo = new THREE.CylinderGeometry(
        innerRimR * 0.9,
        innerRimR * 0.9,
        1.8,
        32
      );
      diskGeo.rotateZ(Math.PI / 2);
      diskGeo.translate(centerX + diskOffset, 0, 0);
      const diskMesh = new THREE.Mesh(diskGeo, whiteInnerDiskMat);
      wheelGroup.add(diskMesh);

      // Closed dark inner hub cap inside the white disk (caps the bore so axle never pokes out inside the wheel!)
      const innerCapGeo = new THREE.CylinderGeometry(
        axleRadius + 1.15,
        axleRadius + 1.15,
        2.4,
        24
      );
      innerCapGeo.rotateZ(Math.PI / 2);
      innerCapGeo.translate(centerX + (isLeft ? 2.1 : -2.1), 0, 0);
      const innerCapMesh = new THREE.Mesh(innerCapGeo, wheelHubMat);
      wheelGroup.add(innerCapMesh);

      return wheelGroup;
    };

    const leftWheelGroup = createSpongeWheel(-28.5, true);
    const rightWheelGroup = createSpongeWheel(28.5, false);
    axleSpinGroup.add(leftWheelGroup);
    axleSpinGroup.add(rightWheelGroup);
    refs.leftWheelGroup = leftWheelGroup;
    refs.rightWheelGroup = rightWheelGroup;

    // =========================================================================
    // 1B. OUTRUNNER BRUSHLESS MOTOR: STATIONARY COPPER STATOR & ROTATING SPOKED ROTOR BELL
    // (Modeled directly from macro photo 20261105_120336_690256fa.jpg!)
    // =========================================================================
    const motorAssyGroup = new THREE.Group();
    refs.drivetrainGroup.add(motorAssyGroup);
    refs.motorAssyGroup = motorAssyGroup;

    const motorStaticGroup = new THREE.Group();
    motorStaticGroup.position.set(0, motorCenterY, motorCenterZ);
    motorAssyGroup.add(motorStaticGroup);

    const motorCanLength = 12.2;
    const motorCenterX = -4.6;
    const leftEndX = motorCenterX - motorCanLength / 2; // -10.7 mm
    const rightEndX = motorCenterX + motorCanLength / 2; // +1.5 mm

    // Warm, rich copper magnet-wire material with subtle inner self-illumination so coils gleam inside the rotor cage
    const brightCopperStrandMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      emissive: 0x3b1504,
      emissiveIntensity: 0.45,
      metalness: 0.88,
      roughness: 0.2,
      clearcoat: 0.35,
    });

    // Dark-chrome machined rotor face & beveled rim material (matching Photo: 20261105_120336_690256fa.jpg)
    const rotorDarkChromeMat = new THREE.MeshPhysicalMaterial({
      color: 0x3f3f46,
      metalness: 0.94,
      roughness: 0.14,
      clearcoat: 0.4,
    });

    // 1. Stationary Open-Window CNC Aluminum Stator Mount & Bearing Holder on the Left (-X) Side
    // (Modeled directly from macro photos 20261105_100614_aa84a025.jpg, 20261105_100801_f8bf0e96.jpg & 20261105_104735_c645f64a.jpg!)
    // Instead of a closed cylinder blocking the left side, the stator side (X = -11.3 to -8.1 mm) has an open CNC bracket
    // with large top/upper-rear/lower windows that leave the copper stator coils wide open and exposed next to the rotor edge!

    // 1A. Central Stationary Stator Bearing Tube & Stepped Nose Boss around the Motor Shaft (X = -11.45 to -7.8 mm)
    const statorBearingBossGeo = new THREE.CylinderGeometry(
      pinionShaftRadius + 1.48,
      pinionShaftRadius + 1.58,
      3.65,
      28
    );
    statorBearingBossGeo.rotateZ(Math.PI / 2);
    statorBearingBossGeo.translate(leftEndX + 1.05, 0, 0);
    const statorBearingBossMesh = new THREE.Mesh(statorBearingBossGeo, motorCanMat);
    statorBearingBossMesh.castShadow = true;
    motorStaticGroup.add(statorBearingBossMesh);

    // Recessed dark shaft bearing seal on the left end of the stator boss (X = -11.48 mm, facing the brass pinion)
    const leftBearingSealGeo = new THREE.CylinderGeometry(
      pinionShaftRadius + 1.05,
      pinionShaftRadius + 1.05,
      0.35,
      24
    );
    leftBearingSealGeo.rotateZ(Math.PI / 2);
    leftBearingSealGeo.translate(leftEndX - 0.68, 0, 0);
    const leftBearingSealMesh = new THREE.Mesh(leftBearingSealGeo, wheelHubMat);
    motorStaticGroup.add(leftBearingSealMesh);

    // 1B. Open-Spoked Left Stator End-Plate (`statorBracketShape`, X = -10.85 to -9.65 mm)
    // Features 3 wide peripheral cutout windows (top window, upper-rear window, and lower window) so copper coils gleam right through!
    const statorOuterR = motorRadius * 0.96;
    const statorHubR = pinionShaftRadius + 1.52;
    const statorBracketShape = new THREE.Shape();
    statorBracketShape.absarc(0, 0, statorOuterR, 0, Math.PI * 2, false);

    const statorBorePath = new THREE.Path();
    statorBorePath.absarc(0, 0, pinionShaftRadius + 0.2, 0, Math.PI * 2, true);
    statorBracketShape.holes.push(statorBorePath);

    // Cut out 3 large open stator windows (in local 2D shape before rotateY(Math.PI/2): +X maps to -Z front, +Y maps to +Y top)
    // Arms remain at:
    // - Front-upper cable lug arm (~ -0.35 rad)
    // - Rear-lower upright mounting arm (~ +2.65 rad)
    // - Lower-front support web (~ -2.15 rad)
    const statorWindowAngles: [number, number][] = [
      [0.12, 2.25], // Wide open TOP & UPPER-REAR window exposing the copper stator coils (Photos: 100614 & 100801!)
      [2.95, 3.88], // Rear-bottom window (visible in Photo: 104735!)
      [4.35, 5.82], // Front-bottom window
    ];
    const sWinInnerR = statorHubR + 0.15;
    const sWinOuterR = motorRadius * 0.98;
    statorWindowAngles.forEach(([a0, a1]) => {
      const wPath = new THREE.Path();
      wPath.moveTo(Math.cos(a0) * sWinInnerR, Math.sin(a0) * sWinInnerR);
      wPath.absarc(0, 0, sWinInnerR, a0, a1, false);
      wPath.lineTo(Math.cos(a1) * sWinOuterR, Math.sin(a1) * sWinOuterR);
      wPath.absarc(0, 0, sWinOuterR, a1, a0, true);
      wPath.closePath();
      statorBracketShape.holes.push(wPath);
    });

    const statorBracketDepth = 1.05;
    const statorBracketGeo = new THREE.ExtrudeGeometry(statorBracketShape, {
      depth: statorBracketDepth,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.08,
      bevelSegments: 2,
      curveSegments: 28,
    });
    statorBracketGeo.rotateY(Math.PI / 2);
    statorBracketGeo.translate(leftEndX - 0.15, 0, 0);
    const statorBracketMesh = new THREE.Mesh(statorBracketGeo, motorCanMat);
    statorBracketMesh.castShadow = true;
    motorStaticGroup.add(statorBracketMesh);

    // 1C. Faceted Front-Left CNC Aluminum Cable Entry & Mounting Lug with Top Drilled Hole!
    // (Clearly visible on the front-left of the stator side in Photos: 20261105_100614_aa84a025.jpg & 20261105_100801_f8bf0e96.jpg!)
    const frontLugGeo = new THREE.BoxGeometry(2.65, 2.5, 3.3);
    const frontLugMesh = new THREE.Mesh(frontLugGeo, motorCanMat);
    frontLugMesh.position.set(leftEndX + 1.05, 1.35, -motorRadius * 0.64);
    frontLugMesh.castShadow = true;
    motorStaticGroup.add(frontLugMesh);

    // Chamfered lower-front skirt under the front stator cable lug
    const frontLugSkirtGeo = new THREE.BoxGeometry(2.35, 2.2, 2.6);
    const frontLugSkirtMesh = new THREE.Mesh(frontLugSkirtGeo, motorCanMat);
    frontLugSkirtMesh.position.set(leftEndX + 0.95, -0.45, -motorRadius * 0.66);
    frontLugSkirtMesh.rotation.x = 0.28;
    motorStaticGroup.add(frontLugSkirtMesh);

    // Small vertical countersunk/drilled hole on the flat top surface of the front-left aluminum stator lug (Photo: 20261105_100614!)
    const lugTopHoleGeo = new THREE.CylinderGeometry(0.48, 0.42, 0.45, 16);
    lugTopHoleGeo.translate(leftEndX + 0.95, 2.48, -motorRadius * 0.66);
    const lugTopHoleMesh = new THREE.Mesh(lugTopHoleGeo, wheelHubMat);
    motorStaticGroup.add(lugTopHoleMesh);

    const lugTopBevelGeo = new THREE.RingGeometry(0.45, 0.68, 18);
    lugTopBevelGeo.rotateX(-Math.PI / 2);
    lugTopBevelGeo.translate(leftEndX + 0.95, 2.61, -motorRadius * 0.66);
    const lugTopBevelMesh = new THREE.Mesh(lugTopBevelGeo, rotorDarkChromeMat);
    motorStaticGroup.add(lugTopBevelMesh);

    // 1D. Rear-Left Stepped Aluminum Stator Mounting Ear / Bridge connecting to the Left Bearing Upright (`ux = -12.4 mm`)
    // (Visible between the stator windings and the left upright in Photos: 20261105_100614, 20261105_100801 & 20261105_104735!)
    const rearMountEarGeo = new THREE.BoxGeometry(2.85, 2.9, 3.1);
    const rearMountEarMesh = new THREE.Mesh(rearMountEarGeo, motorCanMat);
    rearMountEarMesh.position.set(leftEndX + 0.45, -0.35, motorRadius * 0.54);
    rearMountEarMesh.castShadow = true;
    motorStaticGroup.add(rearMountEarMesh);

    // Upper-rear curved aluminum stator lip (bridges from bearing boss toward top-rear edge of stator core, Photo: 20261105_100801)
    const rearUpperLipGeo = new THREE.BoxGeometry(1.45, 1.8, 2.4);
    const rearUpperLipMesh = new THREE.Mesh(rearUpperLipGeo, motorCanMat);
    rearUpperLipMesh.position.set(leftEndX + 0.35, 1.55, motorRadius * 0.48);
    rearUpperLipMesh.rotation.x = -0.35;
    motorStaticGroup.add(rearUpperLipMesh);

    // 2. Stationary Internal Stator Iron Core & 9 Multi-Strand Copper Windings (X = -10.35 to +0.95 mm)
    // Extended all the way to the left stator window (X = -10.35 mm) so the copper coils and stator teeth are fully visible on BOTH the stator side and rotor side!
    const statorCoreHubGeo = new THREE.CylinderGeometry(
      motorRadius * 0.36,
      motorRadius * 0.36,
      motorCanLength - 1.5,
      24
    );
    statorCoreHubGeo.rotateZ(Math.PI / 2);
    statorCoreHubGeo.translate(motorCenterX + 0.15, 0, 0);
    const statorCoreHubMesh = new THREE.Mesh(statorCoreHubGeo, wheelHubMat);
    motorStaticGroup.add(statorCoreHubMesh);

    // Dark insulated stator lamination ring visible in the air-gap just to the left of the silver rotor drum edge (X = -8.15 mm)
    const statorGapRingGeo = new THREE.CylinderGeometry(
      motorRadius * 0.87,
      motorRadius * 0.87,
      1.6,
      36,
      1,
      true
    );
    statorGapRingGeo.rotateZ(Math.PI / 2);
    statorGapRingGeo.translate(leftEndX + 1.95, 0, 0);
    const statorGapRingMesh = new THREE.Mesh(statorGapRingGeo, wheelHubMat);
    motorStaticGroup.add(statorGapRingMesh);

    // 9 Stator Poles with individual multi-turn copper magnet wire strands visible through BOTH the left stator cutout windows AND the right rotor windows!
    const numStatorPoles = 9;
    const poleLength = motorCanLength - 1.95; // ~10.25 mm (spans X = -9.95 to +0.30 mm)
    const coilRadialDist = motorRadius * 0.64;

    for (let p = 0; p < numStatorPoles; p++) {
      const pa = (p * Math.PI * 2) / numStatorPoles + 0.18;
      const py = Math.cos(pa) * coilRadialDist;
      const pz = Math.sin(pa) * coilRadialDist;

      // Laminated dark grey stator iron tooth T-core (visible between copper coils on the stator side in Photo: 20261105_100801!)
      const toothCoreGeo = new THREE.BoxGeometry(poleLength - 0.3, 1.42, motorRadius * 0.46);
      const toothCoreMesh = new THREE.Mesh(toothCoreGeo, wheelHubMat);
      toothCoreMesh.position.set(motorCenterX + 0.12, py * 0.88, pz * 0.88);
      toothCoreMesh.rotation.x = -pa;
      motorStaticGroup.add(toothCoreMesh);

      // Outer stator pole shoe (curved T-tip lamination at the outer radius of each stator tooth)
      const toothShoeGeo = new THREE.BoxGeometry(poleLength - 0.5, 2.35, 0.42);
      const toothShoeMesh = new THREE.Mesh(toothShoeGeo, wheelHubMat);
      toothShoeMesh.position.set(motorCenterX + 0.12, py * 1.24, pz * 1.24);
      toothShoeMesh.rotation.x = -pa + Math.PI / 2;
      motorStaticGroup.add(toothShoeMesh);

      // Multi-strand copper wire turns stacked along the stator pole (from X = -9.9 to +0.25 mm)
      const strandCount = 9;
      for (let sIdx = 0; sIdx < strandCount; sIdx++) {
        const sx =
          leftEndX + 0.85 + (sIdx / (strandCount - 1)) * (poleLength * 0.94);
        const strandGeo = new THREE.TorusGeometry(1.22, 0.44, 10, 18);
        strandGeo.scale(0.88, 1.28, 1.04);
        const strandMesh = new THREE.Mesh(strandGeo, brightCopperStrandMat);
        strandMesh.position.set(sx, py, pz);
        strandMesh.rotation.y = Math.PI / 2;
        strandMesh.rotation.x = -pa + (sIdx % 2 === 0 ? 0.08 : -0.08);
        motorStaticGroup.add(strandMesh);
      }

      // Prominent copper end-turn wire bundle on the LEFT (-X) STATOR SIDE (at X = leftEndX + 0.85 to +2.45 mm)
      // Directly exposed in the open top/side stator cutout windows in Photos: 20261105_100614, 20261105_100801 & 20261105_104735!
      for (let t = -1; t <= 1; t++) {
        const leftEndTurnGeo = new THREE.CylinderGeometry(0.48, 0.48, 2.45, 12);
        const leftEndTurnMesh = new THREE.Mesh(leftEndTurnGeo, brightCopperStrandMat);
        const rOff = coilRadialDist + t * 0.56;
        leftEndTurnMesh.position.set(
          leftEndX + 1.35 + Math.abs(t) * 0.22,
          Math.cos(pa) * rOff,
          Math.sin(pa) * rOff
        );
        leftEndTurnMesh.rotation.x = -pa + Math.PI / 2;
        leftEndTurnMesh.rotation.z = -t * 0.18;
        motorStaticGroup.add(leftEndTurnMesh);
      }

      // Arched copper crossover / phase-ring wire loops on the open left stator side (giving the thick braided copper coil look in Photo: 20261105_100614!)
      const crossoverArcGeo = new THREE.TorusGeometry(
        coilRadialDist * 0.98,
        0.38,
        10,
        24,
        (Math.PI * 1.55) / numStatorPoles
      );
      crossoverArcGeo.rotateY(Math.PI / 2);
      crossoverArcGeo.rotateX(-pa);
      crossoverArcGeo.translate(leftEndX + 1.55 + (p % 2) * 0.32, 0, 0);
      const crossoverArcMesh = new THREE.Mesh(crossoverArcGeo, brightCopperStrandMat);
      motorStaticGroup.add(crossoverArcMesh);

      // Prominent copper end-turn wire bundle right behind the spoked RIGHT (+X) rotor windows (at X = rightEndX - 1.15 mm, Photo: 20261105_120336!)
      for (let t = -1; t <= 1; t++) {
        const endTurnGeo = new THREE.CylinderGeometry(0.46, 0.46, 2.35, 12);
        const endTurnMesh = new THREE.Mesh(endTurnGeo, brightCopperStrandMat);
        const rOff = coilRadialDist + t * 0.55;
        endTurnMesh.position.set(
          rightEndX - 1.15 - Math.abs(t) * 0.18,
          Math.cos(pa) * rOff,
          Math.sin(pa) * rOff
        );
        endTurnMesh.rotation.x = -pa + Math.PI / 2;
        endTurnMesh.rotation.z = t * 0.16;
        motorStaticGroup.add(endTurnMesh);
      }
    }

    // 3. Rotating Outrunner Rotor Bell, Spoked Right End-Face, Rotor Shaft & Brass Pinion (`pinionSpinGroup`)
    const pinionSpinGroup = new THREE.Group();
    pinionSpinGroup.position.set(0, motorCenterY, motorCenterZ);
    pinionSpinGroup.rotation.x = Math.PI / Math.max(5, setup.pinionTeeth);
    motorAssyGroup.add(pinionSpinGroup);
    refs.pinionSpinGroup = pinionSpinGroup;

    // 3A. Hollow Open-Ended Outrunner Rotor Drum Shell (X = -8.05 to +1.35 mm)
    // Leaves X = -10.85 to -8.05 mm open on the left so the exposed stator copper windings & CNC stator mount are clearly visible!
    const wallThick = 0.65;
    const drumLength = motorCanLength - 2.8; // 9.4 mm (from X = -8.05 to +1.35 mm)
    const drumCenterX = motorCenterX + 1.25; // -3.35 mm

    // Outer silver band of the rotating rotor drum
    const silverBandLength = drumLength - 2.2;
    const outerDrumGeo = new THREE.CylinderGeometry(
      motorRadius,
      motorRadius,
      silverBandLength,
      40,
      1,
      true
    );
    outerDrumGeo.rotateZ(Math.PI / 2);
    outerDrumGeo.translate(drumCenterX - 1.1, 0, 0);
    const outerDrumMesh = new THREE.Mesh(outerDrumGeo, motorCanMat);
    outerDrumMesh.castShadow = true;
    outerDrumMesh.receiveShadow = true;
    pinionSpinGroup.add(outerDrumMesh);

    // Clean machined vertical left lip of the spinning silver outrunner rotor bell at X = -8.05 mm (Photos: 100614 & 100801!)
    const leftRotorLipGeo = new THREE.RingGeometry(motorRadius - wallThick, motorRadius, 40);
    leftRotorLipGeo.rotateY(-Math.PI / 2);
    leftRotorLipGeo.translate(drumCenterX - 1.1 - silverBandLength / 2, 0, 0);
    const leftRotorLipMesh = new THREE.Mesh(leftRotorLipGeo, motorCanMat);
    pinionSpinGroup.add(leftRotorLipMesh);

    // Beveled dark-chrome right rotor shoulder & outer rim (X = -0.8 to +1.45 mm, matching Photo: 20261105_120336_690256fa.jpg!)
    // In LatheGeometry before rotateZ(Math.PI/2), local +Y maps to world -X, so local -Y is world +X (right side).
    const rimInnerR = motorRadius - wallThick;
    const rotorRimLathePts = [
      new THREE.Vector2(rimInnerR, 2.2),
      new THREE.Vector2(motorRadius, 2.2),
      new THREE.Vector2(motorRadius, 0.55),
      new THREE.Vector2(motorRadius * 0.94, 0.0),
      new THREE.Vector2(motorRadius * 0.85, 0.0),
      new THREE.Vector2(rimInnerR, 0.45),
      new THREE.Vector2(rimInnerR, 2.2),
    ];
    const rotorRimGeo = new THREE.LatheGeometry(rotorRimLathePts, 44);
    rotorRimGeo.rotateZ(Math.PI / 2);
    rotorRimGeo.translate(rightEndX, 0, 0);
    const rotorRimMesh = new THREE.Mesh(rotorRimGeo, rotorDarkChromeMat);
    rotorRimMesh.castShadow = true;
    pinionSpinGroup.add(rotorRimMesh);

    // Dark inner magnetic liner inside the hollow rotor drum
    const magnetLinerGeo = new THREE.CylinderGeometry(
      rimInnerR,
      rimInnerR,
      drumLength - 0.6,
      36,
      1,
      true
    );
    magnetLinerGeo.rotateZ(Math.PI / 2);
    magnetLinerGeo.translate(drumCenterX - 0.2, 0, 0);
    const magnetLinerMesh = new THREE.Mesh(
      magnetLinerGeo,
      new THREE.MeshStandardMaterial({
        color: 0x18181b,
        metalness: 0.7,
        roughness: 0.35,
        side: THREE.BackSide,
      })
    );
    pinionSpinGroup.add(magnetLinerMesh);

    // 3B. Machined 4-Twin-Spoke (8-Spoke) Right Rotor End-Face with 4 Large Curved Windows & 4 Narrow Radial Slots!
    // (Modeled directly after macro photo 20261105_120336_690256fa.jpg!)
    const rotorDiscRadius = motorRadius * 0.92;
    const rotorFaceShape = new THREE.Shape();
    rotorFaceShape.absarc(0, 0, rotorDiscRadius, 0, Math.PI * 2, false);

    // Central shaft bore hole
    const shaftHole = new THREE.Path();
    shaftHole.absarc(0, 0, pinionShaftRadius * 0.98, 0, Math.PI * 2, true);
    rotorFaceShape.holes.push(shaftHole);

    // 4 Large Curved Sector Ventilation Windows (at 45°, 135°, 225°, 315° — wide open so copper windings shine through!)
    const winInnerR = Math.max(pinionShaftRadius + 1.25, motorRadius * 0.34);
    const winOuterR = motorRadius * 0.81;
    for (let w = 0; w < 4; w++) {
      const centerAngle = w * (Math.PI / 2) + Math.PI / 4;
      const a0 = centerAngle - 0.44;
      const a1 = centerAngle + 0.44;
      const winPath = new THREE.Path();
      winPath.moveTo(Math.cos(a0) * winInnerR, Math.sin(a0) * winInnerR);
      winPath.absarc(0, 0, winInnerR, a0, a1, false);
      winPath.lineTo(Math.cos(a1) * winOuterR, Math.sin(a1) * winOuterR);
      winPath.absarc(0, 0, winOuterR, a1, a0, true);
      winPath.closePath();
      rotorFaceShape.holes.push(winPath);
    }

    // 4 Narrow Radial Slots between the paired twin spokes (at 0°, 90°, 180°, 270°, matching Photo: 20261105_120336_690256fa.jpg!)
    const slotInnerR = Math.max(pinionShaftRadius + 1.35, motorRadius * 0.36);
    const slotOuterR = motorRadius * 0.84;
    for (let sl = 0; sl < 4; sl++) {
      const centerAngle = sl * (Math.PI / 2);
      const s0 = centerAngle - 0.095;
      const s1 = centerAngle + 0.095;
      const slotPath = new THREE.Path();
      slotPath.moveTo(Math.cos(s0) * slotInnerR, Math.sin(s0) * slotInnerR);
      slotPath.absarc(0, 0, slotInnerR, s0, s1, false);
      slotPath.lineTo(Math.cos(s1) * slotOuterR, Math.sin(s1) * slotOuterR);
      slotPath.absarc(0, 0, slotOuterR, s1, s0, true);
      slotPath.closePath();
      rotorFaceShape.holes.push(slotPath);
    }

    const rotorFaceDepth = 0.55;
    const rotorFaceGeo = new THREE.ExtrudeGeometry(rotorFaceShape, {
      depth: rotorFaceDepth,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.08,
      bevelSegments: 2,
      curveSegments: 28,
    });
    rotorFaceGeo.rotateY(Math.PI / 2);
    rotorFaceGeo.translate(rightEndX - rotorFaceDepth - 0.05, 0, 0);
    const rotorFaceMesh = new THREE.Mesh(rotorFaceGeo, rotorDarkChromeMat);
    pinionSpinGroup.add(rotorFaceMesh);

    // Central raised rotor hub collar around the protruding shaft on the right rotor face (Photo: 20261105_120336)
    const rotorHubCollarGeo = new THREE.CylinderGeometry(
      pinionShaftRadius + 0.85,
      pinionShaftRadius + 1.25,
      0.55,
      24
    );
    rotorHubCollarGeo.rotateZ(Math.PI / 2);
    rotorHubCollarGeo.translate(rightEndX + 0.12, 0, 0);
    const rotorHubCollarMesh = new THREE.Mesh(rotorHubCollarGeo, rotorDarkChromeMat);
    pinionSpinGroup.add(rotorHubCollarMesh);

    // 3C. Polished Steel Motor Shaft (spans from X = -17.4 through pinion to X = +3.5 protruding stub on right rotor face!)
    const motorShaftGeo = new THREE.CylinderGeometry(
      pinionShaftRadius,
      pinionShaftRadius,
      20.9,
      24
    );
    motorShaftGeo.rotateZ(Math.PI / 2);
    motorShaftGeo.translate(-6.95, 0, 0);
    const motorShaftMesh = new THREE.Mesh(motorShaftGeo, chromeAxleMat);
    pinionSpinGroup.add(motorShaftMesh);

    // Beveled shiny tip on the right protruding rotor shaft stub (visible in center of Photo: 20261105_120336_690256fa.jpg!)
    const shaftTipGeo = new THREE.CylinderGeometry(
      pinionShaftRadius * 0.68,
      pinionShaftRadius,
      0.35,
      24
    );
    shaftTipGeo.rotateZ(Math.PI / 2);
    shaftTipGeo.translate(3.65, 0, 0);
    const shaftTipMesh = new THREE.Mesh(shaftTipGeo, chromeAxleMat);
    pinionSpinGroup.add(shaftTipMesh);

    // 3D. Brass Pinion Gear (meshing with Spur at X = -15.6 mm)
    const pinionWidth = 3.5;
    const pinionRootRadius = Math.max(
      pinionShaftRadius + 0.22,
      pinionPitchRadius - 1.1 * moduleMm
    );
    const pinionShape = createGearShape(
      setup.pinionTeeth,
      pinionPitchRadius,
      pinionOuterRadius,
      pinionRootRadius,
      pinionShaftRadius
    );
    const pinionExtrudeGeo = new THREE.ExtrudeGeometry(pinionShape, {
      depth: pinionWidth,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.08,
      bevelSegments: 2,
      curveSegments: 20,
    });
    pinionExtrudeGeo.rotateY(Math.PI / 2);
    pinionExtrudeGeo.translate(spurX - pinionWidth / 2, 0, 0);
    const pinionMesh = new THREE.Mesh(pinionExtrudeGeo, brassPinionMat);
    pinionMesh.castShadow = true;
    pinionSpinGroup.add(pinionMesh);

    // =========================================================================
    // 2. REFINED LASER-CUT STEEL CHASSIS GROUP (Matching Photos: 100358, 100528, 100606, 113204, 110728)
    // =========================================================================
    let beamLayerIndex = 0;
    const addChassisBeam = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      widthMm: number,
      mat: THREE.Material = steelChassisMat,
      yOffset = 0,
      heightMm = chassisPlateThickness
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      if (length < 0.1) return;
      // Subtle micro-step prevents coplanar Z-fighting at all angled beam joints
      const microStep = yOffset === 0 ? (beamLayerIndex++ % 13) * 0.0022 : 0;
      const geo = new THREE.BoxGeometry(widthMm, heightMm - microStep, length);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((x1 + x2) / 2, chassisMidY + yOffset, (z1 + z2) / 2);
      mesh.rotation.y = Math.atan2(dx, dz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      refs.chassisGroup.add(mesh);
    };

    // Left Rear Bearing Upright at X = -12.4 mm (between Spur Gear at -15.6 and Motor at -10.7)
    // Right Rear Bearing Upright at X = +14.8 mm (inboard of right wheel's exposed steel axle & blue hub boss, Photo: 20261105_110728 & 20261105_100606!)
    const uprightXPositions = [-12.4, 14.8];
    uprightXPositions.forEach((ux, idx) => {
      // Base rail under upright extending forward to rear wishbone junction
      addChassisBeam(ux, rearAxleZ + 1.8, ux, rearAxleZ - 9.8, 2.4);

      // Angled upright carrier plate with lightening hole (supporting the soldered barrel bearing)
      const uprightShape = new THREE.Shape();
      const uTop = Math.max(4.6, axleCenterY - chassisBottomY + 2.6);
      uprightShape.moveTo(-4.6, 0.2);
      uprightShape.lineTo(3.4, 0.2);
      uprightShape.lineTo(2.4, uTop);
      uprightShape.lineTo(-3.2, uTop);
      uprightShape.closePath();

      const lightHole = new THREE.Path();
      lightHole.absarc(-2.1, uTop * 0.6, 0.9, 0, Math.PI * 2, true);
      uprightShape.holes.push(lightHole);

      const uprightGeo = new THREE.ExtrudeGeometry(uprightShape, {
        depth: 2.0,
        bevelEnabled: false,
      });
      uprightGeo.rotateY(Math.PI / 2);
      uprightGeo.translate(ux - 1.0, chassisBottomY, rearAxleZ);
      const uprightMesh = new THREE.Mesh(uprightGeo, steelChassisMat);
      uprightMesh.castShadow = true;
      refs.chassisGroup.add(uprightMesh);

      // Soldered Barrel-Shaped Metal Axle Bearing & Solder Fillet (Photo: 20261105_110728_b592d12f.jpg!)
      const bearingBarrelGeo = new THREE.CylinderGeometry(
        axleRadius + 1.95,
        axleRadius + 1.95,
        3.4,
        28
      );
      bearingBarrelGeo.rotateZ(Math.PI / 2);
      bearingBarrelGeo.translate(ux, axleCenterY, rearAxleZ);
      const bearingBarrelMesh = new THREE.Mesh(bearingBarrelGeo, steelChassisMat);
      bearingBarrelMesh.castShadow = true;
      refs.chassisGroup.add(bearingBarrelMesh);

      const solderFilletGeo = new THREE.CylinderGeometry(
        axleRadius + 2.1,
        axleRadius + 2.1,
        1.7,
        24
      );
      solderFilletGeo.rotateZ(Math.PI / 2);
      solderFilletGeo.translate(ux, axleCenterY - 0.15, rearAxleZ);
      const solderFilletMesh = new THREE.Mesh(solderFilletGeo, brassSolderMat);
      refs.chassisGroup.add(solderFilletMesh);

      const innerRaceGeo = new THREE.CylinderGeometry(
        axleRadius + 0.65,
        axleRadius + 0.65,
        3.7,
        24
      );
      innerRaceGeo.rotateZ(Math.PI / 2);
      innerRaceGeo.translate(ux, axleCenterY, rearAxleZ);
      const innerRaceMesh = new THREE.Mesh(innerRaceGeo, wheelHubMat);
      refs.chassisGroup.add(innerRaceMesh);

      // Silver Button-Head Hex Screw securing motor on left upright (Photo: 20261105_104735)
      if (idx === 0) {
        const screwHeadGeo = new THREE.CylinderGeometry(1.65, 1.65, 1.3, 16);
        screwHeadGeo.rotateZ(Math.PI / 2);
        screwHeadGeo.translate(ux - 1.2, axleCenterY - 2.4, rearAxleZ - 2.2);
        const screwMesh = new THREE.Mesh(screwHeadGeo, chromeAxleMat);
        refs.chassisGroup.add(screwMesh);
      }
    });

    // Rear Axle Carrier Crossbar running behind the motor can between left (-12.4) and right (+14.8) uprights (Photos: 100606 & 100731!)
    addChassisBeam(-12.4, rearAxleZ - 2.2, 14.8, rearAxleZ - 2.2, 2.4);
    // Longitudinal motor-bay strut along right side of motor can (X = +2.2, Z = 6.5 to rearAxleZ - 2.2, Photos: 100606 & 100731!)
    addChassisBeam(2.2, 6.5, 2.2, rearAxleZ - 2.2, 2.0);

    // Rear Motor Bay V-Wishbone & Diagonal Struts behind the ESC PCB (Photos: 100358, 100528, 100606, 113204)
    // Inner V-wishbone arms from rear of center spine (Z = 6.5) to rear bearing uprights
    addChassisBeam(-1.2, 6.5, -12.4, rearAxleZ - 9.8, 2.6);
    addChassisBeam(1.8, 6.5, 14.8, rearAxleZ - 9.8, 2.6);
    // Outer diagonal struts from rear of center spine (Z = 6.2) to inner rail / wing hinge junction (X = ±14.4, Z = 13.5)
    addChassisBeam(-1.2, 6.2, -14.4, 13.5, 2.0);
    addChassisBeam(1.8, 6.2, 14.4, 13.5, 2.0);

    // Central Split Spine & Two Inner Longitudinal Rails (Photos: 100358, 100528, 113204!)
    // 1. Left inner rail (straight narrow beam from front bridge Z = -52.5 to rear wing hinge Z = +15.2; supports LEFT edge of ESC PCB)
    addChassisBeam(-10.8, -52.5, -14.4, 15.2, 2.0);
    // 2. Central spine: solid beam from V-tongue (Z = -32) to mid-chassis (Z = -14), then splits into V-fork (Z = -14 to +6.5; supports RIGHT edge of ESC PCB)
    addChassisBeam(0.0, -32.0, 0.0, -14.0, 3.6);
    addChassisBeam(-0.7, -14.0, -1.2, 6.5, 1.8);
    addChassisBeam(0.7, -14.0, 1.6, 6.5, 1.8);
    // 3. Right inner rail (symmetrical to left inner rail from front bridge Z = -52.5 to rear wing hinge Z = +15.2)
    addChassisBeam(10.8, -52.5, 14.4, 15.2, 2.0);

    // Stainless Torsion Bar Wire running along the Center Spine Rail just along the right edge of the ESC PCB (Photo: 20261105_113204!)
    const rodGeo = new THREE.CylinderGeometry(0.45, 0.45, 43, 12);
    rodGeo.rotateX(Math.PI / 2);
    rodGeo.translate(1.45, chassisMidY + 1.05, -12.0);
    const rodMesh = new THREE.Mesh(rodGeo, chromeAxleMat);
    refs.chassisGroup.add(rodMesh);

    // Soldered rear torsion wire collar / bracket at (X = 1.45, Z = 8.2) (visible below bottom-right of PCB in Photo: 20261105_113204)
    const rodCollarGeo = new THREE.CylinderGeometry(1.1, 1.1, 2.8, 14);
    rodCollarGeo.rotateX(Math.PI / 2);
    rodCollarGeo.translate(1.45, chassisMidY + 1.05, 8.2);
    const rodCollarMesh = new THREE.Mesh(rodCollarGeo, brassSolderMat);
    refs.chassisGroup.add(rodCollarMesh);

    // Slotted Heart / V-Shield Front Tongue & Guide Post Mount (Photos: 100358, 100528, 113204)
    // Outer V-shield wings flaring from (0, -31.5) out to (±9.2, -49.5) and curving in to (±3.8, -51.5)
    addChassisBeam(-1.4, -31.5, -9.2, -49.5, 3.0);
    addChassisBeam(1.4, -31.5, 9.2, -49.5, 3.0);
    addChassisBeam(-9.2, -49.5, -3.6, -51.2, 2.6);
    addChassisBeam(9.2, -49.5, 3.6, -51.2, 2.6);
    // Inner V-shield ribs (leaving the laser-cut chevron flex slot visible between outer and inner wings)
    addChassisBeam(-1.0, -35.5, -5.8, -47.5, 2.2);
    addChassisBeam(1.0, -35.5, 5.8, -47.5, 2.2);
    // Central tongue extending forward to the guide post mount (Z = -31.5 to Z = -58.5)
    addChassisBeam(0, -31.5, 0, -58.5, 4.6);
    // Pointed side-stop ears under the guide post nut (Z = -55.8)
    addChassisBeam(-4.8, -55.8, 4.8, -55.8, 2.2);
    // Transverse front bridge arms (Z = -52.5) extending out to outer rails (leaving open side bays behind them!)
    addChassisBeam(-5.2, -52.8, -27.0, -52.5, 2.5);
    addChassisBeam(5.2, -52.8, 27.0, -52.5, 2.5);

    // Two Soldered Metal Wire-Retainer Loops on the Center of the Front V-Tongue (next to "047" sticker, Photo: 20261105_113204)
    [-1.25, 1.25].forEach((rx) => {
      const ringGeo = new THREE.TorusGeometry(1.35, 0.4, 12, 24);
      ringGeo.translate(rx, chassisBottomY + chassisPlateThickness + 1.15, -45.5);
      const ringMesh = new THREE.Mesh(ringGeo, chromeAxleMat);
      ringMesh.castShadow = true;
      refs.chassisGroup.add(ringMesh);
    });

    // Outer Articulated Side Rails, Front Inward L-Hooks, Inward Brass Pin Tubes & Rear Wing Pans at Z = +3.8..+19.2 (Photos: 100358, 100528, 100606!)
    [-1, 1].forEach((side) => {
      const sx = side * 27.0;
      // Main outer longitudinal rail (clean narrow strip from Z = -59.5 to Z = +19.2; open bay between it and inner rail!)
      addChassisBeam(sx, -59.5, sx, 19.2, 2.4);
      // Inward L-hook tip at the very front corner (Z = -59.5)
      addChassisBeam(sx, -59.5, side * 23.2, -59.8, 2.2);

      // Rear Wing / Side Pan Assembly located at the REAR (Z = +3.8 to Z = +19.2, directly ahead of the rear wheels!)
      // 1. Forward-pointing angled wing strut from outer rail (|X| = 26.0, Z = +3.8) to inner wing hinge (|X| = 17.0, Z = +10.8)
      addChassisBeam(side * 26.0, 3.8, side * 17.0, 10.8, 3.0);
      // 2. Diagonal wing plate body ( leaving the laser-cut slot visible, matching Photos 100358 & 100528)
      addChassisBeam(side * 24.4, 6.6, side * 19.2, 13.2, 3.6);
      // 3. Inner wing hinge finger parallel to inner rail (|X| = 16.6, Z = +9.6 to +16.2)
      addChassisBeam(side * 16.6, 9.6, side * 16.6, 16.2, 2.0);
      // 4. Main rear wing pan plate behind the hinge bridge (Z = +11.4 to Z = +19.2, spanning |X| = 17.4 to 26.6, carrying the 047 sticker!)
      addChassisBeam(side * 22.0, 11.4, side * 22.0, 19.2, 9.2);

      // Soldered Brass Body-Mount Pin Tubes pointing INWARD from the outer rail (Z = -43.5 & Z = +14.5, Photos: 100358 & 113204!)
      const pinPositionsZ = [-43.5, 14.5];
      pinPositionsZ.forEach((pz) => {
        // Slotted mounting plate along the rail for the pin assembly
        addChassisBeam(
          side * 25.8,
          pz - 4.0,
          side * 25.8,
          pz + 3.2,
          2.2,
          steelChassisMat,
          0.35,
          0.7
        );

        // Brass pin tube protruding inward toward the center of the chassis (from |X| = 26.5 to |X| = 21.0)
        const pinTubeGeo = new THREE.CylinderGeometry(0.95, 0.95, 5.6, 18);
        pinTubeGeo.rotateZ(Math.PI / 2);
        pinTubeGeo.translate(side * 23.8, chassisMidY + 1.0, pz);
        const pinTubeMesh = new THREE.Mesh(pinTubeGeo, brassSolderMat);
        pinTubeMesh.castShadow = true;
        refs.chassisGroup.add(pinTubeMesh);

        // Inner hollow bore of brass pin tube
        const pinHoleGeo = new THREE.CylinderGeometry(0.55, 0.55, 5.8, 12);
        pinHoleGeo.rotateZ(Math.PI / 2);
        pinHoleGeo.translate(side * 23.8, chassisMidY + 1.0, pz);
        const pinHoleMesh = new THREE.Mesh(pinHoleGeo, wheelHubMat);
        refs.chassisGroup.add(pinHoleMesh);

        // Soldered retainer strap over brass tube on the outer rail
        addChassisBeam(
          side * 26.2,
          pz - 2.2,
          side * 26.2,
          pz + 2.2,
          1.8,
          steelChassisMat,
          1.25,
          0.65
        );
      });

      // Transverse Hinge Bridge Bar connecting inner rail (|X| = 14.4) to outer wing pan (|X| = 25.8) at Z = 11.2 (Photos: 100358 & 113204)
      addChassisBeam(
        side * 14.4,
        11.2,
        side * 25.8,
        11.2,
        1.7,
        brassSolderMat,
        0.85,
        0.85
      );

      // "047" Inspection Sticker on Left & Right Rear Wing Pans (near rear edge Z = 17.4, Photos: 100358, 100606, 113204)
      const stickerGeo = new THREE.PlaneGeometry(6.4, 3.2);
      const stickerMat = new THREE.MeshBasicMaterial({
        map: refs.stickerTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const stickerMesh = new THREE.Mesh(stickerGeo, stickerMat);
      stickerMesh.rotation.x = -Math.PI / 2;
      stickerMesh.rotation.z = side === -1 ? Math.PI - 0.08 : 0.08;
      stickerMesh.position.set(side * 21.4, chassisBottomY + chassisPlateThickness + 0.06, 17.4);
      refs.chassisGroup.add(stickerMesh);
    });

    // Third "047" Inspection Sticker on Left Wing of Front V-Tongue right next to the wire retainer loops (Photo: 20261105_113204!)
    const frontStickerGeo = new THREE.PlaneGeometry(6.0, 3.0);
    const frontStickerMat = new THREE.MeshBasicMaterial({
      map: refs.stickerTex,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const frontStickerMesh = new THREE.Mesh(frontStickerGeo, frontStickerMat);
    frontStickerMesh.rotation.x = -Math.PI / 2;
    frontStickerMesh.rotation.z = -1.1;
    frontStickerMesh.position.set(-4.5, chassisBottomY + chassisPlateThickness + 0.06, -46.2);
    refs.chassisGroup.add(frontStickerMesh);

    // =========================================================================
    // 3. GREEN ESC PCB ("Adv V2.7") ON LEFT-CENTER RAILS & REALISTIC WIRING (Photo: 20261105_113204_5c4bf29c.jpg!)
    // =========================================================================
    // Mounted between the Left Inner Rail (X ≈ -13.2 mm) and the Center Spine Rail (X ≈ +0.8 mm),
    // with the stainless torsion bar wire running along its right edge (X = +1.45 mm)!
    const pcbWidth = 14.8;
    const pcbLength = 20.5;
    const pcbThickness = 1.35;
    const pcbX = -6.2;
    const pcbZ = -12.5;
    const pcbY = chassisBottomY + chassisPlateThickness + pcbThickness / 2 + 0.35;

    const pcbEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.5,
    });
    const pcbTopMat = new THREE.MeshStandardMaterial({
      map: refs.pcbTopTex,
      roughness: 0.36,
      metalness: 0.25,
    });
    const pcbBotMat = new THREE.MeshStandardMaterial({
      map: refs.pcbBotTex,
      roughness: 0.42,
      metalness: 0.2,
    });

    const pcbGeo = new THREE.BoxGeometry(pcbWidth, pcbThickness, pcbLength);
    const pcbMesh = new THREE.Mesh(pcbGeo, [
      pcbEdgeMat,
      pcbEdgeMat,
      pcbTopMat,
      pcbBotMat,
      pcbEdgeMat,
      pcbEdgeMat,
    ]);
    pcbMesh.position.set(pcbX, pcbY, pcbZ);
    pcbMesh.castShadow = true;
    refs.electronicsGroup.add(pcbMesh);

    // 3D SMD Components on top of Adv V2.7 PCB (matching Photo: 20261105_113204_5c4bf29c.jpg):
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.32,
      metalness: 0.3,
    });
    // 6 MOSFETs in 3 columns × 2 rows at the rear half of the PCB (Q1/Q5, Q2/Q6, Q3/Q7)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const chipGeo = new THREE.BoxGeometry(3.1, 0.85, 2.8);
        const chipMesh = new THREE.Mesh(chipGeo, chipMat);
        chipMesh.position.set(
          pcbX - 4.6 + c * 4.6,
          pcbY + pcbThickness / 2 + 0.42,
          pcbZ + 3.2 + r * 3.6
        );
        refs.electronicsGroup.add(chipMesh);
      }
    }

    // Center Microcontroller IC with White "Adv" Sticker on Top
    const mcuGeo = new THREE.BoxGeometry(3.2, 0.9, 3.2);
    const mcuMesh = new THREE.Mesh(mcuGeo, chipMat);
    mcuMesh.position.set(pcbX + 0.1, pcbY + pcbThickness / 2 + 0.45, pcbZ - 1.8);
    refs.electronicsGroup.add(mcuMesh);

    const advLabelGeo = new THREE.PlaneGeometry(2.6, 2.4);
    const advLabelMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const advLabelMesh = new THREE.Mesh(advLabelGeo, advLabelMat);
    advLabelMesh.rotation.x = -Math.PI / 2;
    advLabelMesh.position.set(pcbX + 0.1, pcbY + pcbThickness / 2 + 0.92, pcbZ - 1.8);
    refs.electronicsGroup.add(advLabelMesh);

    // Front-left square QFN IC (C8051)
    const qfnGeo = new THREE.BoxGeometry(3.0, 0.75, 3.0);
    const qfnMesh = new THREE.Mesh(qfnGeo, chipMat);
    qfnMesh.position.set(pcbX - 5.0, pcbY + pcbThickness / 2 + 0.38, pcbZ - 5.8);
    refs.electronicsGroup.add(qfnMesh);

    // Vertical stack of 4 tan/brown SMD ceramic capacitors on front-right edge of PCB (Photo: 20261105_113204)
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.4,
      metalness: 0.15,
    });
    for (let i = 0; i < 4; i++) {
      const capGeo = new THREE.BoxGeometry(2.7, 0.95, 1.35);
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.set(
        pcbX + 4.7,
        pcbY + pcbThickness / 2 + 0.48,
        pcbZ - 6.2 + i * 1.75
      );
      refs.electronicsGroup.add(capMesh);
    }

    // Solder blobs at front-left (X = -12.0) & front-right (X = -0.4) yellow wire pads AND 3 rear black wire pads
    [-5.8, 5.8].forEach((sx) => {
      const blobGeo = new THREE.SphereGeometry(1.05, 14, 14);
      blobGeo.scale(1, 0.65, 1.2);
      const blobMesh = new THREE.Mesh(blobGeo, chromeAxleMat);
      blobMesh.position.set(pcbX + sx, pcbY + pcbThickness / 2 + 0.4, pcbZ - pcbLength / 2 + 1.1);
      refs.electronicsGroup.add(blobMesh);
    });
    [-4.6, 0.0, 4.6].forEach((bx) => {
      const rearBlobGeo = new THREE.SphereGeometry(0.95, 12, 12);
      rearBlobGeo.scale(1, 0.65, 1.2);
      const rearBlobMesh = new THREE.Mesh(rearBlobGeo, chromeAxleMat);
      rearBlobMesh.position.set(pcbX + bx, pcbY + pcbThickness / 2 + 0.38, pcbZ + pcbLength / 2 - 0.9);
      refs.electronicsGroup.add(rearBlobMesh);
    });

    // Two Yellow Silicone Lead Wires routed from Left-Center PCB to the two Center Tongue Retainer Rings (Photo: 20261105_113204!)
    // - Left yellow wire runs diagonally from front-left PCB pad (X = -12.0) to left retainer ring (X = -1.25) then loops left
    // - Right yellow wire runs almost straight forward along the center spine from front-right PCB pad (X = -0.4) to right retainer ring (X = +1.25) then loops right
    const yellowWireMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.32,
      metalness: 0.05,
    });

    const guideZ = -61.5;
    const leftYellowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(pcbX - 5.8, pcbY + 0.9, pcbZ - pcbLength / 2 + 1.1),
      new THREE.Vector3(-6.4, pcbY + 1.0, -34.0),
      new THREE.Vector3(-1.25, chassisBottomY + chassisPlateThickness + 1.2, -45.5), // Through left retainer ring next to 047 sticker
      new THREE.Vector3(-11.2, chassisMidY + 5.2, -52.5), // Wide loop left
      new THREE.Vector3(-8.8, chassisMidY + 4.6, -61.0),
      new THREE.Vector3(-3.3, chassisBottomY + 3.6, guideZ - 2.5), // Into left crimp ferrule on guide flag
    ]);
    const rightYellowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(pcbX + 5.8, pcbY + 0.9, pcbZ - pcbLength / 2 + 1.1),
      new THREE.Vector3(0.4, pcbY + 1.0, -34.0), // Straight along center spine rail
      new THREE.Vector3(1.25, chassisBottomY + chassisPlateThickness + 1.2, -45.5), // Through right retainer ring
      new THREE.Vector3(11.8, chassisMidY + 5.2, -52.5), // Wide loop right
      new THREE.Vector3(8.8, chassisMidY + 4.6, -61.0),
      new THREE.Vector3(3.3, chassisBottomY + 3.6, guideZ - 2.5), // Into right crimp ferrule on guide flag
    ]);

    [leftYellowCurve, rightYellowCurve].forEach((curve) => {
      const wireGeo = new THREE.TubeGeometry(curve, 48, 0.92, 12, false);
      const wireMesh = new THREE.Mesh(wireGeo, yellowWireMat);
      wireMesh.castShadow = true;
      refs.electronicsGroup.add(wireMesh);
    });

    // Three Black Motor Phase Wires with Service Loop Coils & Black Heat-Shrink Bundle to Motor (Photo: 20261105_113204!)
    const blackWireMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.45,
      metalness: 0.1,
    });
    const phaseCurves = [
      // Left pad (Q1): wide curl out to X = -18.5 then back to heat-shrink bundle on the stator front lug
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(pcbX - 4.6, pcbY + 0.7, pcbZ + pcbLength / 2 - 0.8),
        new THREE.Vector3(-12.5, pcbY + 4.2, 2.0),
        new THREE.Vector3(-18.2, pcbY + 3.5, 8.5),
        new THREE.Vector3(-13.2, pcbY + 3.8, 12.2),
        new THREE.Vector3(leftEndX + 1.1, motorCenterY + 1.35, motorCenterZ - motorRadius * 0.62),
      ]),
      // Middle pad (Q2): S-loop over rear-left of PCB into stator front lug bundle
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(pcbX + 0.0, pcbY + 0.7, pcbZ + pcbLength / 2 - 0.8),
        new THREE.Vector3(-5.2, pcbY + 3.6, 4.5),
        new THREE.Vector3(-11.5, pcbY + 4.8, 6.2),
        new THREE.Vector3(-11.4, pcbY + 3.6, 11.8),
        new THREE.Vector3(leftEndX + 1.25, motorCenterY + 1.45, motorCenterZ - motorRadius * 0.58),
      ]),
      // Right pad (Q3): U-loop down to Z = +5 then up and into stator front lug bundle
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(pcbX + 4.6, pcbY + 0.7, pcbZ + pcbLength / 2 - 0.8),
        new THREE.Vector3(-0.8, pcbY + 2.6, 4.8),
        new THREE.Vector3(-6.8, pcbY + 4.2, 3.2),
        new THREE.Vector3(-10.8, pcbY + 3.5, 11.4),
        new THREE.Vector3(leftEndX + 1.4, motorCenterY + 1.25, motorCenterZ - motorRadius * 0.54),
      ]),
    ];
    phaseCurves.forEach((phaseCurve) => {
      const phaseGeo = new THREE.TubeGeometry(phaseCurve, 40, 0.78, 10, false);
      const phaseMesh = new THREE.Mesh(phaseGeo, blackWireMat);
      phaseMesh.castShadow = true;
      refs.electronicsGroup.add(phaseMesh);
    });

    // Black Heat-Shrink Sleeve bundling the 3 phase wires directly into the front-left stator lug (Photos: 20261105_100614, 20261105_100801 & 20261105_113204!)
    const sleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-11.6, pcbY + 3.6, 11.4),
      new THREE.Vector3(-10.6, motorCenterY + 2.1, motorCenterZ - motorRadius * 0.92),
      new THREE.Vector3(leftEndX + 1.15, motorCenterY + 1.35, motorCenterZ - motorRadius * 0.58),
    ]);
    const heatShrinkGeo = new THREE.TubeGeometry(sleeveCurve, 20, 1.52, 12, false);
    const heatShrinkMesh = new THREE.Mesh(heatShrinkGeo, blackWireMat);
    heatShrinkMesh.castShadow = true;
    refs.electronicsGroup.add(heatShrinkMesh);

    // 3 Copper Phase Lead Strands emerging from the black heat-shrink sleeve into the exposed stator windings (Photo: 20261105_100614 & 100801!)
    [-0.45, 0.0, 0.45].forEach((offsetY, idx) => {
      const copperLeadCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(
          leftEndX + 1.2 + idx * 0.18,
          motorCenterY + 1.35 + offsetY,
          motorCenterZ - motorRadius * 0.55
        ),
        new THREE.Vector3(
          leftEndX + 1.45 + idx * 0.22,
          motorCenterY + 1.85 + offsetY * 0.8,
          motorCenterZ - motorRadius * 0.25 + idx * 0.65
        ),
      ]);
      const copperLeadGeo = new THREE.TubeGeometry(copperLeadCurve, 12, 0.36, 8, false);
      const copperLeadMesh = new THREE.Mesh(copperLeadGeo, brightCopperStrandMat);
      refs.electronicsGroup.add(copperLeadMesh);
    });

    // =========================================================================
    // 4. REFINED FRONT GUIDE FLAG, FOLDED COPPER CLIPS, CRIMP FERRULES & HEX NUT (Photos 2 & 4)
    // =========================================================================
    const nylonMat = new THREE.MeshPhysicalMaterial({
      color: 0xe7e5e4, // Milky translucent nylon/Teflon guide flag (Photo 2: 20261105_104754)
      roughness: 0.32,
      metalness: 0.04,
      transmission: IS_SOFTWARE_GL ? 0 : 0.32,
      thickness: 2.0,
      clearcoat: 0.25,
    });

    // Molded Angled Guide Shoe Body
    const shoeGeo = new THREE.BoxGeometry(12.8, 2.4, 17.5);
    const shoeMesh = new THREE.Mesh(shoeGeo, nylonMat);
    shoeMesh.position.set(0, chassisBottomY + 1.6, guideZ);
    shoeMesh.castShadow = true;
    refs.guideGroup.add(shoeMesh);

    // Deep Slot Guide Blade underneath shoe (angled leading edge as seen in Photo 2: 20261105_104754)
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-9.5, 0);
    bladeShape.lineTo(8.5, 0);
    bladeShape.lineTo(6.8, -5.8);
    bladeShape.lineTo(-7.8, -5.2);
    bladeShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 1.55,
      bevelEnabled: true,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    });
    bladeGeo.rotateY(Math.PI / 2);
    bladeGeo.translate(-0.77, chassisBottomY + 0.8, guideZ);
    const bladeMesh = new THREE.Mesh(bladeGeo, nylonMat);
    refs.guideGroup.add(bladeMesh);

    // Threaded Guide Post & 6-Sided Hexagonal Locknut on Top of Chassis Tongue (Photo 2 & Photo 4)
    const hexNutGeo = new THREE.CylinderGeometry(3.8, 3.8, 2.2, 6);
    const hexNutMesh = new THREE.Mesh(hexNutGeo, chromeAxleMat);
    hexNutMesh.position.set(0, chassisBottomY + 3.4, guideZ + 4.8);
    hexNutMesh.castShadow = true;
    refs.guideGroup.add(hexNutMesh);

    const studTopGeo = new THREE.CylinderGeometry(2.1, 2.1, 3.2, 18);
    const studTopMesh = new THREE.Mesh(studTopGeo, wheelHubMat);
    studTopMesh.position.set(0, chassisBottomY + 3.9, guideZ + 4.8);
    refs.guideGroup.add(studTopMesh);

    // Woven Copper Pickup Braids, Folded Copper Nose Clips & Silver Crimp Ferrules (Photo 2 & Photo 4)
    const braidMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: refs.braidTex,
      bumpMap: refs.braidTex,
      bumpScale: 0.28,
      metalness: 0.82,
      roughness: 0.36,
    });
    const copperClipMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.22,
    });

    [-3.3, 3.3].forEach((bx) => {
      // Thick woven copper braid underneath guide shoe & protruding slightly at front nose
      const braidGeo = new THREE.BoxGeometry(3.8, 1.35, 14.5);
      const braidMesh = new THREE.Mesh(braidGeo, braidMat);
      braidMesh.position.set(bx, chassisBottomY + 0.25, guideZ - 2.2);
      refs.guideGroup.add(braidMesh);

      // Folded flat copper contact clip wrapping around front nose of guide flag (Photo 2 & Photo 4)
      const clipTopGeo = new THREE.BoxGeometry(3.6, 0.5, 5.2);
      const clipTopMesh = new THREE.Mesh(clipTopGeo, copperClipMat);
      clipTopMesh.position.set(bx, chassisBottomY + 2.95, guideZ - 6.2);
      refs.guideGroup.add(clipTopMesh);

      // Silver Crimp Ferrule / Solder Barrel holding yellow wire on top of guide shoe (Photo 2)
      const ferruleGeo = new THREE.CylinderGeometry(1.1, 1.1, 4.4, 16);
      ferruleGeo.rotateX(Math.PI / 2);
      ferruleGeo.translate(bx, chassisBottomY + 3.4, guideZ - 3.6);
      const ferruleMesh = new THREE.Mesh(ferruleGeo, chromeAxleMat);
      ferruleMesh.castShadow = true;
      refs.guideGroup.add(ferruleMesh);
    });

    // =========================================================================
    // 5. 3D MEASUREMENTS & CLEARANCE CALLOUTS GROUP (Toggled via "Mitat & Maavara 3D")
    // =========================================================================
    const isFi = lang === 'fi';

    // 5A. Pinion Outer Diameter & Pitch Diameter Callout (Gold/Amber)
    const pinionMeasureX = spurX - 3.2;
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(pinionMeasureX, motorCenterY - pinionOuterRadius, motorCenterZ),
      new THREE.Vector3(pinionMeasureX, motorCenterY + pinionOuterRadius, motorCenterZ),
      new THREE.Vector3(0, 0, 1),
      1.6,
      new THREE.Vector3(pinionMeasureX - 10, motorCenterY + pinionOuterRadius + 8, motorCenterZ - 6),
      isFi ? `PINJONI (${setup.pinionTeeth}T · ${pitch}P)` : `PINION (${setup.pinionTeeth}T · ${pitch}P)`,
      `OD Ø ${pinionOuterDiaMm.toFixed(2)} mm`,
      0xf59e0b,
      '#fbbf24'
    );

    // 5B. Spur Gear Outer Diameter Callout (Sky Blue)
    const spurMeasureX = spurX - 1.5;
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(spurMeasureX, axleCenterY - spurOuterRadius, rearAxleZ),
      new THREE.Vector3(spurMeasureX, axleCenterY + spurOuterRadius, rearAxleZ),
      new THREE.Vector3(0, 0, 1),
      2.2,
      new THREE.Vector3(spurMeasureX - 8, axleCenterY + spurOuterRadius + 9, rearAxleZ + 4),
      isFi ? `PÄÄRATAS (${setup.gearTeeth}T · ${pitch}P)` : `SPUR GEAR (${setup.gearTeeth}T · ${pitch}P)`,
      `OD Ø ${spurOuterDiaMm.toFixed(2)} mm`,
      0x38bdf8,
      '#38bdf8'
    );

    // 5C. Center Distance (Akseliväli C) & Gear Mesh Clearance Callout (Purple/Indigo)
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(spurX - 4.2, motorCenterY, motorCenterZ),
      new THREE.Vector3(spurX - 4.2, axleCenterY, rearAxleZ),
      new THREE.Vector3(0, 1, 0),
      1.8,
      new THREE.Vector3(spurX - 18, (motorCenterY + axleCenterY) / 2 + 12, (motorCenterZ + rearAxleZ) / 2),
      isFi ? `AKSELIVÄLI C (VÄLYS +${meshClearanceMm.toFixed(2)})` : `CENTER DIST C (MESH +${meshClearanceMm.toFixed(2)})`,
      `C = ${centerDistanceMm.toFixed(2)} mm`,
      0xc084fc,
      '#c084fc'
    );

    // 5D. Rear Tire Diameter Callout (Emerald Green, on Left Rear Tire outer flank)
    const tireMeasureX = -38.5;
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(tireMeasureX, 0, rearAxleZ),
      new THREE.Vector3(tireMeasureX, tireDiaMm, rearAxleZ),
      new THREE.Vector3(0, 0, 1),
      2.5,
      new THREE.Vector3(tireMeasureX - 12, tireDiaMm + 6, rearAxleZ + 8),
      isFi ? 'TAKAKUMIN HALKAISIJA' : 'REAR TIRE DIAMETER',
      `Ø ${tireDiaMm.toFixed(2)} mm`,
      0x34d399,
      '#34d399'
    );

    // 5E. Chassis Ground Clearance (Rungon maavara) Callout + Translucent Clearance Gauge Plane
    const chassisClearanceX = -28.0;
    const chassisClearanceZ = 6.0;
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(chassisClearanceX, 0, chassisClearanceZ),
      new THREE.Vector3(chassisClearanceX, chassisBottomY, chassisClearanceZ),
      new THREE.Vector3(0, 0, 1),
      2.0,
      new THREE.Vector3(chassisClearanceX - 16, chassisBottomY + 4.5, chassisClearanceZ - 8),
      isFi ? 'RUNGON MAAVARA' : 'CHASSIS CLEARANCE',
      `${chassisGroundClearanceMm.toFixed(2)} mm`,
      chassisGroundClearanceMm > 0 ? 0x22d3ee : 0xf87171,
      chassisGroundClearanceMm > 0 ? '#22d3ee' : '#f87171'
    );

    // Visual translucent ground-clearance gauge block under left chassis wing
    if (chassisBottomY > 0.1) {
      const gaugeGeo = new THREE.BoxGeometry(8, chassisBottomY, 14);
      const gaugeMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });
      const gaugeMesh = new THREE.Mesh(gaugeGeo, gaugeMat);
      gaugeMesh.position.set(-23.5, chassisBottomY / 2, 12);
      refs.measurementsGroup.add(gaugeMesh);
    }

    // 5F. Spur Gear Ground Clearance (Rattaan maavara) Callout
    const spurBottomY = Math.max(0, axleCenterY - spurOuterRadius);
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(spurX, 0, rearAxleZ + 3.5),
      new THREE.Vector3(spurX, spurBottomY, rearAxleZ + 3.5),
      new THREE.Vector3(1, 0, 0),
      1.8,
      new THREE.Vector3(spurX, Math.max(3.5, spurBottomY / 2 + 2), rearAxleZ + 19),
      isFi ? 'SPUR-RATTAAN MAAVARA' : 'SPUR GEAR CLEARANCE',
      `${spurGroundClearanceMm >= 0 ? '+' : ''}${spurGroundClearanceMm.toFixed(2)} mm`,
      spurGroundClearanceMm > 0 ? 0xa3e635 : 0xf87171,
      spurGroundClearanceMm > 0 ? '#a3e635' : '#f87171'
    );

    // 5G. Motor Ground Clearance & Chassis Offset Callout
    const motorBottomY = Math.max(0, motorCenterY - motorRadius);
    addDimensionCallout(
      refs.measurementsGroup,
      new THREE.Vector3(-5.2, 0, motorCenterZ),
      new THREE.Vector3(-5.2, motorBottomY, motorCenterZ),
      new THREE.Vector3(1, 0, 0),
      2.0,
      new THREE.Vector3(14, Math.max(4, motorBottomY + 4), motorCenterZ - 4),
      isFi
        ? `MOOTTORIN MAAVARA (RUNKOON ${motorToChassisClearanceMm >= 0 ? '+' : ''}${motorToChassisClearanceMm.toFixed(2)})`
        : `MOTOR CLEARANCE (TO CHASSIS ${motorToChassisClearanceMm >= 0 ? '+' : ''}${motorToChassisClearanceMm.toFixed(2)})`,
      `${motorGroundClearanceMm.toFixed(2)} mm`,
      motorGroundClearanceMm > 0 ? 0xfbbf24 : 0xf87171,
      motorGroundClearanceMm > 0 ? '#fbbf24' : '#f87171'
    );
  }, [
    setup.pinionTeeth,
    setup.gearTeeth,
    setup.tireDiameterMm,
    setup.pitch,
    setup.axleSize,
    setup.pinionShaftDiaMm,
    setup.motorDiameterMm,
    setup.motorOffsetMm,
    setup.gearMeshClearanceMm,
    setup.lockAxleHeight86,
    setup.lockedChassisMm,
    setup.axleHeightLockRef,
    lang,
    axleDiaMm,
    axleHeightLockRef,
    centerDistanceMm,
    lockAxleHeight86,
    lockedChassisMm,
    meshClearanceMm,
    moduleMm,
    motorDiaMm,
    motorOffsetMm,
    pitch,
    pinionOuterDiaMm,
    pinionPitchDiaMm,
    pinionShaftDiaMm,
    spurOuterDiaMm,
    spurPitchDiaMm,
    tireDiaMm,
  ]);

  // Calculate live clearance values for the top status strip
  const axleRadiusMm = axleDiaMm / 2;
  const refOffsetMm = axleHeightLockRef === 'top' ? axleRadiusMm : 0;
  const chassisBottomFromCenterMm = lockAxleHeight86
    ? Math.max(0.1, lockedChassisMm - refOffsetMm)
    : spurOuterDiaMm / 2;
  const chassisGroundClearanceMm = tireDiaMm / 2 - chassisBottomFromCenterMm;
  const spurGroundClearanceMm = (tireDiaMm - spurOuterDiaMm) / 2;
  const clampedOffsetMm = Math.min(centerDistanceMm * 0.95, Math.max(0, motorOffsetMm));
  const motorGroundClearanceMm = tireDiaMm / 2 - (clampedOffsetMm + motorDiaMm / 2);

  const cameraButtons: { id: CameraPresetId; labelFi: string; labelEn: string }[] = [
    { id: 'iso', labelFi: 'Kokokuva 3D', labelEn: 'Isometric 3D' },
    { id: 'stator', labelFi: 'Moottorin staattori (Uusi)', labelEn: 'Motor Stator (New)' },
    { id: 'rotor', labelFi: 'Moottorin roottori', labelEn: 'Motor Rotor' },
    { id: 'drivetrain', labelFi: 'Rattaat & Voimansiirto', labelEn: 'Gears & Drivetrain' },
    { id: 'wheel-inner', labelFi: 'Vanteen sisäreuna & Akseli', labelEn: 'Wheel Inner & Axle' },
    { id: 'wheel-bore', labelFi: 'Takavanne sisältä', labelEn: 'Wheel Bore' },
    { id: 'pcb', labelFi: 'Runko & ESC', labelEn: 'Chassis & ESC' },
    { id: 'clearances', labelFi: 'Maavara & Mitat', labelEn: 'Clearances & Dims' },
    { id: 'guide', labelFi: 'Ohjainkieli', labelEn: 'Guide Flag' },
    { id: 'top', labelFi: 'Ylhäältä', labelEn: 'Top' },
    { id: 'bottom', labelFi: 'Alapuoli', labelEn: 'Bottom' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
      {/* Top Telemetry & Mode Bar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Box className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span>
                {lang === 'fi'
                  ? 'Tarkennettu 3D-mallinnus: Runko 047, Voimansiirto & 3D-Mitat'
                  : 'Refined 3D Model: Chassis 047, Drivetrain & 3D Measurements'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {setup.pinionTeeth}T ({pitch}P · Ø{pinionShaftDiaMm.toFixed(1)}mm) / {setup.gearTeeth}T ·
              OD {pinionOuterDiaMm.toFixed(2)}/{spurOuterDiaMm.toFixed(2)}mm · C={centerDistanceMm.toFixed(2)}mm
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Toggle for 3D Gear & Ground Clearance Measurements */}
          <button
            type="button"
            onClick={() => setShowMeasurements((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border whitespace-nowrap shrink-0 ${
              showMeasurements
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-400'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>
              {lang === 'fi'
                ? showMeasurements
                  ? '3D-Mitat & Maavara: PÄÄLLÄ'
                  : 'Näytä 3D-Mitat & Maavara'
                : showMeasurements
                ? '3D Measurements: ON'
                : 'Show 3D Measurements'}
            </span>
          </button>

          {/* Side-by-side Photo Compare Toggle */}
          <button
            type="button"
            onClick={() => setCompareSplit((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border whitespace-nowrap shrink-0 ${
              compareSplit
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>
              {lang === 'fi'
                ? compareSplit
                  ? 'Sulje kuvavertailu'
                  : 'Vertaa kuviin (14 kuvaa)'
                : compareSplit
                ? 'Close Photo Split'
                : 'Compare Photos (14)'}
            </span>
          </button>

          {/* Toggle Photo Thumbnail Strip */}
          <button
            type="button"
            onClick={() => setShowPhotoDrawer((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border whitespace-nowrap shrink-0 ${
              showPhotoDrawer
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <span>{lang === 'fi' ? 'Valokuvat (14)' : 'Photos (14)'}</span>
            {showPhotoDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main 3D Viewport Area (with optional Side-by-Side Reference Photo Comparison) */}
      <div
        className={`grid grid-cols-1 ${
          compareSplit ? 'lg:grid-cols-12' : ''
        } relative bg-slate-950`}
      >
        {/* WebGL 3D Canvas Container */}
        <div
          className={`${
            compareSplit ? 'lg:col-span-7' : 'col-span-1'
          } relative h-[500px] sm:h-[560px] w-full overflow-hidden select-none`}
        >
          {/* Dedicated empty mount div for Three.js WebGLRenderer */}
          <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Top-Left Live Gear & Ground Clearance Summary HUD (Zero backdrop-filter over WebGL) */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2.5 text-[11px] font-mono text-slate-300 space-y-1 max-w-[310px]">
            <div className="text-amber-400 font-bold flex items-center justify-between gap-2">
              <span>{lang === 'fi' ? 'RATTAAT & MAAVARA (1:1 MM)' : 'GEARS & CLEARANCE (1:1 MM)'}</span>
              <span className="text-emerald-400">
                {showMeasurements ? (lang === 'fi' ? '[3D-MITAT]' : '[3D DIMS]') : ''}
              </span>
            </div>
            <div>
              <span className="text-amber-300 font-semibold">Pinion ({setup.pinionTeeth}T):</span> OD Ø{' '}
              {pinionOuterDiaMm.toFixed(2)} mm · PD {pinionPitchDiaMm.toFixed(2)} mm
            </div>
            <div>
              <span className="text-sky-300 font-semibold">Spur ({setup.gearTeeth}T):</span> OD Ø{' '}
              {spurOuterDiaMm.toFixed(2)} mm · PD {spurPitchDiaMm.toFixed(2)} mm
            </div>
            <div>
              <span className="text-purple-300 font-semibold">
                {lang === 'fi' ? 'Akseliväli C:' : 'Center Dist C:'}
              </span>{' '}
              {centerDistanceMm.toFixed(2)} mm ({lang === 'fi' ? 'välys' : 'mesh'} +{meshClearanceMm.toFixed(2)} mm)
            </div>
            <div className="pt-1 border-t border-slate-800/90 space-y-0.5">
              <div>
                <span className="text-cyan-300 font-semibold">
                  {lang === 'fi' ? 'Rungon maavara:' : 'Chassis clearance:'}
                </span>{' '}
                <span className={chassisGroundClearanceMm > 0 ? 'text-white font-bold' : 'text-red-400 font-bold'}>
                  {chassisGroundClearanceMm.toFixed(2)} mm
                </span>
              </div>
              <div>
                <span className="text-lime-300 font-semibold">
                  {lang === 'fi' ? 'Rattaan maavara:' : 'Spur clearance:'}
                </span>{' '}
                <span className={spurGroundClearanceMm > 0 ? 'text-white font-bold' : 'text-red-400 font-bold'}>
                  {spurGroundClearanceMm >= 0 ? '+' : ''}
                  {spurGroundClearanceMm.toFixed(2)} mm
                </span>
              </div>
              <div>
                <span className="text-amber-300 font-semibold">
                  {lang === 'fi' ? 'Moottorin maavara:' : 'Motor clearance:'}
                </span>{' '}
                <span className={motorGroundClearanceMm > 0 ? 'text-white font-bold' : 'text-red-400 font-bold'}>
                  {motorGroundClearanceMm.toFixed(2)} mm
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Bottom Control Dock (Pinned to bottom center, zero side-panel clutter) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[96%] max-w-[920px] flex flex-col items-center pointer-events-auto">
            {/* Collapse / Expand Handle */}
            <button
              type="button"
              onClick={() => setHudCollapsed((prev) => !prev)}
              className="px-3 py-1 rounded-t-lg bg-slate-900 border border-b-0 border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 shadow-md"
            >
              {hudCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'fi' ? 'Näytä 3D-ohjaimet' : 'Show 3D Controls'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'fi' ? 'Piilota ohjaimet' : 'Hide Controls'}</span>
                </>
              )}
            </button>

            {!hudCollapsed && (
              <div className="w-full bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl space-y-2.5">
                {/* Row 1: Camera Angle Presets matching all Reference Photos */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'fi' ? 'Kuvakulma:' : 'Camera:'}</span>
                    </span>
                    {cameraButtons.map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => triggerCameraPreset(btn.id)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          cameraPreset === btn.id
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {lang === 'fi' ? btn.labelFi : btn.labelEn}
                      </button>
                    ))}
                  </div>

                  {/* Play / Pause & Reset View */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((prev) => !prev)}
                      className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? (lang === 'fi' ? 'Tauko' : 'Pause') : lang === 'fi' ? 'Pyöritä' : 'Spin'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExplodedAmount(0);
                        triggerCameraPreset('iso');
                      }}
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                      title={lang === 'fi' ? 'Palauta oletusnäkymä' : 'Reset 3D View'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Exploded View Slider + 3D Measurements & Layer Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  {/* Exploded view slider */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {lang === 'fi' ? 'Räjäytyskuva:' : 'Exploded:'}{' '}
                        {Math.round(explodedAmount * 100)}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={explodedAmount}
                      onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
                      className="w-full max-w-[160px] h-1.5 bg-slate-700 rounded-lg cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Visibility & Measurement Toggles */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowMeasurements((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                        showMeasurements
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>{lang === 'fi' ? 'Mitat & Maavara 3D' : '3D Measurements'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChassis((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        showChassis
                          ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {lang === 'fi' ? 'Teräsrunko (047)' : 'Steel Chassis'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWiring((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        showWiring
                          ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {lang === 'fi' ? 'ESC & Johdot' : 'ESC & Wiring'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSurfaceStyle((prev) => (prev === 'blue-mat' ? 'studio-dark' : 'blue-mat'))
                      }
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap shrink-0"
                    >
                      {surfaceStyle === 'blue-mat'
                        ? lang === 'fi'
                          ? 'Alusta: Sininen matto'
                          : 'Mat: Blue Carpet'
                        : lang === 'fi'
                        ? 'Alusta: Tumma studio'
                        : 'Mat: Dark Studio'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optional Side-by-Side Reference Photo Inspector */}
        {compareSplit && (
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/95 p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {lang === 'fi' ? 'Valokuvareferenssi (14 kuvaa)' : 'Reference Photograph (14 Photos)'}
                </span>
                <button
                  type="button"
                  onClick={() => triggerCameraPreset(selectedPhoto.preset)}
                  className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  <span>
                    {lang === 'fi' ? 'Kohdista 3D-kamera kuvaan' : 'Sync 3D Camera to Photo'}
                  </span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-4/3">
                <img
                  src={selectedPhoto.src}
                  alt={lang === 'fi' ? selectedPhoto.titleFi : selectedPhoto.titleEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3">
                  <div className="text-xs font-bold text-white">
                    {lang === 'fi' ? selectedPhoto.titleFi : selectedPhoto.titleEn}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {lang === 'fi' ? selectedPhoto.descFi : selectedPhoto.descEn}
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail selector inside comparison panel */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400">
                {lang === 'fi'
                  ? 'Valitse valokuva (4 uutta lähikuvaa ensimmäisenä):'
                  : 'Select reference photo (4 new macro photos first):'}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {REFERENCE_PHOTOS.map((photo) => {
                  const active = selectedPhoto.id === photo.id;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => {
                        setSelectedPhoto(photo);
                        triggerCameraPreset(photo.preset);
                      }}
                      className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                        active
                          ? 'border-amber-500 ring-2 ring-amber-500/30'
                          : 'border-slate-700 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.src}
                        alt={lang === 'fi' ? photo.titleFi : photo.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expandable 14-Photo Reference Filmstrip Drawer */}
      {showPhotoDrawer && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'fi'
                  ? 'Kaikki 14 referenssivalokuvaa – Klikkaa kuvaa kohdistaaksesi 3D-kameran tarkkaan lähikuvakulmaan'
                  : 'All 14 Reference Photographs – Click any photo to align the 3D camera to the matching macro angle'}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {REFERENCE_PHOTOS.map((photo) => {
              const isSelected = selectedPhoto.id === photo.id;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setCompareSplit(true);
                    triggerCameraPreset(photo.preset);
                  }}
                  className={`group text-left rounded-xl overflow-hidden border transition-all bg-slate-900 ${
                    isSelected
                      ? 'border-amber-500 ring-1 ring-amber-500/40'
                      : 'border-slate-800 hover:border-amber-400/60'
                  }`}
                >
                  <div className="aspect-4/3 overflow-hidden bg-slate-950 relative">
                    <img
                      src={photo.src}
                      alt={lang === 'fi' ? photo.titleFi : photo.titleEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-2">
                    <div className="text-[11px] font-bold text-slate-200 truncate">
                      {lang === 'fi' ? photo.titleFi : photo.titleEn}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {lang === 'fi' ? photo.descFi : photo.descEn}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
