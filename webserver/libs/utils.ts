/// <reference path='../../typings/node/node.d.ts' />

/* Namespaces
 * ----------------------------------------------------- */
import FS   = require("fs");
import PATH = require("path");

/* Environment
 * ----------------------------------------------------- */
declare var global: any;

export function isDebug(): boolean
{
  return typeof global.v8debug == "object";
}

/* MimeType
 * ----------------------------------------------------- */
export enum SupportedExt
{
  JSON, CSS, JS, HTML, ICO, TXT, EOT, WOFF, TTF, SVG, MAP
}

export function getMimeType(ext: SupportedExt): string
{
  switch(ext)
  {
    case SupportedExt.JSON: return "application/json";
    case SupportedExt.CSS:  return "text/css";
    case SupportedExt.JS:   return "application/javascript";
    case SupportedExt.HTML: return "text/html";
    case SupportedExt.ICO:  return "image/x-icon";
    case SupportedExt.TXT:  return "text/plain";
    case SupportedExt.EOT:  return "application/vnd.ms-fontobject";
    case SupportedExt.WOFF: return "application/font-woff";
    case SupportedExt.TTF:  return "application/octet-stream";
    case SupportedExt.SVG:  return "image/svg+xml";
    case SupportedExt.MAP:  return "application/json";
    default:
      throw new Error("MimeType not found for supported extension: " + ext);
  }
}

export function getFileMimeType(filepath: string)
{
  var supportedExt = convertExtToSupportedExt(getExt(filepath));
  return getMimeType(supportedExt);
}

export function convertExtToSupportedExt(extname: string): SupportedExt
{
  switch (extname)
  {
    case "json": return SupportedExt.JSON;
    case "css": return SupportedExt.CSS;
    case "js": return SupportedExt.JS;
    case "html": return SupportedExt.HTML;
    case "ico": return SupportedExt.ICO;
    case "txt": return SupportedExt.TXT;
    case "eot": return SupportedExt.EOT;
    case "woff": return SupportedExt.WOFF;
    case "ttf": return SupportedExt.TTF;
    case "svg": return SupportedExt.SVG;
    case "map": return SupportedExt.MAP;
    default:
      throw new Error('Extension "'+ extname +'" is not supported.');
  }
}

/* File
 * ----------------------------------------------------- */
export function getExt(filepath: string)
{
  var ext = PATH.extname(filepath);
  return ext.substr(1);
}

export function getRecursiveFilepaths(absoluteRootFilepath: string): string[]
{
  var filepaths = [];

  var files = FS.readdirSync(absoluteRootFilepath);
  for (var i in files)
  {
    var file = files[i];
    var absoluteFilepath = PATH.join(absoluteRootFilepath, file);

    if (FS.statSync(absoluteFilepath).isDirectory())
    {
      var subfiles = getRecursiveFilepaths(absoluteFilepath);
      for (var j in subfiles)
      {
        var subfile = subfiles[j];
        filepaths.push(file + "/" + subfile);
      }
    }
    else
    {
      filepaths.push(file);
    }
  }

  return filepaths;
}

/* Interfaces
 * ----------------------------------------------------- */
export interface IKeyValue<T>
{
  [index: string]: T
}