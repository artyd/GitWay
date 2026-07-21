import {
  faCodeBranch,
  faTerminal,
  faDownload,
  faShieldHalved,
  faRobot,
  faWandMagicSparkles,
  faFlagCheckered,
  faListCheck,
  faCodePullRequest,
  faCircleCheck,
  faLock,
  faPlay,
  faArrowRight,
  faCircleUser,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub, faGitAlt } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export const iconMap: Record<string, IconDefinition> = {
  "git-alt": faGitAlt,
  download: faDownload,
  terminal: faTerminal,
  "code-branch": faCodeBranch,
  github: faGithub,
  "list-check": faListCheck,
  "code-pull-request": faCodePullRequest,
  "shield-halved": faShieldHalved,
  robot: faRobot,
  "wand-magic-sparkles": faWandMagicSparkles,
  "flag-checkered": faFlagCheckered,
  "circle-check": faCircleCheck,
  lock: faLock,
  play: faPlay,
  "arrow-right": faArrowRight,
  "circle-user": faCircleUser,
};

export function getIcon(name: string): IconDefinition {
  return iconMap[name] ?? faCircleCheck;
}
