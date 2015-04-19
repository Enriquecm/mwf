/// <reference path='../../../typings/node/node.d.ts' />

import nsFs    = require("fs");
import nsHttp  = require("http");
import nsPath  = require("path");
import nsUrl   = require("url");
import nsUtils = require("./utils");

export class WebServer
{
  httpsrv: nsHttp.Server;
  root: string;
  index: string;
  port: number;
  routes: IRoute[] = [];
  caches: IFileCacheCollection[] = [];

  constructor(config: WebServerConfig)
  {
    this.root  = config.root;
    this.index = config.index;
    this.port  = config.port;
    this.configToRoutes(config.statics, config.routes);

    this.httpsrv = nsHttp.createServer((req, res) => {
      this.dispatch(req, res);
    });
  }

  dispatch(req: nsHttp.IncomingMessage, res: nsHttp.ServerResponse): void
  {
    var pathname = nsUrl.parse(req.url).pathname;
    if (this.routes.hasOwnProperty(pathname))
    {
      this.routes[pathname](req, res);
    }
    else
    {
      res.writeHead(404, {"Content-type": "text/html"});
      res.end("Not found");
    }
  }

  addStaticRoute(path: string, virtual?: string): void
  {
    var absoluteRootFilepath = nsPath.join(this.root, path);
    var urls = nsUtils.GetRecursiveFilepaths(absoluteRootFilepath);

    for (var i in urls)
    {
      var url          = (virtual ? virtual : path) + urls[i];
      var relativePath = path + urls[i];
      var absolutePath = nsPath.join(this.root, relativePath);

      this.caches[url] = {
        buffer: nsFs.readFileSync(absolutePath),
        mime: nsUtils.GetMimeTypeFromExtname(nsUtils.GetExtname(absolutePath))
      };

      this.routes[url] = (req, res) => {
        var pathname = nsUrl.parse(req.url).pathname;
        var cache: IFileCache = this.caches[pathname];
        nsUtils.SendFile(res, cache.buffer, cache.mime);
      };
    }
  }

  addCallbackRoute(route: ICallbackRoute): void
  {

  }

  private configToRoutes(statics: IStaticRoute[], routes: ICallbackRoute[]): void
  {
    if (statics)
    {
      for (var i in statics)
      {
        this.addStaticRoute(statics[i].path, statics[i].virtual);
      }
    }

    if (routes)
    {
      for (var j in routes)
      {
        this.addCallbackRoute(routes[j]);
      }
    }
  }

  listen(): void
  {
    this.httpsrv.listen(this.port);
  }
}

export class WebServerConfig
{
  port: number;
  root: string;
  index: string;
  favicon: string;
  statics: IStaticRoute[];
  routes: ICallbackRoute[];
}

interface IFileCache
{
  buffer: Buffer;
  mime: string;
}

interface IFileCacheCollection
{
  [index: string]: IFileCache;
}

interface IRoute
{
  [index: string]: (req: nsHttp.IncomingMessage, res: nsHttp.ServerResponse) => void;
}

interface IStaticRoute
{
  path: string;
  virtual?: string
}

interface ICallbackRoute
{
  url: string;
}