/// <reference path='../../../typings/node/node.d.ts' />

import nsFs    = require("fs");
import nsHttp  = require("http");
import nsPath  = require("path");
import nsUrl   = require("url");
import nsUtils = require("./utils");

/**
 * @todo In the class constructor, config.index is possibly causing cache duplication
 */
export class WebServer
{
  httpsrv: nsHttp.Server;
  root: string;
  index: string;
  port: number;
  defaultParamSource: ParamSource;
  routes: IRoute[] = [];
  caches: IFileCacheCollection[] = [];

  /**
   * @param config
   */
  constructor(config: WebServerConfig)
  {
    this.root  = config.root;
    this.index = config.index;
    this.port  = config.port;
    this.defaultParamSource = config.defaultParamSource;
    this.configToRoutes(config.statics, config.routes);
    this.addStaticRoute(config.index, "/");

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
    var rootFilepath = nsPath.join(this.root, path);
    var stat = nsFs.statSync(rootFilepath);

    if (stat.isFile())
    {
      var url = virtual ? virtual : path;
      this.addCachedRoute(url, rootFilepath);
    }
    else if(stat.isDirectory())
    {
      var urls = nsUtils.GetRecursiveFilepaths(rootFilepath);
      for (var i in urls)
      {
        var url = (virtual ? virtual : path) + urls[i];
        var filepath = nsPath.join(this.root, path + urls[i]);
        this.addCachedRoute(url, filepath);
      }
    }
    else
    {
      throw new Error("Path \"" + path + "\" is not a file nor folder.");
    }
  }

  private addCachedRoute(url: string, filepath: string)
  {
    this.caches[url] = {
      buffer: nsFs.readFileSync(filepath),
      mime: nsUtils.GetMimeTypeFromExtname(nsUtils.GetExtname(filepath))
    };

    this.routes[url] = (req, res) => {
      var pathname = nsUrl.parse(req.url).pathname;
      var cache: IFileCache = this.caches[pathname];
      nsUtils.SendFile(res, cache.buffer, cache.mime);
    };
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

export enum ParamSource
{
  URL, PLAYLOAD, COOKIE
}

export enum ParamType
{
  String, Number, Boolean, Object
}

export class WebServerConfig
{
  port: number;
  root: string;
  index: string;
  favicon: string;
  defaultParamSource: ParamSource;
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

interface ICallbackRouteParam
{
  name: string;
  type: ParamType;
  required?: boolean;
  source: ParamSource;
}