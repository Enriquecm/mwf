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
  private defaultResponseMimeType: string = getMimeType(SupportedExt.JSON);

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

  addCallbackRoute(url: string, cb: IHttpConnection): void
  {
    this.routes[url] = cb;
  }

  addAppRoute(url: string, params: IRequestParam[], cb: IApp, routeMimeType?: string)
  {
    this.routes[url] = (req, res) =>
    {
      var handledParams: IAppParams = HandleAppParams(params);
      var mimeType = routeMimeType ? routeMimeType : this.defaultResponseMimeType;

      cb(handledParams, (status, data) =>
      {
        var httpStatus = GetHttpStatusFromResponseStatus(status);
        send(httpStatus, res, data, mimeType);
      });
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

export enum ParamFormat
{
  JSON
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
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Error = 500,
}

/* Interfaces
 * ----------------------------------------------------- */
export interface IHttpConnection
{
  (req: HTTP.IncomingMessage, res: HTTP.ServerResponse): void;
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
  [index: string]: {
    type: RouteType;
    cb: IHttpConnection;
  };
}

export interface IApp
{
  (params: IAppParams, cb: IAppCallback): void;
}

export interface IAppParams
{
  [index: string]: any;
}

export interface IAppCallback
{
  (status: ResponseStatus, data: string): void;
}

/**
 * Defaults:
 *   type     = ParamType.String
 *   required = true
 *   source   = ParamSource.Playload
 *   format   = ParamFormat.JSON
 */
export interface IRequestParam
{
  name: string;
  type?: ParamType;
  required?: boolean;
  source?: ParamSource;
  format?: ParamFormat;
}

/* HTTP Utils
 * ----------------------------------------------------- */
function GetHttpStatusFromResponseStatus(status: ResponseStatus): HttpStatus
{
  switch(status)
  {
    case ResponseStatus.Success:      return HttpStatus.OK;
    case ResponseStatus.Unauthorized: return HttpStatus.Unauthorized;
    case ResponseStatus.Error:        return HttpStatus.Error;
    default:
      console.error("Invalid ResponseStatus: " + status);
      return HttpStatus.Error;
  }
}

function HandleAppParams(params: IRequestParam[]): IAppParams
{
  return {name: "..."};
}

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