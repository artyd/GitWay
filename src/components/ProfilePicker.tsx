"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { PROFILES } from "@/lib/profiles";
import { useProfile } from "@/lib/useProfile";

export function ProfilePicker() {
  const router = useRouter();
  const { setProfile } = useProfile();

  function choose(name: string) {
    setProfile(name);
    router.push("/roadmap");
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {PROFILES.map((name, i) => (
        <motion.button
          key={name}
          onClick={() => choose(name)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: "easeOut" }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
          className="clay-card flex flex-col items-center gap-2 px-4 py-5 text-center transition-shadow hover:shadow-clay-hover"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-soft font-display text-base font-bold text-teal">
            {name.charAt(0)}
          </span>
          <span className="text-sm font-semibold">{name}</span>
        </motion.button>
      ))}
    </div>
  );
}
