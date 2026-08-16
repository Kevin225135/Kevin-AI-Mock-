"use client";

import { motion, useInView, useMotionValue, useSpring, type Variants } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/* ── Easing curves (from impeccable motion-design.md) ── */
export const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/* ── Stagger container + item variants ── */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_OUT_QUART }
  }
};

/* ── Page transition ── */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: EASE_OUT_QUART }}
    >
      {children}
    </motion.div>
  );
}

/* ── Fade in on scroll ── */
export function FadeIn({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: EASE_OUT_QUART, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger container for lists ── */
export function StaggerGroup({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger item ── */
export function StaggerItem({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Animated number (count up) ── */
export function AnimatedNumber({
  value,
  duration = 0.8,
  className
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toString();
      }
    });
  }, [spring]);

  return <span ref={ref} className={className}>0</span>;
}

/* ── Animate height expand/collapse ── */
export function AnimatePresenceWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
