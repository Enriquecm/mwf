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
    this.ConfigToRoutes(config.statics, config.routes);

    this.httpsrv = nsHttp.createServer(function (req, res) {
      res.writeHead(200, {"Content-type": "text/html"});
      res.end();
    });
  }

  AddStaticRoute(path: string, virtual?: string)
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

      this.routes[url] = function (req, res) {
        var pathname = nsUrl.parse(req.url).pathname;
        var cache: IFileCache = this.caches[pathname];
        nsUtils.SendFile(res, cache.buffer, cache.mime);
      };
    }
  }

  AddCallbackRoute(route: ICallbackRoute)
  {

  }

  private ConfigToRoutes(statics: IStaticRoute[], routes: ICallbackRoute[])
  {
    if (statics)
    {
      for (var i in statics)
      {
        this.AddStaticRoute(statics[i].path, statics[i].virtual);
      }
    }

    if (routes)
    {
      for (var j in routes)
      {
        this.AddCallbackRoute(routes[j]);
      }
    }
  }

  listen()
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
  [index: string]: (req: nsHttp.ServerRequest, res: nsHttp.ServerResponse) => void;
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