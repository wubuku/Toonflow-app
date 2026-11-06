import type { Response } from "express";
import { basename, dirname, resolve } from "node:path";
import { withFileAccess } from "@toonflow/file";

export async function sendFile(res: Response, path: string, options: Parameters<Response["sendFile"]>[1] = {}, callback?: (error?: Error) => void) {
  // ACT: Bun 下 Express 的 sendFile 对绝对路径做 root 拼接会返回 404；统一转为 root + 相对路径。
  const absolute = resolve(options.root ?? "", path);
  const root = options.root ?? dirname(absolute);
  const relative = options.root ? path : basename(absolute);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const req = res.req;
  req.once("aborted", cancel);
  res.once("close", cancel);
  if (req.aborted || res.destroyed) cancel();
  let failure: Error | undefined;
  try {
    await withFileAccess([absolute], "read", () => new Promise<void>((done, reject) => {
      if (req.aborted || res.destroyed) return done();
      const finish = () => complete();
      const complete = (error?: Error) => {
        res.off("finish", finish);
        res.off("close", finish);
        if (error) reject(error); else done();
      };
      res.once("finish", finish);
      res.once("close", finish);
      try {
        res.sendFile(relative, { ...options, root }, error => {
          if (error) complete(error);
          else if (res.writableFinished || res.destroyed) complete();
        });
      } catch (error) { complete(error instanceof Error ? error : new Error(String(error))); }
    }), controller.signal);
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error));
  } finally {
    req.off("aborted", cancel);
    res.off("close", cancel);
  }
  if (req.aborted || res.destroyed) return;
  if (callback) callback(failure);
  else if (failure) throw failure;
}
