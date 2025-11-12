import { Game } from "./engine/Game";
import "./styles/global.css";

declare global {
  interface Window {
    game: Game;
  }
}

function bootstrap(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App root not found");
  }

  const canvas = document.createElement("canvas");
  app.append(canvas);

  const game = new Game({ canvas, width: window.innerWidth, height: window.innerHeight });
  window.game = game;
  game.start();
}

window.addEventListener("load", bootstrap);
