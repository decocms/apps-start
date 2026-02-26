import { type createHttpClient } from "../../utils/http";
import { type AppContext } from "../mod";
import { type ChaordicAPI } from "../utils/chaordic";
import { type LinxAPI } from "../utils/client";
import { type EventsAPI } from "../utils/events";

export type Config = {
  api: ReturnType<typeof createHttpClient<LinxAPI>>;
  eventsApi: ReturnType<typeof createHttpClient<EventsAPI>>;
  chaordicApi: ReturnType<typeof createHttpClient<ChaordicAPI>>;
};

const loader = (_props: unknown, _req: Request, ctx: AppContext): Config => ({
  api: ctx.api,
  eventsApi: ctx.eventsApi,
  chaordicApi: ctx.chaordicApi,
});

export default loader;
