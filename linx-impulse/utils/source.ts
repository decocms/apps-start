import { AppContext } from "../mod";

export default function getSource(ctx: AppContext) {
  return !ctx.enableMobileSource || ctx.device === "desktop"
    ? "desktop"
    : "mobile";
}
