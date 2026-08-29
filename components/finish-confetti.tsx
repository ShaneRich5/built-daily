"use client";

import { useEffect, useRef } from "react";

const COLORS = [
  "#059669",
  "#34d399",
  "#10b981",
  "#f59e0b",
  "#fbbf24",
  "#a1a1aa",
  "#e4e4e7",
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
};

function spawnBurst(
  particles: Particle[],
  originX: number,
  originY: number,
  count: number,
  spread: number,
) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const speed = 6 + Math.random() * 10;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2.5,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.28,
      w: 5 + Math.random() * 5,
      h: 7 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      life: 1,
    });
  }
}

/** Brief canvas burst when a workout is finished. Skips if reduced motion is on. */
export function FinishConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: Particle[] = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    spawnBurst(particles, width * 0.5, height - 48, 42, 1.5);
    spawnBurst(particles, width * 0.18, height * 0.42, 16, 1.1);
    spawnBurst(particles, width * 0.82, height * 0.42, 16, 1.1);

    let frame = 0;
    let raf = 0;
    const gravity = 0.17;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (frame === 14) {
        spawnBurst(particles, width * 0.5, height - 48, 18, 1.2);
      }

      for (const particle of particles) {
        if (particle.life <= 0) continue;
        particle.vy += gravity;
        particle.vx *= 0.994;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.vr;
        particle.life -= 0.0075;
        if (particle.life <= 0) continue;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.fillRect(
          -particle.w / 2,
          -particle.h / 2,
          particle.w,
          particle.h,
        );
        ctx.restore();
      }

      if (frame < 200) {
        raf = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
