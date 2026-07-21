"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { sx } from "@/lib/sx";

/** Іконка Font Awesome за CSS-класом (напр. "fa-solid fa-code-branch"). */
export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  return <i className={name} style={style} aria-hidden="true" />;
}

type ClayProps = {
  as?: "button" | "div";
  /** базовий стиль у вигляді CSS-рядка (як у прототипі) */
  base: string;
  /** додатковий стиль при наведенні (style-hover) */
  hover?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * Універсальний claymorphism-елемент, що приймає інлайн-стилі рядком і
 * підтримує hover-стан (як атрибут style-hover у прототипі).
 */
export function Clay({
  as = "button",
  base,
  hover,
  onClick,
  title,
  disabled,
  children,
  className,
}: ClayProps) {
  const [h, setH] = useState(false);
  const style = sx(hover && h && !disabled ? `${base};${hover}` : base);
  const common = {
    style,
    title,
    className,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
  };
  if (as === "div") {
    return (
      <div {...common} onClick={onClick}>
        {children}
      </div>
    );
  }
  return (
    <button {...common} onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  );
}
