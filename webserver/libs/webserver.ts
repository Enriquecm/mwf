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
      handleAppParams(req, params, (err, params) =>
      {
        var mimeType = routeMimeType ? routeMimeType : this.defaultResponseMimeType;

        if (err)
        {
          send(HttpStatus.Error, res, UTILS.isDebug() ? err : "", mimeType);
          return;
        }

        cb(params, (status, data) =>
        {
          var httpStatus = getHttpStatusFromResponseStatus(status);
          send(httpStatus, res, data, mimeType);
        });
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
  Cookies, Playload, QueryString
}

export enum ParamType
{
  String, Number, Boolean
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
 */
export interface IRequestParam
{
  name: string;
  type?: ParamType;
  required?: boolean;
  source?: ParamSource;
}

interface ICookies
{
  [index: string]: string
}

interface IQueryString
{
  [index: string]: string
}

interface IPlayload
{
  [index: string]: string
}

/* HTTP Utils
 * ----------------------------------------------------- */
function getHttpStatusFromResponseStatus(status: ResponseStatus): HttpStatus
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

/**
 *
 * @param req
 * @param params
 * @param cb
 * @todo handle required and report if required do not exist
 * @todo maybe a non required param causes a bug when it do not exist
 */
function handleAppParams(
  req: HTTP.IncomingMessage,
  params: IRequestParam[],
  cb: (err: string, appParams: IAppParams) => void): void
{
  getHttpRequestParams(req, (err, cookies, queryString, playload) =>
  {
    if (err)
    {
      cb(err, null);
      return;
    }

    var result: IAppParams = {};

    for (var i in params)
    {
      var param  = params[i];
      var value  = null;
      var source = param.source ? param.source : ParamSource.Playload;
      var pType  = param.type   ? param.type   : ParamType.String;

      switch(source)
      {
        case ParamSource.Playload:
          value = playload[param.name];
          break;
        case ParamSource.Cookies:
          value = cookies[param.name];
          break;
        case ParamSource.QueryString:
          value = queryString[param.name];
          break;
        default:
          cb("Invalid param source " + param.source, null);
          return;
      }

      switch(pType)
      {
        case ParamType.Boolean: value = Boolean(value); break;
        case ParamType.Number:  value = Number(value);  break;
        case ParamType.String:  value = String(value);  break;
        default:
          cb("Invalid param type " + param.type, null);
          return;
      }

      result[param.name] = value;
    }
    cb(null, result);
  });
}

/**
 * Request params from Cookies, Playload and QueryString
 */
function getHttpRequestParams(
  req: HTTP.IncomingMessage,
  cb: (
    err: string,
    cookies: ICookies,
    queryString: IQueryString,
    playload: IPlayload) => void
): void
{
  getHttpResquetPlayload(req, (err, playload) =>
  {
    if (err)
    {
      cb(err, null, null, null);
      return;
    }

    var cookies     = getHttpRequestCookies(req);
    var queryString = getHttpRequestQueryString(req);

    cb(null, cookies, queryString, playload);
  });
}

function getHttpResquetPlayload(
  req: HTTP.IncomingMessage,
  cb: (err: string, playload: IPlayload) => void)
{
  var data: string = "";

  req.on("data", function(chunk)
  {
    data += chunk;
  });

  req.on("end", function()
  {
    try
    {
      var keyValue: UTILS.IKeyValue<any> = {};
      keyValue = getKeyValueFromStringAccordingToMimeType(req.headers["content-type"], data);
      cb(null, keyValue);
    }
    catch(err)
    {
      cb(err.message, {});
    }
  });

  req.on("error", function(err)
  {
    cb(err.message, {});
  });
}

function getKeyValueFromStringAccordingToMimeType(mime: string, data: string): UTILS.IKeyValue<any>
{
  if (mime == getMimeType(SupportedExt.JSON))
  {
    return JSON.parse(data);
  }
  else
  {
    var err = "Unable to convert data to key-value because the mime " + mime +  " is not supported.";
    throw new Error(err);
  }
}

function getHttpRequestCookies(req: HTTP.IncomingMessage): ICookies
{
  if (!req.headers.hasOwnProperty("cookie"))
  {
    return {};
  }

  var cookies: ICookies = {};
  var parts = req.headers.cookie.split(";");

  for (var i in parts)
  {
    var pair = parts[i].trim().split("=");
    cookies[pair[0]] = decodeURIComponent(pair[1]);
  }

  return cookies;
}

function getHttpRequestQueryString(req: HTTP.IncomingMessage): IQueryString
{
  var urlParts = URL.parse(req.url, true);
  return urlParts.query;
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