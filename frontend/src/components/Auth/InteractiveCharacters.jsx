import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * InteractiveCharacters Component
 * 
 * Recreates the beloved cursor-tracking mascots:
 * 1. Purple character (Tall rectangle, back-left)
 * 2. Orange character (Half-dome, front-left)
 * 3. Black character (Tall pillar, middle-right)
 * 4. Yellow character (Arch, front-right)
 * 
 * Features:
 * - Real-time smooth pupil tracking towards mouse/cursor
 * - Subtle 3D body parallax tilt and lean towards cursor
 * - Password shy mode (characters close eyes / look away when typing password)
 * - Natural blinking cycles
 * - Delightful squish & bounce on click
 */
export default function InteractiveCharacters({
  isPasswordFocused = false,
  showPassword = false,
  isSubmitting = false,
  hasError = false,
  className = ""
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Periodic natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 4000 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Global mouse position tracking relative to characters container
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalized coordinates (-1 to 1) from container center
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);

      setMousePos({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy)),
        rawX: e.clientX,
        rawY: e.clientY
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Helper to calculate clamped pupil offset in pixels
  const getPupilOffset = (maxDist = 6) => {
    if (isPasswordFocused && !showPassword) {
      // Look up and away when typing password
      return { x: 0, y: -maxDist };
    }
    return {
      x: mousePos.x * maxDist,
      y: mousePos.y * maxDist
    };
  };

  const pupilOffset = getPupilOffset(7);
  const smallPupilOffset = getPupilOffset(4);

  return (
    <div
      ref={containerRef}
      className={`relative select-none flex items-end justify-center pointer-events-auto ${className}`}
      style={{ height: "320px", width: "360px" }}
    >
      {/* ========================================================
          1. PURPLE CHARACTER (Back Left, Tall Rounded Rectangle)
          ======================================================== */}
      <motion.div
        animate={{
          x: mousePos.x * 12,
          y: isSubmitting ? [0, -10, 0] : mousePos.y * 8,
          rotate: mousePos.x * 4,
          scaleY: isSubmitting ? [1, 1.05, 1] : 1
        }}
        transition={{
          type: "spring",
          stiffness: 120,
          damping: 18,
          scaleY: { repeat: isSubmitting ? Infinity : 0, duration: 0.6 }
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className="absolute z-10 cursor-pointer shadow-2xl"
        style={{
          left: "32px",
          bottom: "0px",
          width: "128px",
          height: "235px",
          backgroundColor: "#6344F5",
          borderRadius: "26px 26px 8px 8px",
          transformOrigin: "bottom center"
        }}
      >
        {/* Subtle highlight sheen */}
        <div className="absolute top-2 left-3 right-3 h-4 bg-white/10 rounded-full blur-[2px]" />

        {/* Eyes Container */}
        <div className="absolute top-16 left-0 right-0 flex justify-center gap-7 px-4">
          {/* Left Eye */}
          <div className="relative w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
            {isBlinking || (isPasswordFocused && !showPassword) ? (
              <div className="w-4 h-[3px] bg-slate-900 rounded-full" />
            ) : (
              <motion.div
                animate={{
                  x: pupilOffset.x,
                  y: pupilOffset.y,
                  scale: hasError ? 0.7 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-3.5 h-3.5 bg-slate-950 rounded-full flex items-center justify-center"
              >
                <div className="w-1 h-1 bg-white rounded-full translate-x-[1px] -translate-y-[1px]" />
              </motion.div>
            )}
          </div>

          {/* Right Eye */}
          <div className="relative w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
            {isBlinking || (isPasswordFocused && !showPassword) ? (
              <div className="w-4 h-[3px] bg-slate-900 rounded-full" />
            ) : (
              <motion.div
                animate={{
                  x: pupilOffset.x,
                  y: pupilOffset.y,
                  scale: hasError ? 0.7 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-3.5 h-3.5 bg-slate-950 rounded-full flex items-center justify-center"
              >
                <div className="w-1 h-1 bg-white rounded-full translate-x-[1px] -translate-y-[1px]" />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          2. BLACK CHARACTER (Middle Right, Tall Dark Pillar)
          ======================================================== */}
      <motion.div
        animate={{
          x: mousePos.x * 10,
          y: isSubmitting ? [0, -8, 0] : mousePos.y * 6,
          rotate: mousePos.x * 3.5,
          scaleY: isSubmitting ? [1, 1.04, 1] : 1
        }}
        transition={{
          type: "spring",
          stiffness: 130,
          damping: 20,
          scaleY: { repeat: isSubmitting ? Infinity : 0, duration: 0.65 }
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className="absolute z-10 cursor-pointer shadow-2xl"
        style={{
          left: "142px",
          bottom: "0px",
          width: "100px",
          height: "190px",
          backgroundColor: "#1F1F23",
          borderRadius: "18px 18px 6px 6px",
          transformOrigin: "bottom center"
        }}
      >
        {/* Subtle highlight */}
        <div className="absolute top-2 left-2 right-2 h-3 bg-white/5 rounded-full" />

        {/* Eyes Container */}
        <div className="absolute top-12 left-0 right-0 flex justify-center gap-5 px-3">
          {/* Left Eye */}
          <div className="relative w-5 h-5 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
            {isBlinking || (isPasswordFocused && !showPassword) ? (
              <div className="w-3 h-[2.5px] bg-slate-800 rounded-full" />
            ) : (
              <motion.div
                animate={{
                  x: pupilOffset.x * 0.9,
                  y: pupilOffset.y * 0.9
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-3 h-3 bg-slate-950 rounded-full flex items-center justify-center"
              >
                <div className="w-1 h-1 bg-white rounded-full translate-x-[0.5px] -translate-y-[0.5px]" />
              </motion.div>
            )}
          </div>

          {/* Right Eye */}
          <div className="relative w-5 h-5 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
            {isBlinking || (isPasswordFocused && !showPassword) ? (
              <div className="w-3 h-[2.5px] bg-slate-800 rounded-full" />
            ) : (
              <motion.div
                animate={{
                  x: pupilOffset.x * 0.9,
                  y: pupilOffset.y * 0.9
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-3 h-3 bg-slate-950 rounded-full flex items-center justify-center"
              >
                <div className="w-1 h-1 bg-white rounded-full translate-x-[0.5px] -translate-y-[0.5px]" />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          3. ORANGE CHARACTER (Front Left, Friendly Half-Dome)
          ======================================================== */}
      <motion.div
        animate={{
          x: mousePos.x * 16,
          y: isSubmitting ? [0, -12, 0] : mousePos.y * 10,
          rotate: mousePos.x * 6,
          scaleY: isSubmitting ? [1, 1.06, 1] : 1
        }}
        transition={{
          type: "spring",
          stiffness: 140,
          damping: 16,
          scaleY: { repeat: isSubmitting ? Infinity : 0, duration: 0.55 }
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        className="absolute z-20 cursor-pointer shadow-2xl"
        style={{
          left: "8px",
          bottom: "0px",
          width: "160px",
          height: "128px",
          backgroundColor: "#FF7448",
          borderRadius: "90px 90px 8px 8px",
          transformOrigin: "bottom center"
        }}
      >
        {/* Highlight sheen */}
        <div className="absolute top-3 left-6 right-6 h-4 bg-white/15 rounded-full blur-[2px]" />

        {/* Eyes (Dark minimalist dot eyes) */}
        <div className="absolute top-14 left-0 right-0 flex justify-center gap-7">
          {/* Left Eye */}
          <div className="w-4 h-4 flex items-center justify-center">
            {isBlinking || (isPasswordFocused && !showPassword) ? (
              <div className="w-3 h-[3px] bg-slate-900 rounded-full" />
            ) : (
              <motion.div
                animate={{
                  x: smallPupilOffset.x,
                  y: smallPupilOffset.y
                }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="w-3 h-3 bg-slate-900 rounded-full shadow-sm"
              />
            )}
          </div>

          {/* Right Eye */}
          <div className="w-4 h-4 flex items-center justify-center">
            {isBlinking || (isPasswordFocused && !showPassword) ? (
              <div className="w-3 h-[3px] bg-slate-900 rounded-full" />
            ) : (
              <motion.div
                animate={{
                  x: smallPupilOffset.x,
                  y: smallPupilOffset.y
                }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="w-3 h-3 bg-slate-900 rounded-full shadow-sm"
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          4. YELLOW CHARACTER (Front Right, Tall Pill Arch with Mouth)
          ======================================================== */}
      <motion.div
        animate={{
          x: mousePos.x * 14,
          y: isSubmitting ? [0, -10, 0] : mousePos.y * 9,
          rotate: mousePos.x * 5,
          scaleY: isSubmitting ? [1, 1.05, 1] : 1
        }}
        transition={{
          type: "spring",
          stiffness: 135,
          damping: 17,
          scaleY: { repeat: isSubmitting ? Infinity : 0, duration: 0.58 }
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        className="absolute z-20 cursor-pointer shadow-2xl"
        style={{
          left: "192px",
          bottom: "0px",
          width: "115px",
          height: "148px",
          backgroundColor: "#ECC346",
          borderRadius: "58px 58px 8px 8px",
          transformOrigin: "bottom center"
        }}
      >
        {/* Highlight sheen */}
        <div className="absolute top-2 left-4 right-4 h-3 bg-white/20 rounded-full blur-[1px]" />

        {/* Face Elements */}
        <div className="absolute top-10 left-0 right-0 flex flex-col items-center">
          {/* Eyes */}
          <div className="flex justify-center gap-6 mb-3">
            {/* Left Eye */}
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              {isBlinking || (isPasswordFocused && !showPassword) ? (
                <div className="w-3 h-[2.5px] bg-slate-900 rounded-full" />
              ) : (
                <motion.div
                  animate={{
                    x: smallPupilOffset.x,
                    y: smallPupilOffset.y
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="w-2.5 h-2.5 bg-slate-900 rounded-full"
                />
              )}
            </div>

            {/* Right Eye */}
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              {isBlinking || (isPasswordFocused && !showPassword) ? (
                <div className="w-3 h-[2.5px] bg-slate-900 rounded-full" />
              ) : (
                <motion.div
                  animate={{
                    x: smallPupilOffset.x,
                    y: smallPupilOffset.y
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  className="w-2.5 h-2.5 bg-slate-900 rounded-full"
                />
              )}
            </div>
          </div>

          {/* Neutral Horizontal Line Mouth `—` */}
          <motion.div
            animate={{
              width: hasError ? 24 : isSubmitting ? 20 : 34,
              scaleY: isSubmitting ? [1, 2, 1] : 1
            }}
            className="h-[3px] bg-slate-900 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
