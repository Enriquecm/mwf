/// <reference path='../../../typings/node/node.d.ts' />

import nsFs    = require("fs");
import nsHttp  = require("http");
import nsPath  = require("path");

export function GetMimeTypeFromExtname(extname: string)
{
  switch(extname)
  {
    case "json":
      return "application/json";
    case "css":
      return "text/css";
    case "js":
      return "application/javascript";
    case "html":
      return "text/html";
    case "ico":
      return "image/x-icon";
    case "txt":
      return "text/plain";
    case "eot":
      return "application/vnd.ms-fontobject";
    case "woff":
      return "application/font-woff";
    case "ttf":
      return "application/octet-stream";
    case "svg":
      return "image/svg+xml";
    case "map":
      return "application/json";
    default:
      throw new Error("MimeType not found for file type " + extname);
  }
}

export function SendFile(res: nsHttp.ServerResponse, buffer: Buffer, mime: string): void
{
  res.writeHead(200, {"Content-type": mime});
  res.end(buffer);
}

export function GetRecursiveFilepaths(absoluteRootFilepath: string): string[]
{
  var filepaths = [];

  var files = nsFs.readdirSync(absoluteRootFilepath);
  for (var i in files)
  {
    var file = files[i];
    var absoluteFilepath = nsPath.join(absoluteRootFilepath, file);

    if (nsFs.statSync(absoluteFilepath).isDirectory())
    {
      var subfiles = GetRecursiveFilepaths(absoluteFilepath);
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

export function GetExtname(filepath: string)
{
  var ext = nsPath.extname(filepath);
  return ext.substr(1);
}