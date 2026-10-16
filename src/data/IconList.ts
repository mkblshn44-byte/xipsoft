import {
  GoBeaker,
  GoBrowser,
  GoCloud,
  GoCode,
  GoCodespaces,
  GoCommandPalette,
  GoContainer,
  GoDeviceDesktop,
  GoDeviceMobile,
  GoGitBranch,
  GoPackage,
  GoQuestion,
  GoRepo,
  GoRocket,
  GoServer,
  GoTerminal,
  GoWorkflow,
  GoZap,
} from "react-icons/go";
import type { ComponentType } from "react";

export interface IconItem {
  title: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const iconListData: IconItem[] = [
  { title: "HTML",          icon: GoCode },
  { title: "CSS",           icon: GoCommandPalette },
  { title: "JS",            icon: GoZap },
  { title: "NodeJs",        icon: GoServer },
  { title: "Android",       icon: GoDeviceMobile },
  { title: "Flutter",       icon: GoDeviceMobile },
  { title: "Python",        icon: GoTerminal },
  { title: "Laravel",       icon: GoServer },
  { title: "Angular",       icon: GoWorkflow },
  { title: "Docker",        icon: GoContainer },
  { title: "React",         icon: GoCodespaces },
  { title: "Electron",      icon: GoDeviceDesktop },
  { title: "Vue",           icon: GoBrowser },
  { title: "Sass",          icon: GoCommandPalette },
  { title: "Amplify",       icon: GoCloud },
  { title: "Amazon",        icon: GoCloud },
  { title: "Stencil",       icon: GoBeaker },
  { title: "github",        icon: GoRepo },
  { title: "gitlab",        icon: GoGitBranch },
  { title: "Figma",         icon: GoCommandPalette },
  { title: "Octocat",       icon: GoCodespaces },
  { title: "Bootstrap",     icon: GoBrowser },
  { title: "Npm",           icon: GoPackage },
  { title: "Pwa",           icon: GoBrowser },
  { title: "WebComponent",  icon: GoCode },
  { title: "Stackoverflow", icon: GoQuestion },
  { title: "Vercel",        icon: GoRocket },
];
