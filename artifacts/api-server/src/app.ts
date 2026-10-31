import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: "This request could not be read. Your local look is unchanged." });
});

export default app;
