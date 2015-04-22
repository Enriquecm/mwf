/// <reference path='../../typings/node/node.d.ts' />

/* Namespaces
 * ----------------------------------------------------- */
import FS    = require("fs");
import HTTP  = require("http");
import PATH  = require("path");
import URL   = require("url");
import UTILS = require("./utils");

/* Facilities
 * ----------------------------------------------------- */
var getMimeType  = UTILS.getMimeType;
var SupportedExt = UTILS.SupportedExt;

/**
 * WebServer
 * ----------------------------------------------------- */
export class WebServer
{
  private httpsrv: HTTP.Server;
  private root: string;
  private port: number;
  private routes: IRoute[] = [];
  private caches: IFileCacheCollection[] = [];

  constructor()
  {
    this.httpsrv = HTTP.createServer((req, res) => {
      this.dispatch(req, res);
    });
  }

  dispatch(req: HTTP.IncomingMessage, res: HTTP.ServerResponse): void
  {
    var pathname = getUrlPathname(req);

    if (this.routes.hasOwnProperty(pathname))
    {
      this.routes[pathname](req, res);
    }
    else
    {
      send(HttpStatus.NotFound, res, "Not found", getMimeType(SupportedExt.TXT));
    }
  }

  setFavicon(path: string): void
  {
    this.addStaticRoute(path, "/");
  }

  setPort(port: number): void
  {
    this.port = port;
  }

  setRoot(root: string): void
  {
    this.root = root;
  }

  addStaticRoute(path: string, virtual?: string): void
  {
    var rootFilepath = PATH.join(this.root, path);
    var stat = FS.statSync(rootFilepath);

    if (stat.isFile())
    {
      var url = virtual ? virtual : path;
      this.addCachedRoute(url, rootFilepath);
    }
    else if(stat.isDirectory())
    {
      var urls = UTILS.getRecursiveFilepaths(rootFilepath);
      for (var i in urls)
      {
        var url = (virtual ? virtual : path) + urls[i];
        var filepath = PATH.join(this.root, path + urls[i]);
        this.addCachedRoute(url, filepath);
      }
    }
    else
    {
      throw new Error("Path \"" + path + "\" is not a file nor folder.");
    }
  }

  addCallbackRoute(
    url: string,
    cb: (req: HTTP.IncomingMessage, res: HTTP.ServerResponse) => void): void
  {
    this.routes[url] = cb;
  }

  addAppRoute(
    url: string,
    params: IRequestParam[],
    cb: (params: IAppParam[], cb: IAppCallback) => void)
  {
    this.routes[url] = (req, res) => {
      console.log("...");
    }
  }

  listen(): void
  {
    this.httpsrv.listen(this.port);
  }

  private addCachedRoute(url: string, filepath: string)
  {
    this.caches[url] = {
      buffer: FS.readFileSync(filepath),
      mime: UTILS.getFileMimeType(filepath)
    };

    this.routes[url] = (req, res) => {
      var pathname = getUrlPathname(req);
      var cache: IFileCache = this.caches[pathname];
      sendFile(res, cache.buffer, cache.mime);
    };
  }
}

/* Enums
 * ----------------------------------------------------- */
export enum ParamSource
{
  URL, Playload, Cookie
}

export enum ParamType
{
  String, Number, Boolean, Object
}

enum RouteType
{
  Static, Callback
}

export enum ResponseStatus
{
  Success,
  Error,
  Unauthorized
}

export enum HttpStatus
{
  OK = 200,
  NotFound = 404,
  Error = 500,
}

/* Interfaces
 * ----------------------------------------------------- */
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
  [index: string]: {
    type: RouteType;
    cb: (req: HTTP.IncomingMessage, res: HTTP.ServerResponse) => void;
  };
}

export interface IAppParam
{
  [index: string]: any;
}

export interface IAppCallback
{
  mime: string;
  status: ResponseStatus;
  data: string;
}

export interface IRequestParam
{
  name: string;
  type: ParamType;
  required?: boolean;
  source: ParamSource;
}

/* HTTP Utils
 * ----------------------------------------------------- */
export function getUrlPathname(req: HTTP.IncomingMessage)
{
  return URL.parse(req.url).pathname;
}

export function send(
  status: HttpStatus,
  res: HTTP.ServerResponse,
  data: string,
  mime: string): void
{
  res.writeHead(status, {"Content-type": mime});
  res.end(data);
}

export function sendFile(
  res: HTTP.ServerResponse,
  buffer: Buffer,
  mime: string): void
{
  send(HttpStatus.OK, res, buffer.toString(), mime);
}

export function sendJSON(res: HTTP.ServerResponse, json: Object): void
{
  send(
    HttpStatus.OK,
    res,
    JSON.stringify(json),
    getMimeType(SupportedExt.JSON));
}